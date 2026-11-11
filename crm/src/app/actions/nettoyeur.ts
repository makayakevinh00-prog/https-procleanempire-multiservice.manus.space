"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { ibanValid, parseDepartments } from "@/lib/cleaner-ui";
import { sendMail, mailConfigured } from "@/lib/mail";

const base = (t: string, path = "") => `/nettoyeur/${t}${path}`;
const go = (t: string, path: string, kind: "ok" | "error", msg: string): never => redirect(`${base(t, path)}?${kind}=${encodeURIComponent(msg)}`);
const guard = (t: string) => { if (!isToken(t)) redirect("/nettoyeur/invalide"); };

export async function cleanerAcceptAction(token: string, jobId: string) {
  guard(token);
  const { error } = await agentClient().rpc("cleaner_accept_job", { p_token: token, p_job: jobId });
  if (error) go(token, "", "error", agentMessage(error.message));
  revalidatePath(base(token), "layout");
  go(token, "/missions", "ok", "Ménage accepté. L'adresse et les consignes sont maintenant visibles.");
}

export async function cleanerReleaseAction(token: string, jobId: string) {
  guard(token);
  const { error } = await agentClient().rpc("cleaner_release_job", { p_token: token, p_job: jobId });
  if (error) go(token, "/missions", "error", agentMessage(error.message));
  revalidatePath(base(token), "layout");
  go(token, "/missions", "ok", "Vous vous êtes désisté : le ménage est de nouveau proposé.");
}

export async function cleanerFinishAction(token: string, jobId: string, fd: FormData) {
  guard(token);
  const { error } = await agentClient().rpc("cleaner_finish_job", { p_token: token, p_job: jobId, p_note: String(fd.get("note") ?? "") });
  if (error) go(token, "/missions", "error", agentMessage(error.message));
  revalidatePath(base(token), "layout");
  go(token, "/missions", "ok", "Merci ! Votre ménage est envoyé à la direction pour vérification.");
}

export async function cleanerProfileAction(token: string, fd: FormData) {
  guard(token);
  const depts = parseDepartments(String(fd.get("departments") ?? ""));
  const iban = String(fd.get("iban") ?? "").trim();
  if (!depts.length) go(token, "/profil", "error", "Indiquez au moins un département (ex. 95).");
  if (iban && !ibanValid(iban)) go(token, "/profil", "error", "Cet IBAN n'est pas valide : vérifiez les chiffres.");
  const { error } = await agentClient().rpc("cleaner_update_profile", { p_token: token, p_departments: depts.join(","), p_phone: String(fd.get("phone") ?? ""), p_iban: iban || null });
  if (error) go(token, "/profil", "error", agentMessage(error.message));
  revalidatePath(base(token), "layout");
  go(token, "/profil", "ok", "Profil enregistré.");
}

/** Inscription publique : la demande est « en attente » ; le patron valide avant tout accès. */
export async function cleanerSignupAction(fd: FormData) {
  if (String(fd.get("website") ?? "") !== "") redirect("/nettoyeur/inscription?ok=1");           // piège anti-robot : champ invisible
  const depts = parseDepartments(String(fd.get("departments") ?? ""));
  const { data, error } = await agentClient().rpc("cleaner_signup", {
    p: { full_name: String(fd.get("full_name") ?? ""), email: String(fd.get("email") ?? ""), phone: String(fd.get("phone") ?? ""), siret: String(fd.get("siret") ?? ""), statut_pro: String(fd.get("statut_pro") ?? ""), departments: depts.join(","), city: String(fd.get("city") ?? "") }
  });
  if (error) redirect(`/nettoyeur/inscription?error=${encodeURIComponent(agentMessage(error.message))}`);
  if (data === "ok" && mailConfigured()) {
    const to = process.env.MAIL_ADMIN ?? "contact@procleanempire.com";
    await sendMail({ to, subject: "Nouvelle inscription de nettoyeur", text: `${String(fd.get("full_name") ?? "")} (${String(fd.get("email") ?? "")}) demande à rejoindre les nettoyeurs.\nÀ valider dans le CRM : Nettoyeurs › Inscriptions.` }).catch(() => undefined);
  }
  redirect("/nettoyeur/inscription?ok=1");
}
