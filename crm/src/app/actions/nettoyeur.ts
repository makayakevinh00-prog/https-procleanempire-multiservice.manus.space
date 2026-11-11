"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { ibanValid, parseDepartments } from "@/lib/cleaner-ui";
import { sendMail, mailConfigured } from "@/lib/mail";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { aiConfigured, analyzeAfter, type BeforeReport, type Img } from "@/lib/ai-inspect";

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

/** Après l'envoi : contrôle automatique des photos (si l'IA est activée), puis prévenir la direction. Ne bloque jamais le nettoyeur. */
async function afterFinish(jobId: string, name: string) {
  let verdict = "indisponible", summary = "Analyse automatique non activée : vérifiez les photos.";
  try {
    const a = automationClient(), secret = automationSecret();
    let report: unknown = { summary };
    if (aiConfigured()) {
      const [ctx, photos] = await Promise.all([a.rpc("automation_job_context", { p_secret: secret, p_job: jobId }), a.rpc("automation_job_photos", { p_secret: secret, p_job: jobId, p_kind: "apres" })]);
      const rep = await analyzeAfter((photos.data ?? []) as Img[], ((ctx.data as any)?.before_report ?? null) as BeforeReport | null);
      if (rep) { verdict = rep.verdict; summary = rep.summary; report = rep; }
      else summary = "L'analyse automatique n'a pas abouti : vérifiez les photos.";
    }
    await a.rpc("automation_set_job_analysis", { p_secret: secret, p_job: jobId, p_kind: "apres", p_report: report, p_verdict: verdict });
  } catch { /* le contrôle automatique est un plus */ }
  if (mailConfigured()) {
    const to = process.env.MAIL_ADMIN ?? "contact@procleanempire.com";
    const head = verdict === "reprise" ? "Reprise demandée automatiquement : des points restent à nettoyer." : verdict === "ok" ? "Le contrôle automatique ne relève rien." : "Contrôle automatique indisponible.";
    await sendMail({ to, subject: verdict === "reprise" ? "Ménage à reprendre — contrôle automatique" : "Ménage terminé à vérifier", text: `${name} a terminé un ménage.\n\n${head}\n${summary}\n\nÀ vérifier dans le CRM : Nettoyeurs › Demandes.` }).catch(() => undefined);
  }
}

export async function cleanerFinishAction(token: string, jobId: string, fd: FormData) {
  guard(token);
  const c = agentClient();
  const { error } = await c.rpc("cleaner_finish_job", { p_token: token, p_job: jobId, p_note: String(fd.get("note") ?? "") });
  if (error) go(token, "/missions", "error", agentMessage(error.message));
  const { data: ov } = await c.rpc("cleaner_overview", { p_token: token });
  await afterFinish(jobId, String((ov as any)?.name ?? "Un nettoyeur"));
  revalidatePath(base(token), "layout");
  go(token, "/missions", "ok", "Merci ! Votre ménage est envoyé à la direction pour vérification. Attendez ses instructions avant de partir.");
}

/** Suivi des draps : déposer (poste ou livreur), récupérer au retour, remettre en place. */
export async function cleanerLinenAction(token: string, jobId: string, fd: FormData) {
  guard(token);
  const { error } = await agentClient().rpc("cleaner_linen_update", { p_token: token, p_job: jobId, p_status: String(fd.get("status") ?? ""), p_method: String(fd.get("method") ?? "") || null, p_tracking: String(fd.get("tracking") ?? "") || null });
  if (error) go(token, "/missions", "error", agentMessage(error.message));
  revalidatePath(base(token), "layout");
  go(token, "/missions", "ok", "Draps mis à jour. Merci !");
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

const KIND_LABEL: Record<string, string> = { studio: "Studio", t2: "2 pièces", t3: "3 pièces", maison: "Maison" };

/** Réservation publique d'un ménage : enregistrée « en attente » ; le patron accepte avant qu'un nettoyeur soit proposé. Accusé de réception par e-mail. */
export async function bookCleaningAction(fd: FormData) {
  if (String(fd.get("website") ?? "") !== "") redirect("/reserver?ok=1");
  const p = { name: String(fd.get("name") ?? ""), email: String(fd.get("email") ?? ""), phone: String(fd.get("phone") ?? ""), address: String(fd.get("address") ?? ""), postal_code: String(fd.get("postal_code") ?? "").replace(/\s/g, ""), city: String(fd.get("city") ?? ""), job_date: String(fd.get("job_date") ?? ""), kind: String(fd.get("kind") ?? ""), note: String(fd.get("note") ?? ""), access_notes: String(fd.get("access_notes") ?? "") };
  const { error } = await agentClient().rpc("book_cleaning", { p });
  if (error) redirect(`/reserver?error=${encodeURIComponent(agentMessage(error.message))}`);
  if (mailConfigured()) {
    const day = new Date(p.job_date + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    await sendMail({ to: p.email, subject: "Votre demande de ménage est bien reçue — ProClean Empire", text: `Bonjour ${p.name.split(" ")[0]},\n\nNous avons bien reçu votre demande de ménage (${KIND_LABEL[p.kind] ?? p.kind}) le ${day} à ${p.city}.\n\nNous la validons et vous confirmons le créneau (entre 11 h et 14 h) par e-mail très vite. Le paiement se fait après le ménage, sur facture.\n\nÀ bientôt,\nProClean Empire` }).catch(() => undefined);
    await sendMail({ to: process.env.MAIL_ADMIN ?? "contact@procleanempire.com", subject: "Nouvelle réservation de ménage", text: `${p.name} (${p.email}) demande un ménage ${KIND_LABEL[p.kind] ?? p.kind} le ${p.job_date} à ${p.city}.\nÀ accepter dans le CRM : Nettoyeurs › Réservations.` }).catch(() => undefined);
  }
  redirect("/reserver?ok=1");
}
