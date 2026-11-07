"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, flash, str } from "@/lib/data";
import { AGENT_BY_KEY } from "@/lib/jarvis/registry";
import { prepare } from "@/lib/jarvis/core";
import { analyseFinance } from "@/lib/jarvis/agents/finance";
import { loadFinanceSnapshot } from "@/lib/jarvis/load-finance";

const BACK = "/jarvis";
const OPEN = "/jarvis/openspace";
const notInstalled = (m: string) => /jarvis_|does not exist|n'existe pas|schema cache|Could not find/i.test(m);

type RunOutcome = { out?: any; failure?: string };

/** Un passage d'agent : lecture des données, analyse, enregistrement par JARVIS Core. N'écrit que dans les tables JARVIS. */
async function executeRun(agent: string): Promise<RunOutcome> {
  const sb = createClient();
  try {
    const result = prepare(analyseFinance(await loadFinanceSnapshot(sb)));
    const { data, error } = await sb.rpc("jarvis_record_run", { p_agent: agent, p_trigger: "manuel", p_result: result });
    if (error) return { failure: notInstalled(error.message) ? "Le socle JARVIS n'est pas installé sur cette base (migration 0021 non appliquée)." : dbMessage(error) };
    return { out: data };
  } catch (e) {
    return { failure: (e as Error).message };
  }
}
const summary = (o: any) => `${o.alerts_new} alerte(s) nouvelle(s), ${o.alerts_resolved} résolue(s), ${o.actions_new} proposition(s) à valider, ${o.tasks_new} tâche(s), ${o.events_new} demande(s) à d'autres agents`;

/** Lance un passage d'un agent « actif ». Il observe et propose ; rien n'est envoyé ni modifié dans le CRM. */
export async function runAgentAction(agent: string, _fd?: FormData) {
  await requireOwner();
  const spec = (AGENT_BY_KEY as Record<string, { status: string; name: string }>)[agent];
  if (!spec) flash(BACK, "error", "Agent inconnu.");
  if (spec.status !== "actif" || agent !== "finance") flash(BACK, "error", `${spec.name} n'est pas encore construit.`);
  const r = await executeRun(agent);
  if (r.failure) flash(BACK, "error", r.failure);
  revalidatePath(BACK);
  flash(BACK, "ok", `Passage terminé : ${summary(r.out)}.`);
}

/**
 * Instruction du patron à un agent (open space). Deux formes :
 *  - commande « run » : exécutée tout de suite si l'agent est construit, refusée sinon ;
 *  - texte libre : CONSERVÉ tel quel, en attente. Aucun agent n'interprète encore le langage libre (aucune IA connectée) : on ne le prétend pas.
 * Dans tous les cas, l'instruction est tracée, et elle ne peut jamais modifier une facture, un règlement ou un contrat.
 */
export async function instructAgentAction(agent: string, fd: FormData) {
  await requireOwner();
  const back = `${OPEN}?agent=${encodeURIComponent(agent)}`;
  const spec = (AGENT_BY_KEY as Record<string, { status: string; name: string }>)[agent];
  if (!spec) flash(OPEN, "error", "Agent inconnu.");
  const sb = createClient();
  const command = str(fd, "command");
  const body = (str(fd, "body") ?? "").trim();

  if (command === "run") {
    const built = spec.status === "actif" && agent === "finance";
    const { data: row, error } = await sb.from("jarvis_instructions").insert({ agent_key: agent, kind: "commande", command: "run", status: "en_attente" }).select("id").single();
    if (error) flash(back, "error", notInstalled(error.message) ? "Le socle JARVIS n'est pas installé sur cette base (migration 0021 non appliquée)." : dbMessage(error));
    if (!built) {
      await sb.from("jarvis_instructions").update({ status: "refusee", result: `${spec.name} n'est pas encore construit : il ne peut pas exécuter de passage.`, handled_at: new Date().toISOString() }).eq("id", row!.id);
      flash(back, "error", `${spec.name} n'est pas encore construit.`);
    }
    const r = await executeRun(agent);
    await sb.from("jarvis_instructions").update(r.failure ? { status: "refusee", result: r.failure, handled_at: new Date().toISOString() } : { status: "executee", result: `Passage terminé : ${summary(r.out)}.`, handled_at: new Date().toISOString() }).eq("id", row!.id);
    if (r.failure) flash(back, "error", r.failure);
    revalidatePath(OPEN);
    flash(back, "ok", `Passage terminé : ${summary(r.out)}.`);
  }

  if (body.length < 3 || body.length > 500) flash(back, "error", "L'instruction doit faire entre 3 et 500 caractères.");
  const { error } = await sb.from("jarvis_instructions").insert({
    agent_key: agent, kind: "libre", body, status: "en_attente",
    result: "Enregistrée telle quelle. Aucun agent n'interprète encore le texte libre (aucune IA connectée) : elle sera lue dès que l'agent en aura la capacité, avec votre accord pour la clé."
  });
  if (error) flash(back, "error", notInstalled(error.message) ? "Le socle JARVIS n'est pas installé sur cette base (migration 0021 non appliquée)." : dbMessage(error));
  revalidatePath(OPEN);
  flash(back, "ok", "Instruction enregistrée. Elle reste en attente : l'agent ne comprend pas encore le texte libre.");
}

/** Valide ou refuse une proposition. Valider crée une tâche pour le patron : aucun envoi, aucune modification automatique. */
export async function decideActionAction(id: string, decision: "approve" | "reject", fd: FormData) {
  await requireOwner();
  const { error } = await createClient().rpc("jarvis_decide_action", { p_id: id, p_decision: decision, p_note: str(fd, "note") });
  if (error) flash(BACK, "error", dbMessage(error));
  revalidatePath(BACK);
  flash(BACK, "ok", decision === "approve" ? "Validé : une tâche a été ajoutée à votre liste. Rien n'a été envoyé." : "Proposition refusée.");
}

export async function setAlertStatusAction(id: string, status: "acknowledged" | "open", _fd?: FormData) {
  await requireOwner();
  const { error } = await createClient().from("jarvis_alerts").update({ status }).eq("id", id).neq("status", "resolved");
  if (error) flash(BACK, "error", dbMessage(error));
  revalidatePath(BACK);
  flash(BACK, "ok", status === "acknowledged" ? "Alerte notée comme vue." : "Alerte rouverte.");
}

export async function completeTaskAction(id: string, _fd?: FormData) {
  await requireOwner();
  const { error } = await createClient().from("jarvis_tasks").update({ status: "done", done_at: new Date().toISOString() }).eq("id", id).eq("status", "todo");
  if (error) flash(BACK, "error", dbMessage(error));
  revalidatePath(BACK);
  flash(BACK, "ok", "Tâche terminée.");
}
