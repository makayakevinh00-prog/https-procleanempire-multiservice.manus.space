"use server";

import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { ibanValid } from "@/lib/cleaner-ui";
import { geocode, inFrance } from "@/lib/zone";
import { checkSiret, siretValid } from "@/lib/siret";
import { sendMail, mailConfigured } from "@/lib/mail";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { runAfterAnalysis, type AfterOutcome } from "@/lib/marketplace/inspect";

const sha = (c: string) => createHash("sha256").update(c).digest("hex");
const origin = () => { const h = headers(); return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`; };
const base = (t: string, path = "") => `/nettoyeur/${t}${path}`;
const go = (t: string, path: string, kind: "ok" | "error", msg: string): never => redirect(`${base(t, path)}?${kind}=${encodeURIComponent(msg)}`);
const guard = (t: string) => { if (!isToken(t)) redirect("/nettoyeur/invalide"); };

export async function cleanerAcceptAction(token: string, jobId: string) {
  guard(token);
  const { data, error } = await agentClient().rpc("cleaner_accept_job", { p_token: token, p_job: jobId });
  if (error) go(token, "", "error", agentMessage(error.message));
  const j = data as { title?: string; date?: string; city?: string; name?: string; amount?: number } | null;
  if (j && mailConfigured()) {
    const day = j.date ? new Date(j.date + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : "";
    await sendMail({ to: process.env.MAIL_ADMIN ?? "contact@procleanempire.com", subject: `Ménage accepté — ${j.title ?? ""}`, text: `${j.name ?? "Un nettoyeur"} a accepté un ménage.\n\n${j.title ?? ""}\n${day}${j.city ? ` · ${j.city}` : ""}\nPart du nettoyeur : ${j.amount ?? ""} €\n\nÀ suivre en direct : CRM › Nettoyeurs.` }).catch(() => undefined);
  }
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

/** Après l'envoi : contrôle automatique des photos. Selon le verdict et le réglage : validé tout de suite, à reprendre, ou envoyé à la direction. Ne bloque jamais le nettoyeur. */
async function afterFinish(jobId: string, name: string): Promise<"validee" | "a_reprendre" | "a_verifier"> {
  let o: AfterOutcome = { status: "a_verifier", verdict: "indisponible", summary: "Analyse automatique impossible : erreur du serveur." };
  try { o = await runAfterAnalysis(jobId); } catch { /* le contrôle automatique est un plus */ }
  if (mailConfigured()) {
    const to = process.env.MAIL_ADMIN ?? "contact@procleanempire.com";
    const head = o.status === "validee" ? "Validé automatiquement : le contrôle par l'IA ne relève rien, le nettoyeur est autorisé à partir." : o.verdict === "reprise" ? "Reprise demandée automatiquement : des points restent à nettoyer." : o.verdict === "ok" ? "Le contrôle automatique ne relève rien : à vous de valider." : "Contrôle automatique indisponible : à vous de vérifier.";
    await sendMail({ to, subject: o.status === "validee" ? "Ménage validé automatiquement" : o.verdict === "reprise" ? "Ménage à reprendre — contrôle automatique" : "Ménage terminé à vérifier", text: `${name} a terminé un ménage.\n\n${head}\n${o.summary}\n\n${o.status === "validee" ? "Photos et détail" : "À vérifier"} dans le CRM : Nettoyeurs › Demandes.` }).catch(() => undefined);
  }
  return o.status;
}

export async function cleanerFinishAction(token: string, jobId: string, fd: FormData) {
  guard(token);
  const c = agentClient();
  const { error } = await c.rpc("cleaner_finish_job", { p_token: token, p_job: jobId, p_note: String(fd.get("note") ?? "") });
  if (error) go(token, "/missions", "error", agentMessage(error.message));
  const { data: ov } = await c.rpc("cleaner_overview", { p_token: token });
  const status = await afterFinish(jobId, String((ov as any)?.name ?? "Un nettoyeur"));
  revalidatePath(base(token), "layout");
  if (status === "validee") go(token, "/missions", "ok", "Ménage validé ✔ Le contrôle des photos est bon : vous pouvez partir. Il entre dans vos gains.");
  if (status === "a_reprendre") go(token, "/missions", "error", "Le contrôle des photos relève des points à reprendre : regardez la liste, reprenez, refaites une photo de chaque zone, puis terminez à nouveau.");
  go(token, "/missions", "ok", "Merci ! Votre ménage est envoyé à la direction pour vérification. Attendez ses instructions avant de partir.");
}

/** « Je suis sur place » : pointage d'arrivée. */
export async function cleanerArriveAction(token: string, jobId: string) {
  guard(token);
  const { error } = await agentClient().rpc("cleaner_arrive", { p_token: token, p_job: jobId });
  if (error) go(token, "/missions", "error", agentMessage(error.message));
  revalidatePath(base(token), "layout");
  go(token, "/missions", "ok", "Arrivée pointée. Commencez par les photos (ou la vidéo) avant le ménage.");
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
  const iban = String(fd.get("iban") ?? "").trim();
  const postal = String(fd.get("postal_code") ?? "").replace(/\s/g, "");
  const radius = Math.round(Number(fd.get("radius_km") ?? 15));
  const address = String(fd.get("address_line") ?? "").trim(), city = String(fd.get("city") ?? "").trim();
  if (!/^\d{5}$/.test(postal)) go(token, "/profil", "error", "Indiquez le code postal de votre adresse (5 chiffres).");
  if (!(radius >= 1 && radius <= 100)) go(token, "/profil", "error", "Le rayon doit être compris entre 1 et 100 km.");
  if (iban && !ibanValid(iban)) go(token, "/profil", "error", "Cet IBAN n'est pas valide : vérifiez les chiffres.");
  const gl = Number(fd.get("gps_lat")), gg = Number(fd.get("gps_lng"));
  const gps = fd.get("gps_lat") && fd.get("gps_lng") && Number.isFinite(gl) && Number.isFinite(gg) && inFrance({ lat: gl, lng: gg }) ? { lat: gl, lng: gg } : null;
  const pt = gps ?? (await geocode({ address, postal_code: postal, city }));
  const { error } = await agentClient().rpc("cleaner_update_profile2", { p_token: token, p_address: address, p_postal: postal, p_city: city, p_lat: pt?.lat ?? null, p_lng: pt?.lng ?? null, p_radius: radius, p_phone: String(fd.get("phone") ?? ""), p_iban: iban || null });
  if (error) go(token, "/profil", "error", agentMessage(error.message));
  revalidatePath(base(token), "layout");
  go(token, "/profil", "ok", pt ? (gps ? "Profil enregistré avec votre position GPS : vous voyez les ménages dans votre rayon." : "Profil enregistré : vous voyez les ménages dans votre rayon.") : "Profil enregistré. Votre adresse n'a pas pu être localisée : vous voyez les ménages de votre département.");
}

/** Bouton En ligne / Hors ligne. */
export async function cleanerOnlineAction(token: string, online: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!isToken(token)) return { ok: false, error: "Lien invalide." };
  const { error } = await agentClient().rpc("cleaner_set_online", { p_token: token, p_online: online });
  if (error) return { ok: false, error: agentMessage(error.message) };
  revalidatePath(base(token), "layout");
  return { ok: true };
}

/** Position en direct (application ouverte). */
export async function cleanerPingAction(token: string, lat: number, lng: number): Promise<void> {
  if (!isToken(token) || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
  await agentClient().rpc("cleaner_ping", { p_token: token, p_lat: lat, p_lng: lng });
}

/** Abonnement aux notifications de ce téléphone. */
export async function cleanerPushAction(token: string, sub: { endpoint: string; p256dh: string; auth: string }): Promise<{ ok: boolean }> {
  if (!isToken(token)) return { ok: false };
  const { error } = await agentClient().rpc("cleaner_push_subscribe", { p_token: token, p_endpoint: sub.endpoint, p_p256dh: sub.p256dh, p_auth: sub.auth });
  return { ok: !error };
}

/** Aller travailler dans une zone de demande : le centre de travail devient cette zone. */
export async function cleanerZoneAction(token: string, postal: string, city: string) {
  guard(token);
  const pt = await geocode({ postal_code: postal, city });
  const { error } = await agentClient().rpc("cleaner_set_zone", { p_token: token, p_postal: postal, p_city: city, p_lat: pt?.lat ?? null, p_lng: pt?.lng ?? null });
  if (error) go(token, "/demandes", "error", agentMessage(error.message));
  revalidatePath(base(token), "layout");
  go(token, "/demandes", "ok", `Vous travaillez maintenant autour de ${city}.`);
}

const SIGNUP = "/nettoyeur/inscription";
const fail = (msg: string): never => redirect(`${SIGNUP}?error=${encodeURIComponent(msg)}`);

/** Inscription publique et accès immédiat : le SIRET est contrôlé dans l'annuaire officiel, l'adresse est localisée, le lien personnel est créé et envoyé. */
export async function cleanerSignupAction(fd: FormData) {
  if (String(fd.get("website") ?? "") !== "") redirect(`${SIGNUP}?ok=1`);                       // piège anti-robot : champ invisible
  const name = String(fd.get("full_name") ?? "").trim(), email = String(fd.get("email") ?? "").trim().toLowerCase();
  const siret = String(fd.get("siret") ?? "").replace(/\s/g, ""), postal = String(fd.get("postal_code") ?? "").replace(/\s/g, "");
  const radius = Math.round(Number(fd.get("radius_km") ?? 15)), address = String(fd.get("address_line") ?? "").trim(), city = String(fd.get("city") ?? "").trim();
  if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("Indiquez votre nom et une adresse e-mail valide.");
  if (!siretValid(siret)) fail("Le SIRET doit comporter 14 chiffres valides. Pas encore de SIRET ? Il se crée gratuitement sur autoentrepreneur.urssaf.fr, puis revenez ici.");
  if (!/^\d{5}$/.test(postal)) fail("Indiquez le code postal de votre adresse (5 chiffres).");
  if (!(radius >= 1 && radius <= 100)) fail("Le rayon doit être compris entre 1 et 100 km.");
  const check = await checkSiret(siret);
  if (check.status === "cesse") fail("Ce SIRET correspond à une activité cessée. Vérifiez-le ou créez une nouvelle activité.");
  if (check.status === "inconnu") fail("Ce SIRET n'existe pas dans l'annuaire officiel des entreprises : vérifiez les chiffres.");
  const verified = check.status === "actif";                                                    // annuaire indisponible : la demande attend la validation du patron
  const pt = await geocode({ address, postal_code: postal, city });
  const token = randomBytes(32).toString("hex");
  const a = automationClient();
  const { data, error } = await a.rpc("automation_cleaner_register", {
    p_secret: automationSecret(), p_token_hash: sha(token),
    p: { full_name: name, email, phone: String(fd.get("phone") ?? ""), siret, statut_pro: String(fd.get("statut_pro") ?? ""), postal_code: postal, city, address_line: address, lat: pt?.lat ?? null, lng: pt?.lng ?? null, radius_km: radius, verified }
  });
  if (error) fail(agentMessage(error.message));
  if (data === "deja") {
    await sendNewLink(email);
    redirect(`${SIGNUP}?ok=lien`);
  }
  const admin = process.env.MAIL_ADMIN ?? "contact@procleanempire.com";
  if (data === "actif") {
    const url = `${origin()}/nettoyeur/${token}`;
    if (mailConfigured()) {
      await sendMail({ to: email, subject: "Bienvenue chez ProClean Empire — votre lien personnel", text: `Bonjour ${name.split(" ")[0]},\n\nVotre compte est actif : votre SIRET a été vérifié.\n\nVotre lien personnel : ${url}\n\nGardez-le pour vous et ajoutez-le à l'écran d'accueil de votre téléphone : vous y voyez les ménages Airbnb disponibles autour de chez vous (rayon de ${radius} km) et vous les acceptez en un geste. Dans Profil, ajoutez votre IBAN pour être payé.\n\nÀ bientôt,\nProClean Empire` }).catch(() => undefined);
      await sendMail({ to: admin, subject: "Nouveau nettoyeur inscrit", text: `${name} (${email}) s'est inscrit(e) : SIRET ${siret} vérifié, rayon ${radius} km autour de ${postal}${city ? ` ${city}` : ""}${pt ? "" : " (adresse non localisée : département seulement)"}.\nSuivi : CRM › Nettoyeurs › Nettoyeurs.` }).catch(() => undefined);
    }
    cookies().set("cleaner_welcome", url, { httpOnly: true, secure: true, sameSite: "strict", path: "/nettoyeur/inscription", maxAge: 600 });
    redirect(`${SIGNUP}?ok=actif`);
  }
  if (mailConfigured()) await sendMail({ to: admin, subject: "Inscription de nettoyeur à valider", text: `${name} (${email}) demande à rejoindre les nettoyeurs ; l'annuaire des entreprises n'a pas répondu : SIRET ${siret} à vérifier.\nÀ valider dans le CRM : Nettoyeurs › Inscriptions.` }).catch(() => undefined);
  redirect(`${SIGNUP}?ok=attente`);
}

async function sendNewLink(email: string) {
  const token = randomBytes(32).toString("hex");
  const { data } = await automationClient().rpc("automation_cleaner_new_link", { p_secret: automationSecret(), p_email: email, p_token_hash: sha(token) });
  if (typeof data === "string" && data !== "trop_tot" && mailConfigured()) {
    await sendMail({ to: email, subject: "Votre nouveau lien ProClean Empire", text: `Bonjour ${data.split(" ")[0]},\n\nVoici votre nouveau lien personnel (l'ancien ne fonctionne plus) :\n${origin()}/nettoyeur/${token}\n\nGardez-le pour vous.\n\nProClean Empire` }).catch(() => undefined);
  }
}

/** « J'ai perdu mon lien » : un nouveau lien part à l'adresse du compte (réponse identique que le compte existe ou non). */
export async function cleanerRecoverAction(fd: FormData) {
  if (String(fd.get("website") ?? "") === "") {
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) await sendNewLink(email);
  }
  redirect(`${SIGNUP}?ok=lien`);
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
