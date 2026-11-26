"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { agentTripPing } from "@/lib/marketplace/trip";
import { isLang, isTheme } from "@/lib/field-ui";
import { isModule, type TrainingResult } from "@/lib/formation";

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

/** L'application s'ouvre (installée si ouverte depuis l'écran d'accueil). Silencieux : aucune erreur n'est montrée à l'agent. */
export async function agentMarkAppAction(token: string, installed: boolean): Promise<void> {
  guard(token);
  await agentClient().rpc("agent_mark_app", { p_token: token, p_installed: installed });
}

/** Position de l'agent en route vers sa mission (application à l'écran) : partagée jusqu'à l'arrivée pointée. */
export async function agentTripPingAction(token: string, missionId: string, lat: number, lng: number, mode?: string): Promise<void> {
  guard(token);
  if (!/^[0-9a-f-]{36}$/i.test(missionId)) return;
  await agentTripPing(token, missionId, lat, lng, mode === "transports" ? "transports" : "voiture");
}

/** Tâche cochée ou décochée, sans recharger la page (liste « À faire, dans l'ordre »). */
export async function agentTaskAction(token: string, missionId: string, index: number, done: boolean): Promise<{ ok: boolean; error?: string }> {
  guard(token);
  const { error } = await agentClient().rpc("agent_toggle_check", { p_token: token, p_id: missionId, p_index: index, p_done: done });
  if (error) return { ok: false, error: agentMessage(error.message) };
  revalidatePath(`/agent/${token}`);
  return { ok: true };
}

/** Photo de profil de l'agent (JPEG réduit par le téléphone). */
export async function agentAvatarAction(token: string, b64: string): Promise<{ ok: boolean; error?: string }> {
  guard(token);
  if (b64.length > 220_000 || !/^[A-Za-z0-9+/=]*$/.test(b64)) return { ok: false, error: "Photo trop lourde ou illisible." };
  const { error } = await agentClient().rpc("agent_set_avatar", { p_token: token, p_b64: b64 });
  if (error) return { ok: false, error: /PHOTO_TROP_LOURDE/.test(error.message) ? "Photo trop lourde." : /PHOTO_FORMAT/.test(error.message) ? "Format de photo non accepté." : agentMessage(error.message) };
  revalidatePath(`/agent/${token}`, "layout");
  return { ok: true };
}

/** Examen de formation : la correction est faite dans la base. */
export async function agentTrainingSubmitAction(token: string, module: string, answers: Record<string, number>): Promise<{ error?: string; result?: TrainingResult }> {
  guard(token);
  if (!isModule(module)) return { error: "Module inconnu." };
  const { data, error } = await agentClient().rpc("agent_training_submit", { p_token: token, p_module: `agent_${module}`, p_answers: answers });
  if (error) return { error: agentMessage(error.message) };
  revalidatePath(`/agent/${token}`, "layout");
  return { result: data as TrainingResult };
}
