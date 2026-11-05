"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { agentClient, agentMessage, isToken } from "@/lib/agent";

const go = (token: string, kind: "ok" | "error", msg: string): never => redirect(`/agent/${token}?${kind}=${encodeURIComponent(msg)}`);
const guard = (token: string) => { if (!isToken(token)) redirect("/agent/invalide"); };

export async function agentStageAction(token: string, missionId: string, stage: string) {
  guard(token);
  const { error } = await agentClient().rpc("agent_set_stage", { p_token: token, p_id: missionId, p_stage: stage });
  if (error) go(token, "error", agentMessage(error.message));
  revalidatePath(`/agent/${token}`);
  go(token, "ok", stage === "terminee" ? "Mission terminée. Merci !" : "C'est noté.");
}

export async function agentCheckAction(token: string, missionId: string, index: number, done: boolean) {
  guard(token);
  const { error } = await agentClient().rpc("agent_toggle_check", { p_token: token, p_id: missionId, p_index: index, p_done: done });
  if (error) go(token, "error", agentMessage(error.message));
  revalidatePath(`/agent/${token}`);
  redirect(`/agent/${token}#m-${missionId}`);
}

export async function agentIssueAction(token: string, missionId: string, fd: FormData) {
  guard(token);
  const { error } = await agentClient().rpc("agent_report_issue", {
    p_token: token, p_id: missionId, p_description: String(fd.get("description") ?? ""), p_severity: String(fd.get("severity") ?? "normale")
  });
  if (error) go(token, "error", agentMessage(error.message));
  revalidatePath(`/agent/${token}`);
  go(token, "ok", "Problème signalé à votre responsable.");
}

/** Arrivée sur place : la position du téléphone doit être dans le rayon du site. Retourne une erreur lisible sinon. */
export async function agentCheckInAction(token: string, missionId: string, lat: number | null, lng: number | null, acc: number | null): Promise<{ error?: string }> {
  guard(token);
  const { error } = await agentClient().rpc("agent_check_in", { p_token: token, p_id: missionId, p_lat: lat, p_lng: lng, p_acc: acc });
  if (error) return { error: agentMessage(error.message) };
  revalidatePath(`/agent/${token}`);
  go(token, "ok", "Arrivée enregistrée. Bon courage !");
  return {};
}

/** Fin de mission : contrôle de la check-list, puis heure de départ (position relevée si disponible). */
export async function agentFinishAction(token: string, missionId: string, lat: number | null, lng: number | null, acc: number | null): Promise<{ error?: string }> {
  guard(token);
  const { error } = await agentClient().rpc("agent_finish", { p_token: token, p_id: missionId, p_lat: lat, p_lng: lng, p_acc: acc });
  if (error) return { error: agentMessage(error.message) };
  revalidatePath(`/agent/${token}`);
  go(token, "ok", "Mission terminée. Merci !");
  return {};
}
