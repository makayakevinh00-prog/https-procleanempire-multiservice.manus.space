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
const notInstalled = (m: string) => /jarvis_|does not exist|n'existe pas|schema cache|Could not find/i.test(m);

/** Lance un passage d'un agent « actif ». Il observe et propose ; rien n'est envoyé ni modifié dans le CRM. */
export async function runAgentAction(agent: string, _fd?: FormData) {
  await requireOwner();
  const spec = (AGENT_BY_KEY as Record<string, { status: string; name: string }>)[agent];
  if (!spec) flash(BACK, "error", "Agent inconnu.");
  if (spec.status !== "actif" || agent !== "finance") flash(BACK, "error", `${spec.name} n'est pas encore construit.`);

  const sb = createClient();
  let out: any, failure: string | null = null;
  try {
    const result = prepare(analyseFinance(await loadFinanceSnapshot(sb)));
    const { data, error } = await sb.rpc("jarvis_record_run", { p_agent: agent, p_trigger: "manuel", p_result: result });
    if (error) failure = notInstalled(error.message) ? "Le socle JARVIS n'est pas installé sur cette base (migration 0021 non appliquée)." : dbMessage(error);
    else out = data;
  } catch (e) {
    failure = (e as Error).message;
  }
  if (failure) flash(BACK, "error", failure);
  revalidatePath(BACK);
  flash(BACK, "ok", `Passage terminé : ${out.alerts_new} alerte(s) nouvelle(s), ${out.alerts_resolved} résolue(s), ${out.actions_new} proposition(s) à valider, ${out.tasks_new} tâche(s), ${out.events_new} demande(s) à d'autres agents.`);
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
