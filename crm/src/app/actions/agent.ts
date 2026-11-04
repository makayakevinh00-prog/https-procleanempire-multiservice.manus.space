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
