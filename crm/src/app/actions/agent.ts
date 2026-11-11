"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { isLang, isTheme } from "@/lib/field-ui";

/** Retour sur la page de la mission avec un message (l'agent reste là où il travaillait). */
const go = (token: string, kind: "ok" | "error", msg: string, missionId?: string): never => redirect(`/agent/${token}${missionId ? `/mission/${missionId}` : ""}?${kind}=${encodeURIComponent(msg)}`);
const guard = (token: string) => { if (!isToken(token)) redirect("/agent/invalide"); };

export async function agentStageAction(token: string, missionId: string, stage: string) {
  guard(token);
  const { error } = await agentClient().rpc("agent_set_stage", { p_token: token, p_id: missionId, p_stage: stage });
  if (error) go(token, "error", agentMessage(error.message), missionId);
  revalidatePath(`/agent/${token}`);
  go(token, "ok", stage === "terminee" ? "Mission terminée. Merci !" : "C'est noté.", missionId);
}

export async function agentCheckAction(token: string, missionId: string, index: number, done: boolean) {
  guard(token);
  const { error } = await agentClient().rpc("agent_toggle_check", { p_token: token, p_id: missionId, p_index: index, p_done: done });
  if (error) go(token, "error", agentMessage(error.message), missionId);
  revalidatePath(`/agent/${token}`);
  redirect(`/agent/${token}/mission/${missionId}`);
}

export async function agentIssueAction(token: string, missionId: string, fd: FormData) {
  guard(token);
  const { error } = await agentClient().rpc("agent_report_issue", {
    p_token: token, p_id: missionId, p_description: String(fd.get("description") ?? ""), p_severity: String(fd.get("severity") ?? "normale")
  });
  if (error) go(token, "error", agentMessage(error.message), missionId);
  revalidatePath(`/agent/${token}`);
  go(token, "ok", "Problème signalé à votre responsable.", missionId);
}

/** Arrivée sur place : la position du téléphone doit être dans le rayon du site. Retourne une erreur lisible sinon. */
export async function agentCheckInAction(token: string, missionId: string, lat: number | null, lng: number | null, acc: number | null): Promise<{ error?: string }> {
  guard(token);
  const { error } = await agentClient().rpc("agent_check_in", { p_token: token, p_id: missionId, p_lat: lat, p_lng: lng, p_acc: acc });
  if (error) return { error: agentMessage(error.message) };
  revalidatePath(`/agent/${token}`);
  go(token, "ok", "Arrivée enregistrée. Bon courage !", missionId);
  return {};
}

/** Fin de mission : contrôle de la check-list, puis heure de départ (position relevée si disponible). */
export async function agentFinishAction(token: string, missionId: string, lat: number | null, lng: number | null, acc: number | null): Promise<{ error?: string }> {
  guard(token);
  const { error } = await agentClient().rpc("agent_finish", { p_token: token, p_id: missionId, p_lat: lat, p_lng: lng, p_acc: acc });
  if (error) return { error: agentMessage(error.message) };
  revalidatePath(`/agent/${token}`);
  go(token, "ok", "Mission terminée. Merci !", missionId);
  return {};
}

const PAGE = (token: string, path = "profil") => `/agent/${token}/${path}`;

/** Thème ou langue de l'application : un simple cookie de l'appareil (un an), aucune donnée envoyée à la base. */
export async function agentPrefAction(token: string, key: "theme" | "lang", value: string) {
  guard(token);
  const ok = key === "theme" ? isTheme(value) : key === "lang" ? isLang(value) : false;
  if (!ok) redirect(PAGE(token));
  cookies().set(key === "theme" ? "agent_theme" : "agent_lang", value, { httpOnly: true, secure: true, sameSite: "lax", path: "/agent", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath(`/agent/${token}`, "layout");
  redirect(PAGE(token));
}

/** Demande d'effacement des données personnelles : transmise au patron, qui la traite (rien n'est supprimé automatiquement). */
export async function agentRequestDeletionAction(token: string) {
  guard(token);
  const { error } = await agentClient().rpc("agent_request_deletion", { p_token: token });
  if (error) redirect(`${PAGE(token, "donnees")}?error=${encodeURIComponent(agentMessage(error.message))}`);
  revalidatePath(PAGE(token, "donnees"));
  redirect(`${PAGE(token, "donnees")}?ok=1`);
}
