"use server";

import { revalidatePath } from "next/cache";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { ibanValid } from "@/lib/cleaner-ui";
import { geocode, inFrance } from "@/lib/zone";
import { checkSiret, siretValid } from "@/lib/siret";
import { checkIcalUrl } from "@/lib/concierge/ical";
import { analyzeReference, type Img } from "@/lib/ai-inspect";
import { sendMail, mailConfigured } from "@/lib/mail";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { notifyOutcome, runAfterAnalysis, type AfterOutcome } from "@/lib/marketplace/inspect";
import { autoAcceptBookings, trackUrl } from "@/lib/marketplace/auto-accept";
import { hashPassword, passwordOk, verifyPassword } from "@/lib/password";
import { createClient, createAdmin } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import type { CleanerIdentity } from "@/lib/identity";
import { tripPing } from "@/lib/marketplace/trip";
import type { LiveJob } from "@/lib/live";
import { MODULES, isModule, type TrainingResult, type TrainingState } from "@/lib/formation";

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
  let o: AfterOutcome = { status: "a_verifier", verdict: "indisponible", summary: "Analyse automatique impossible : erreur du serveur.", by: null, reason: null };
  try { o = await runAfterAnalysis(jobId); } catch { /* le contrôle automatique est un plus */ }
  await notifyOutcome(jobId, o, name).catch(() => undefined); // direction et propriétaire prévenus, avec les captures de fin
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
  if (status === "validee") go(token, "/missions", "ok", "Ménage validé ✔ Vous pouvez partir. Il entre dans vos gains.");
  if (status === "a_reprendre") go(token, "/missions", "error", "Le contrôle des photos relève des points à reprendre : regardez la liste, reprenez, refaites une photo de chaque zone, puis terminez à nouveau.");
  go(token, "/missions", "ok", "Merci ! Votre ménage est envoyé à la direction pour vérification. Attendez ses instructions avant de partir.");
}

/** Mission guidée : pointer l'arrivée sans quitter l'écran (le serveur revérifie jour et ménage). */
export async function cleanerArriveFlowAction(token: string, jobId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isToken(token)) return { ok: false, error: "Lien invalide." };
  const { error } = await agentClient().rpc("cleaner_arrive", { p_token: token, p_job: jobId });
  if (error) return { ok: false, error: agentMessage(error.message) };
  revalidatePath(base(token), "layout");
  return { ok: true };
}

/** Mission guidée : la vidéo de fin est envoyée, le ménage est terminé et l'IA contrôle tout de suite. Renvoie le résultat sans changer d'écran. */
export async function cleanerFinishFlowAction(token: string, jobId: string): Promise<{ ok: boolean; status?: "validee" | "a_reprendre" | "a_verifier"; error?: string }> {
  if (!isToken(token)) return { ok: false, error: "Lien invalide." };
  const c = agentClient();
  const { data: lists } = await c.rpc("cleaner_checklists", { p_token: token });
  const left = ((lists as Record<string, { done: boolean }[]> | null)?.[jobId] ?? []).some((t) => !t.done);
  // Les tâches sont contrôlées par l'IA d'après la vidéo de fin : le nettoyeur n'a pas à toutes les cocher.
  const { error } = await c.rpc("cleaner_finish_job", { p_token: token, p_job: jobId, p_note: left ? "Fin filmée : tâches contrôlées par l'IA d'après la vidéo." : "" });
  if (error) return { ok: false, error: agentMessage(error.message) };
  const { data: ov } = await c.rpc("cleaner_overview", { p_token: token });
  const status = await afterFinish(jobId, String((ov as any)?.name ?? "Un nettoyeur"));
  revalidatePath(base(token), "layout");
  return { ok: true, status };
}

/** Cocher ou décocher une tâche du ménage (sans recharger la page). */
export async function cleanerTaskAction(token: string, jobId: string, index: number, done: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!isToken(token)) return { ok: false, error: "Lien invalide." };
  const { error } = await agentClient().rpc("cleaner_check_task", { p_token: token, p_job: jobId, p_index: index, p_done: done });
  return error ? { ok: false, error: agentMessage(error.message) } : { ok: true };
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

/** Formation : la correction se fait dans la base, l'application n'envoie que les réponses. */
export async function cleanerTrainingSubmitAction(token: string, module: string, answers: Record<string, number>): Promise<{ error?: string; result?: TrainingResult }> {
  guard(token);
  if (!isModule(module)) return { error: "Module inconnu." };
  const before = (await agentClient().rpc("cleaner_training", { p_token: token })).data as TrainingState | null;
  const { data, error } = await agentClient().rpc("cleaner_training_submit", { p_token: token, p_module: module, p_answers: answers });
  if (error) return { error: agentMessage(error.message) };
  revalidatePath(base(token), "layout");
  const r = data as TrainingResult;
  await notifyTraining(before, module, r).catch(() => undefined);
  return { result: r };
}

/** Prévient la direction : certification obtenue (une seule fois) ou module raté. Un module déjà réussi qu'on repasse ne déclenche rien. */
async function notifyTraining(before: TrainingState | null, module: string, r: TrainingResult) {
  if (!mailConfigured() || !before || !isModule(module)) return;
  const to = process.env.MAIL_ADMIN ?? "contact@procleanempire.com", name = before.name ?? "Un nettoyeur", title = MODULES[module].title;
  if (r.certified && !before.certified_at) {
    await sendMail({ to, subject: `Nettoyeur certifié — ${name}`, text: `${name} vient d'obtenir le certificat ProClean : dernier module « ${title} » réussi à ${r.score} %.\n\nSes ménages sont maintenant débloqués.\nDétail : CRM › Nettoyeurs.` });
  } else if (!r.passed) {
    const tries = (before.modules[module]?.attempts ?? 0) + 1;
    await sendMail({ to, subject: `Examen raté — ${name}`, text: `${name} a raté le module « ${title} » : ${r.score} % (${r.pass_mark} % demandés), essai n° ${tries}.\n\nIl ou elle peut repasser l'examen après avoir relu le cours.\nDétail : CRM › Nettoyeurs.` });
  }
}

/** Le nettoyeur demande son virement : ses ménages validés non payés sont regroupés dans une facture numérotée, la direction est prévenue par e-mail. */
export async function cleanerRequestPayoutAction(token: string) {
  guard(token);
  const { data, error } = await agentClient().rpc("cleaner_request_payout", { p_token: token });
  if (error) go(token, "/gains", "error", agentMessage(error.message));
  const r = data as { payout: string; invoice_no: string; amount: number; jobs: number; cleaner: string };
  if (mailConfigured()) {
    const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(r.amount));
    await sendMail({
      to: process.env.MAIL_ADMIN ?? "contact@procleanempire.com",
      subject: `Demande de virement — ${r.cleaner} — ${eur}`,
      text: `${r.cleaner} demande le virement de ${eur} pour ${r.jobs} ménage${r.jobs > 1 ? "s" : ""} validé${r.jobs > 1 ? "s" : ""}.\n\nFacture : ${r.invoice_no}\n\nPour la payer : CRM > Nettoyeurs > Paiements, téléchargez le fichier de virements (IBAN inclus) et importez-le dans Qonto, puis marquez le paiement comme payé.\n\nService Facturation & Recouvrement — ProClean Empire`,
    }).catch(() => undefined);
  }
  revalidatePath(base(token), "layout");
  go(token, `/factures/${r.payout}`, "ok", "Demande envoyée. Voici votre facture : vous serez payé par virement.");
}

/** Démarre la vérification d'identité (pièce + selfie) chez Stripe Identity : la personne est envoyée sur la page sécurisée de Stripe, puis revient ici. */
export async function startIdentityAction(token: string) {
  guard(token);
  const { data, error } = await agentClient().rpc("cleaner_identity", { p_token: token });
  if (error) go(token, "/identite", "error", agentMessage(error.message));
  const c = data as CleanerIdentity;
  if (c.status === "verifie" || c.status === "non_requis") go(token, "/identite", "ok", "Votre identité est déjà vérifiée.");
  let url: string | null = null;
  try {
    const s = await stripe<{ id: string; url: string }>("POST", "/identity/verification_sessions", {
      type: "document",
      options: { document: { require_matching_selfie: true, require_live_capture: true, allowed_types: ["driving_license", "passport", "id_card"] } },
      metadata: { cleaner_id: c.id },
      provided_details: { email: c.email },
      return_url: `${origin()}${base(token, "/identite")}`
    });
    url = s.url;
    const saved = await agentClient().rpc("cleaner_identity_start", { p_token: token, p_session: s.id });
    if (saved.error) throw new Error(`Session Stripe créée mais non enregistrée : ${saved.error.message}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[identité] Stripe Identity a refusé la session :", msg);
    url = null;
    if (mailConfigured()) await sendMail({
      to: process.env.MAIL_ADMIN ?? "contact@procleanempire.com",
      subject: `Vérification d'identité bloquée — ${c.name}`,
      text: `${c.name} n'a pas pu démarrer la vérification d'identité.\n\nRéponse de Stripe : « ${msg} »\n\nVérifiez Stripe Identity (https://dashboard.stripe.com/identity/overview) et les journaux de l'application.\n\nService Facturation & Recouvrement — ProClean Empire`
    }).catch(() => undefined);
    go(token, "/identite", "error", /identity|permission|activ/i.test(msg) ? "Le service de vérification est en cours d'activation : la direction vient d'être prévenue. Revenez dans quelques heures, rien d'autre à faire." : "Impossible de démarrer la vérification pour le moment. Réessayez dans quelques minutes.");
  }
  if (url) redirect(url);
}

/** Prime « linge lavé » : le nettoyeur indique qu'il a lavé les draps lui-même. */
export async function cleanerLinenWashedAction(token: string, jobId: string, fd: FormData) {
  guard(token);
  const washed = fd.get("washed") === "1";
  const { error } = await agentClient().rpc("cleaner_linen_washed", { p_token: token, p_job: jobId, p_washed: washed });
  if (error) go(token, "/missions", "error", agentMessage(error.message));
  revalidatePath(base(token), "layout");
  go(token, "/missions", "ok", washed ? "Prime linge ajoutée à ce ménage. Merci !" : "Prime linge retirée.");
}

export async function cleanerProfileAction(token: string, fd: FormData) {
  guard(token);
  const postal = String(fd.get("postal_code") ?? "").replace(/\s/g, "");
  const radius = Math.round(Number(fd.get("radius_km") ?? 15));
  const address = String(fd.get("address_line") ?? "").trim(), city = String(fd.get("city") ?? "").trim();
  if (!/^\d{5}$/.test(postal)) go(token, "/profil/adresse", "error", "Indiquez le code postal de votre adresse (5 chiffres).");
  if (!(radius >= 1 && radius <= 100)) go(token, "/profil/adresse", "error", "Le rayon doit être compris entre 1 et 100 km.");
  const gl = Number(fd.get("gps_lat")), gg = Number(fd.get("gps_lng"));
  const gps = fd.get("gps_lat") && fd.get("gps_lng") && Number.isFinite(gl) && Number.isFinite(gg) && inFrance({ lat: gl, lng: gg }) ? { lat: gl, lng: gg } : null;
  const pt = gps ?? (await geocode({ address, postal_code: postal, city }));
  // Le téléphone et l'IBAN ont leurs propres enregistrements : on reprend ici les valeurs actuelles pour ne rien changer.
  const cur = await agentClient().rpc("cleaner_overview", { p_token: token });
  if (cur.error) go(token, "/profil/adresse", "error", agentMessage(cur.error.message));
  const { error } = await agentClient().rpc("cleaner_update_profile2", { p_token: token, p_address: address, p_postal: postal, p_city: city, p_lat: pt?.lat ?? null, p_lng: pt?.lng ?? null, p_radius: radius, p_phone: String((cur.data as { phone?: string | null }).phone ?? ""), p_iban: null });
  if (error) go(token, "/profil/adresse", "error", agentMessage(error.message));
  revalidatePath(base(token), "layout");
  go(token, "/profil/adresse", "ok", pt ? (gps ? "Profil enregistré avec votre position GPS : vous voyez les ménages dans votre rayon." : "Profil enregistré : vous voyez les ménages dans votre rayon.") : "Profil enregistré. Votre adresse n'a pas pu être localisée : vous voyez les ménages de votre département.");
}

/** Contact : le téléphone s'enregistre seul. */
export async function cleanerPhoneAction(token: string, fd: FormData) {
  guard(token);
  const { error } = await agentClient().rpc("cleaner_update_phone", { p_token: token, p_phone: String(fd.get("phone") ?? "") });
  if (error) go(token, "/profil/telephone", "error", agentMessage(error.message));
  revalidatePath(base(token), "layout");
  go(token, "/profil/telephone", "ok", "Téléphone enregistré.");
}

/** Linge : le nettoyeur indique s'il peut laver du linge en laverie automatique ; la direction le voit dans le CRM. */
export async function cleanerLinenPrefAction(token: string, fd: FormData) {
  guard(token);
  const { error } = await agentClient().rpc("cleaner_set_linen", { p_token: token, p_ok: fd.get("lave_linge") === "on", p_note: String(fd.get("note") ?? "") });
  if (error) go(token, "/profil/linge", "error", agentMessage(error.message));
  revalidatePath(base(token), "layout");
  go(token, "/profil/linge", "ok", "Enregistré.");
}

/** Paiement : l'IBAN s'enregistre seul. */
export async function cleanerIbanAction(token: string, fd: FormData) {
  guard(token);
  const iban = String(fd.get("iban") ?? "").trim();
  if (!ibanValid(iban)) go(token, "/profil/iban", "error", "Cet IBAN n'est pas valide : vérifiez les chiffres.");
  const { error } = await agentClient().rpc("cleaner_update_iban", { p_token: token, p_iban: iban });
  if (error) go(token, "/profil/iban", "error", agentMessage(error.message));
  revalidatePath(base(token), "layout");
  go(token, "/profil/iban", "ok", "IBAN enregistré.");
}

/** Photo de profil (JPEG carré réduit par le téléphone) ; chaîne vide = retirer la photo. */
export async function cleanerAvatarAction(token: string, b64: string): Promise<{ ok: boolean; error?: string }> {
  guard(token);
  if (b64.length > 220_000 || !/^[A-Za-z0-9+/=]*$/.test(b64)) return { ok: false, error: "Photo trop lourde ou illisible." };
  const { error } = await agentClient().rpc("cleaner_set_avatar", { p_token: token, p_b64: b64 });
  if (error) return { ok: false, error: /PHOTO_TROP_LOURDE/.test(error.message) ? "Photo trop lourde." : /PHOTO_FORMAT/.test(error.message) ? "Format de photo non accepté." : agentMessage(error.message) };
  revalidatePath(base(token), "layout");
  return { ok: true };
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
export async function cleanerPingAction(token: string, lat: number, lng: number, mode?: string): Promise<{ dist_m: number | null; eta_minutes: number | null } | null> {
  const r = await tripPing(token, lat, lng, mode === "transports" ? "transports" : "voiture");
  return r ? { dist_m: r.dist_m ?? null, eta_minutes: r.eta_minutes } : null;
}

/** Suivi en direct pour le client qui a réservé (lien de suivi). */
export async function bookingLiveAction(token: string): Promise<LiveJob[]> {
  if (!isToken(token)) return [];
  const { data, error } = await agentClient().rpc("booking_live", { p_token: token });
  return error || !data ? [] : [data as LiveJob];
}

/** Suivi en direct pour le propriétaire ou la conciergerie (lien privé). */
export async function partnerLiveAction(token: string): Promise<LiveJob[]> {
  if (!isToken(token)) return [];
  const { data, error } = await agentClient().rpc("partner_live", { p_secret: token });
  return error ? [] : ((data ?? []) as LiveJob[]);
}

export type CleanerTrip = { job: string; title: string; city: string | null; start: string; started: boolean; eta_at: string | null; eta_minutes: number | null; has_dest: boolean };
/** Le ménage du jour à rejoindre (bouton « Je pars »). */
export async function cleanerTripAction(token: string): Promise<CleanerTrip | null> {
  if (!isToken(token)) return null;
  const { data, error } = await agentClient().rpc("cleaner_trip", { p_token: token });
  return error ? null : ((data as CleanerTrip | null) ?? null);
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

/** Livreur de linge : avancer une tournée (« Je pars », « Fait » avec le nombre de parures, « Je ne peux plus »). */
export async function courierRunAction(token: string, runId: string, status: "en_route" | "fait" | "a_faire", fd?: FormData) {
  if (!isToken(token)) redirect("/nettoyeur");
  const back = (kind: "ok" | "error", msg: string): never => redirect(`/linge/${token}?${kind}=${encodeURIComponent(msg)}`);
  const raw = fd?.get("sets"), sets = raw != null && String(raw).trim() !== "" ? Math.round(Number(raw)) : null;
  if (sets != null && !(sets >= 0 && sets <= 50)) back("error", "Nombre de parures entre 0 et 50.");
  const { error } = await agentClient().rpc("courier_run_update", { p_token: token, p_run: runId, p_status: status, p_sets: sets });
  if (error) back("error", agentMessage(error.message));
  revalidatePath(`/linge/${token}`);
  back("ok", status === "en_route" ? "C'est noté : le nettoyeur voit que vous arrivez. Gardez cette page ouverte pour partager votre position." : status === "fait" ? "Merci, c'est enregistré : le stock du logement est à jour." : "Tournée libérée pour un autre livreur.");
}

/** Position du livreur en route (page ouverte). */
export async function courierPingAction(token: string, lat: number, lng: number): Promise<void> {
  if (!isToken(token) || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
  await agentClient().rpc("courier_ping", { p_token: token, p_lat: lat, p_lng: lng });
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
  const noSiret = siret === "";                                                                   // pas encore d'entreprise : compte créé, en attente du SIRET
  if (!noSiret && !siretValid(siret)) fail("Le SIRET doit comporter 14 chiffres valides. Pas encore de SIRET ? Laissez la case vide : nous vous guidons pour créer votre entreprise.");
  if (!/^\d{5}$/.test(postal)) fail("Indiquez le code postal de votre adresse (5 chiffres).");
  if (!(radius >= 1 && radius <= 100)) fail("Le rayon doit être compris entre 1 et 100 km.");
  const check = noSiret ? { status: "sans" as const } : await checkSiret(siret);
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
  if (noSiret && data !== "sans_siret") fail("Votre demande est enregistrée, mais l'inscription sans SIRET n'est pas encore ouverte. Nous vous recontactons par e-mail.");
  if (data === "sans_siret") {
    const url = `${origin()}/nettoyeur/attente/${token}`;
    if (mailConfigured()) {
      await sendMail({ to: email, subject: "ProClean Empire — créez votre entreprise pour commencer", text: `Bonjour ${name.split(" ")[0]},\n\nVotre compte est créé. Il vous manque un numéro SIRET pour recevoir des ménages : il s'obtient en créant votre auto-entreprise (quelques jours).\n\nVotre page de suivi : ${url}\nVous y trouvez les liens pour créer votre entreprise, puis la case pour saisir votre SIRET. Votre compte s'active dès que le SIRET est vérifié.\n\nProClean Empire` }).catch(() => undefined);
      await sendMail({ to: admin, subject: "Nouveau nettoyeur inscrit sans SIRET", text: `${name} (${email}) s'est inscrit(e) sans SIRET : compte en attente jusqu'à la création de son entreprise.\nSuivi : CRM › Nettoyeurs › Inscriptions.` }).catch(() => undefined);
    }
    redirect(`/nettoyeur/attente/${token}?nouveau=1`);
  }
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

/** Compte en attente : la personne saisit son SIRET une fois son entreprise créée. Vérifié dans l'annuaire officiel = compte actif tout de suite. */
export async function cleanerSiretAction(token: string, fd: FormData) {
  guard(token);
  const back = (kind: "ok" | "error", msg: string): never => redirect(`/nettoyeur/attente/${token}?${kind}=${encodeURIComponent(msg)}`);
  const siret = String(fd.get("siret") ?? "").replace(/\s/g, "");
  if (!siretValid(siret)) back("error", "Le SIRET comporte 14 chiffres. Vous le trouvez sur le document reçu après la création de votre entreprise.");
  const check = await checkSiret(siret);
  if (check.status === "cesse") back("error", "Ce SIRET correspond à une activité cessée.");
  if (check.status === "inconnu") back("error", "Ce SIRET n'apparaît pas encore dans l'annuaire officiel. Après une création, il faut parfois attendre quelques jours : réessayez plus tard.");
  const { data, error } = await automationClient().rpc("automation_cleaner_set_siret", { p_secret: automationSecret(), p_token: token, p_siret: siret, p_verified: check.status === "actif" });
  if (error) back("error", agentMessage(error.message));
  if (data === "actif") redirect(`/nettoyeur/${token}`);
  back("ok", "SIRET enregistré. L'annuaire officiel ne répond pas en ce moment : nous le vérifions à la main et activons votre compte très vite.");
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
  // Réservation avec lien de suivi ; tant que la base n'a pas la mise à jour 0069, on enregistre comme avant (sans lien).
  let res = await agentClient().rpc("book_cleaning_tracked", { p });
  if (res.error?.code === "PGRST202") res = await agentClient().rpc("book_cleaning", { p });
  if (res.error) redirect(`/reserver?error=${encodeURIComponent(agentMessage(res.error.message))}`);
  const link = trackUrl(typeof res.data === "string" ? res.data : null);
  const track = link ? `\n\nSuivez votre demande à tout moment :\n${link}` : "";
  if (mailConfigured()) {
    const day = new Date(p.job_date + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    await sendMail({ to: p.email, subject: "Votre demande de ménage est bien reçue — ProClean Empire", text: `Bonjour ${p.name.split(" ")[0]},\n\nNous avons bien reçu votre demande de ménage (${KIND_LABEL[p.kind] ?? p.kind}) le ${day} à ${p.city}.\n\nNous la validons et vous confirmons le créneau (entre 11 h et 14 h) par e-mail très vite. Le paiement se fait après le ménage, sur facture.${track}\n\nÀ bientôt,\nProClean Empire` }).catch(() => undefined);
    await sendMail({ to: process.env.MAIL_ADMIN ?? "contact@procleanempire.com", subject: "Nouvelle réservation de ménage", text: `${p.name} (${p.email}) demande un ménage ${KIND_LABEL[p.kind] ?? p.kind} le ${p.job_date} à ${p.city}.\nÀ accepter dans le CRM : Nettoyeurs › Réservations.` }).catch(() => undefined);
  }
  // Demande simple et réglage activé : acceptée tout de suite (sinon elle attend le patron, comme avant).
  await autoAcceptBookings().catch(() => undefined);
  redirect(link ? `/suivi/menage/${link.split("/").pop()}?nouveau=1` : "/reserver?ok=1");
}

/** Depuis la page de suivi : le client note son ménage (une fois, quand il est terminé). */
export async function bookingRateAction(token: string, fd: FormData) {
  if (!isToken(token)) redirect("/reserver");
  const { error } = await agentClient().rpc("booking_rate", { p_token: token, p_rating: Number(fd.get("rating") ?? 0), p_comment: String(fd.get("comment") ?? "") });
  revalidatePath(`/suivi/menage/${token}`);
  redirect(`/suivi/menage/${token}${error ? `?erreur=${encodeURIComponent(agentMessage(error.message))}` : "?merci=1"}`);
}

// ───────────── Espace conciergerie (lien privé) ─────────────
const pBack = (t: string, kind: "ok" | "error", msg: string, v = "logements"): never => redirect(`/partenaire/${t}?v=${v}&${kind}=${encodeURIComponent(msg)}`);

/** La conciergerie ajoute ou modifie un de ses logements : nom, adresse, accès, lien de calendrier (vérifié ici). Le tarif reste fixé par ProClean. */
export async function partnerSaveListingAction(token: string, id: string | null, fd: FormData) {
  if (!isToken(token)) redirect("/nettoyeur");
  const ical = String(fd.get("ical_url") ?? "").trim();
  let url = "";
  if (ical) { const c = checkIcalUrl(ical); if (!c.ok) pBack(token, "error", c.reason); else url = c.url; }
  const p = { name: String(fd.get("name") ?? ""), address: String(fd.get("address") ?? ""), postal_code: String(fd.get("postal_code") ?? "").replace(/\s/g, ""), city: String(fd.get("city") ?? ""), access_notes: String(fd.get("access_notes") ?? ""), platform: String(fd.get("platform") ?? "autre"), ical_url: url, keep_ical: !!id && !url && fd.get("remove_ical") !== "on", checkout_time: String(fd.get("checkout_time") ?? "") };
  const { error } = await agentClient().rpc("partner_save_listing", { p_secret: token, p_id: id, p });
  if (error) pBack(token, "error", agentMessage(error.message));
  if (!id && mailConfigured()) await sendMail({ to: process.env.MAIL_ADMIN ?? "contact@procleanempire.com", subject: "Nouveau logement ajouté par une conciergerie", text: `Le logement « ${p.name} » (${p.postal_code} ${p.city}) vient d'être ajouté depuis l'espace conciergerie.\n\nIl lui manque le tarif du ménage : sans tarif, aucun ménage n'est publié.\nÀ compléter : CRM › Conciergerie.` }).catch(() => undefined);
  revalidatePath(`/partenaire/${token}`);
  pBack(token, "ok", id ? "Logement enregistré." : "Logement ajouté. ProClean fixe le tarif du ménage, puis les ménages se créent tout seuls à chaque départ.");
}

export async function partnerLinenAction(token: string, listing: string, fd: FormData) {
  if (!isToken(token)) redirect("/nettoyeur");
  const n = Math.round(Number(fd.get("clean")));
  if (!(n >= 0 && n <= 200)) pBack(token, "error", "Nombre de parures entre 0 et 200.", "linge");
  const { error } = await agentClient().rpc("partner_set_linen", { p_secret: token, p_listing: listing, p_clean: n });
  if (error) pBack(token, "error", agentMessage(error.message));
  revalidatePath(`/partenaire/${token}`);
  pBack(token, "ok", "Stock de linge propre mis à jour.", "linge");
}

export async function partnerRoomsAction(token: string, listing: string, fd: FormData) {
  if (!isToken(token)) redirect("/nettoyeur");
  const rooms = String(fd.get("rooms") ?? "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 20);
  const { error } = await agentClient().rpc("partner_set_rooms", { p_secret: token, p_listing: listing, p_rooms: rooms });
  if (error) pBack(token, "error", agentMessage(error.message));
  revalidatePath(`/partenaire/${token}`);
  pBack(token, "ok", rooms.length ? "Pièces enregistrées : le nettoyeur photographiera chacune, avant et après." : "Liste vidée : les pièces du guide ou la liste standard seront utilisées.");
}

/** Points d'attention ajoutés par le propriétaire ou la conciergerie (un par ligne) : le guide existant est conservé. */
export async function partnerAttentionAction(token: string, listing: string, fd: FormData) {
  if (!isToken(token)) redirect("/nettoyeur");
  const attention = String(fd.get("attention") ?? "").split("\n").map((x) => x.trim().slice(0, 160)).filter(Boolean).slice(0, 8);
  const c = agentClient();
  const cur = await c.rpc("partner_guide", { p_secret: token, p_listing: listing });
  if (cur.error) pBack(token, "error", agentMessage(cur.error.message));
  const g = ((cur.data as { summary?: string; rooms?: unknown[] } | null) ?? { summary: "", rooms: [] });
  const up = await c.rpc("partner_set_guide", { p_secret: token, p_listing: listing, p_guide: { summary: g.summary ?? "", rooms: g.rooms ?? [], attention } });
  if (up.error) pBack(token, "error", agentMessage(up.error.message));
  revalidatePath(`/partenaire/${token}`);
  pBack(token, "ok", attention.length ? "Points d'attention enregistrés : le nettoyeur et l'IA en tiennent compte." : "Points d'attention retirés.");
}

/** Référence du logement : l'IA rédige le guide de ménage à partir des images envoyées par la conciergerie. */
export async function partnerAnalyzeAction(token: string, listing: string) {
  if (!isToken(token)) redirect("/nettoyeur");
  const c = agentClient();
  const { data, error } = await c.rpc("partner_ref_for_analysis", { p_secret: token, p_listing: listing });
  if (error) pBack(token, "error", agentMessage(error.message));
  const d = data as { name: string; photos: Img[] };
  if (!d.photos.length) pBack(token, "error", "Ajoutez d'abord des photos ou une vidéo du logement propre.");
  const r = await analyzeReference(d.photos, d.name);
  if (!r.report) pBack(token, "error", "Le guide n'a pas pu être rédigé pour le moment. ProClean est prévenu ; réessayez plus tard.");
  const up = await c.rpc("partner_set_guide", { p_secret: token, p_listing: listing, p_guide: r.report });
  if (up.error) pBack(token, "error", agentMessage(up.error.message));
  revalidatePath(`/partenaire/${token}`);
  pBack(token, "ok", "Guide de ménage rédigé : les nettoyeurs le verront et leurs photos seront comparées à votre référence.");
}

/** Clé d'API : générée ici, affichée une seule fois. Une nouvelle clé remplace l'ancienne. */
export async function partnerApiKeyAction(token: string) {
  if (!isToken(token)) redirect("/nettoyeur");
  const key = `pk_${randomBytes(24).toString("hex")}`;
  const { error } = await agentClient().rpc("partner_set_api_key", { p_secret: token, p_key_hash: sha(key) });
  if (error) pBack(token, "error", agentMessage(error.message));
  cookies().set("partner_key", key, { httpOnly: true, secure: true, sameSite: "strict", path: `/partenaire/${token}`, maxAge: 180 });
  revalidatePath(`/partenaire/${token}`);
  pBack(token, "ok", "Clé créée : copiez-la maintenant, elle ne sera plus affichée.", "api");
}

// ───────────── Connexion unique (e-mail + code) ─────────────
const LOGIN = "/connexion";
type Space = { kind: "nettoyeur" | "attente" | "agent" | "linge" | "partenaire" | "gestion"; label: string; path: string };
type Role = { kind: Space["kind"]; id: string | null; label: string };

/** Ouvre les espaces d'une personne sur cet appareil (un jeton par espace) et les mémorise à côté de ceux déjà connus. */
async function openSpaces(email: string, roles: Role[]): Promise<never> {
  const a = automationClient(), secret = automationSecret();
  const spaces: Space[] = [];
  for (const r of roles.slice(0, 8)) {
    if (r.kind === "gestion") { spaces.push({ kind: "gestion", label: r.label, path: "/" }); continue; }
    const token = randomBytes(32).toString("hex");
    const { error } = await a.rpc("automation_issue_token", { p_secret: secret, p_kind: r.kind, p_subject: r.id, p_token_hash: sha(token) });
    if (!error) spaces.push({ kind: r.kind, label: r.label, path: r.kind === "attente" ? `/nettoyeur/attente/${token}` : `/${r.kind}/${token}` });
  }
  const jar = cookies();
  // L'appareil garde les espaces déjà mémorisés : une autre adresse en ajoute, elle ne remplace pas.
  let kept: Space[] = [];
  try { const v = JSON.parse(jar.get("pc_spaces")?.value ?? "null") as { spaces?: Space[] } | null; kept = (v?.spaces ?? []).filter((k) => !spaces.some((n) => (n.kind === k.kind || (n.kind === "nettoyeur" && k.kind === "attente")) && n.label === k.label)); } catch { kept = []; }
  jar.delete({ name: "pc_login_email", path: LOGIN });
  jar.set("pc_spaces", JSON.stringify({ email, spaces: [...spaces, ...kept].slice(0, 12) }), { httpOnly: true, secure: true, sameSite: "lax", path: LOGIN, maxAge: 60 * 86400 });
  return redirect(spaces.length === 1 && spaces[0]!.kind !== "gestion" && !kept.length ? spaces[0]!.path : `${LOGIN}?choisir=1`);
}
const codeHash = (email: string, code: string) => sha(`${email}:${code}`);
const validMail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

/** Étape 1 : l'adresse e-mail. Un code à 6 chiffres part par e-mail si l'adresse a au moins un espace. La réponse est la même dans tous les cas. */
export async function loginStartAction(fd: FormData) {
  if (String(fd.get("website") ?? "") !== "") redirect(LOGIN);
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!validMail(email)) redirect(`${LOGIN}?error=${encodeURIComponent("Indiquez une adresse e-mail valide.")}`);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  let sent = "aucun";
  try {
    const { data } = await automationClient().rpc("automation_login_start", { p_secret: automationSecret(), p_email: email, p_code_hash: codeHash(email, code) });
    sent = String(data ?? "aucun");
  } catch { /* même réponse */ }
  if (sent === "envoye" && mailConfigured()) {
    await sendMail({ to: email, subject: `${code} — votre code ProClean`, text: `Votre code de connexion ProClean : ${code}\n\nIl est valable 10 minutes. Si vous n'avez pas demandé ce code, ignorez ce message.\n\nProClean Empire` }).catch(() => undefined);
  }
  cookies().set("pc_login_email", email, { httpOnly: true, secure: true, sameSite: "lax", path: LOGIN, maxAge: 900 });
  redirect(`${LOGIN}?etape=code${sent === "trop" ? `&error=${encodeURIComponent("Trop de demandes : réessayez dans une heure, ou utilisez le dernier code reçu.")}` : ""}`);
}

/** Étape 2 : le code. S'il est bon, cet appareil reçoit un jeton pour chacun des espaces de la personne. */
export async function loginVerifyAction(fd: FormData) {
  const email = cookies().get("pc_login_email")?.value ?? "";
  const code = String(fd.get("code") ?? "").replace(/\D/g, "");
  if (!validMail(email)) redirect(LOGIN);
  if (code.length !== 6) redirect(`${LOGIN}?etape=code&error=${encodeURIComponent("Le code comporte 6 chiffres.")}`);
  const pass = String(fd.get("password") ?? "");
  if (pass && !passwordOk(pass)) redirect(`${LOGIN}?etape=code&error=${encodeURIComponent("Le mot de passe doit faire au moins 8 caractères (ou laissez la case vide).")}`);
  const a = automationClient(), secret = automationSecret();
  const { data } = await a.rpc("automation_login_verify", { p_secret: secret, p_email: email, p_code_hash: codeHash(email, code) });
  const roles = (data ?? null) as Role[] | null;
  if (!roles || !roles.length) redirect(`${LOGIN}?etape=code&error=${encodeURIComponent("Code incorrect ou expiré. Vérifiez-le, ou demandez-en un nouveau.")}`);
  // Le code vient de prouver que l'adresse est bien la sienne : c'est le seul moment où un mot de passe peut être créé ou changé.
  if (pass) await a.rpc("automation_password_set", { p_secret: secret, p_email: email, p_hash: hashPassword(pass) });
  await openSpaces(email, roles!);
}

/** Connexion avec un mot de passe : celui choisi après un code (nettoyeur, agent, livreur, conciergerie), ou celui de l'espace de gestion et de l'espace comptable. */
export async function loginPasswordAction(fd: FormData) {
  const bad = (): never => redirect(`${LOGIN}?mode=mdp&error=${encodeURIComponent("E-mail ou mot de passe incorrect. Après 5 erreurs, la connexion par mot de passe est bloquée 15 minutes : utilisez alors le code par e-mail.")}`);
  if (String(fd.get("website") ?? "") !== "") redirect(LOGIN);
  const email = String(fd.get("email") ?? "").trim().toLowerCase(), pass = String(fd.get("password") ?? "");
  if (!validMail(email) || !pass) bad();
  const a = automationClient(), secret = automationSecret();
  let roles: Role[] | null = null;
  try {
    const { data: stored } = await a.rpc("automation_password_get", { p_secret: secret, p_email: email });
    if (typeof stored === "string") {
      const { data } = await a.rpc("automation_password_result", { p_secret: secret, p_email: email, p_ok: verifyPassword(pass, stored) });
      roles = (data ?? null) as Role[] | null;
    }
  } catch { roles = null; }
  const field = (roles ?? []).filter((r) => r.kind !== "gestion");
  if (field.length) await openSpaces(email, field);
  // Espace de gestion et espace comptable : leur propre mot de passe.
  const { error } = await createClient().auth.signInWithPassword({ email, password: pass });
  if (error) bad();
  redirect("/");
}

/** Déconnexion de cet appareil : ses jetons cessent de fonctionner. */
export async function logoutAction() {
  const jar = cookies();
  try {
    const v = JSON.parse(jar.get("pc_spaces")?.value ?? "null") as { spaces?: Space[] } | null;
    const hashes = (v?.spaces ?? []).map((s) => /^\/[a-z]+\/([0-9a-f]{64})$/.exec(s.path)?.[1]).filter((t): t is string => !!t).map(sha);
    if (hashes.length) await automationClient().rpc("automation_revoke_tokens", { p_secret: automationSecret(), p_hashes: hashes });
  } catch { /* on déconnecte quand même */ }
  jar.delete({ name: "pc_spaces", path: LOGIN });
  jar.delete({ name: "pc_login_email", path: LOGIN });
  redirect(`${LOGIN}?bye=1`);
}

/* ───────── Messagerie par ménage, signalement de problème, avis ───────── */
const siteUrl = () => `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "proclean-crm.vercel.app"}`;
const adminTo = () => process.env.MAIL_ADMIN ?? "contact@procleanempire.com";
const clientEmail = async (clientId: string | null) => {
  if (!clientId || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { data } = await createAdmin().from("clients").select("email").eq("id", clientId).maybeSingle();
  return (data?.email as string | null) ?? null;
};
const back = (path: string, kind: "ok" | "error", msg: string): never => redirect(`${path}?${kind}=${encodeURIComponent(msg)}`);

export async function cleanerPostMessageAction(token: string, jobId: string, fd: FormData) {
  guard(token);
  const path = base(token, `/menage/${jobId}`);
  const body = String(fd.get("body") ?? "").trim();
  if (!body) return back(path, "error", "Écrivez un message.");
  const { data, error } = await agentClient().rpc("cleaner_post_message", { p_token: token, p_job: jobId, p_body: body });
  if (error) return back(path, "error", agentMessage(error.message));
  const r = data as { title: string; client_id: string | null; name: string };
  if (mailConfigured()) {
    const text = `${r.name} a écrit à propos de « ${r.title} » :\n\n${body}\n\n(Répondez depuis votre espace ProClean.)`;
    await sendMail({ to: adminTo(), subject: `Message du nettoyeur — ${r.title}`, text }).catch(() => undefined);
    const to = await clientEmail(r.client_id);
    if (to) await sendMail({ to, subject: `Message du nettoyeur — ${r.title}`, text: `${text}\n\n${siteUrl()}` }).catch(() => undefined);
  }
  revalidatePath(path);
  return back(path, "ok", "Message envoyé.");
}

export async function cleanerReportProblemAction(token: string, jobId: string, fd: FormData) {
  guard(token);
  const path = base(token, `/menage/${jobId}`);
  const { data, error } = await agentClient().rpc("cleaner_report_problem", { p_token: token, p_job: jobId, p_kind: String(fd.get("kind") ?? "autre"), p_text: String(fd.get("text") ?? "") });
  if (error) return back(path, "error", agentMessage(error.message));
  const r = data as { title: string; client_id: string | null; name: string; label: string };
  if (mailConfigured()) {
    const text = `${r.name} signale un problème : ${r.label}\nMénage : ${r.title}\n\n${String(fd.get("text") ?? "").trim()}\n\nL'anomalie est ouverte dans le CRM (Missions › Problèmes).`;
    await sendMail({ to: adminTo(), subject: `⚠️ Problème signalé — ${r.title}`, text }).catch(() => undefined);
    const to = await clientEmail(r.client_id);
    if (to) await sendMail({ to, subject: `Problème signalé — ${r.title}`, text }).catch(() => undefined);
  }
  revalidatePath(path);
  return back(path, "ok", "Problème signalé. La direction est prévenue.");
}

export async function partnerPostMessageAction(token: string, jobId: string, fd: FormData) {
  guard(token);
  const path = `/partenaire/${token}/menage/${jobId}`;
  const body = String(fd.get("body") ?? "").trim();
  if (!body) return back(path, "error", "Écrivez un message.");
  const { data, error } = await agentClient().rpc("partner_post_message", { p_secret: token, p_job: jobId, p_body: body });
  if (error) return back(path, "error", agentMessage(error.message));
  const r = data as { title: string; cleaner_email: string | null; cleaner_name: string | null; client: string };
  if (mailConfigured()) {
    const text = `${r.client} a écrit à propos de « ${r.title} » :\n\n${body}\n\nRépondez depuis votre application : ${siteUrl()}/nettoyeur\n\nProClean Empire`;
    if (r.cleaner_email) await sendMail({ to: r.cleaner_email, subject: `Message de la conciergerie — ${r.title}`, text }).catch(() => undefined);
    await sendMail({ to: adminTo(), subject: `Message de la conciergerie — ${r.title}`, text }).catch(() => undefined);
  }
  revalidatePath(path);
  return back(path, "ok", "Message envoyé.");
}

export async function partnerRateAction(token: string, jobId: string, fd: FormData) {
  guard(token);
  const path = `/partenaire/${token}/menage/${jobId}`;
  const { error } = await agentClient().rpc("partner_rate_job", { p_secret: token, p_job: jobId, p_rating: Number(fd.get("rating")), p_comment: String(fd.get("comment") ?? "") });
  if (error) return back(path, "error", agentMessage(error.message));
  revalidatePath(path);
  return back(path, "ok", "Merci, votre avis est enregistré.");
}

/** Réponse de la direction dans le fil d'un ménage (CRM). */
export async function adminPostMessageAction(jobId: string, fd: FormData) {
  const body = String(fd.get("body") ?? "").trim();
  if (!body) return;
  const db = createClient();
  const { error } = await db.from("cleaning_messages").insert({ job_id: jobId, role: "admin", author: "ProClean", body: body.slice(0, 1000) });
  if (error) redirect(`/nettoyeurs/messages?error=${encodeURIComponent("Envoi impossible.")}`);
  if (mailConfigured()) {
    const { data: j } = await db.from("cleaning_jobs").select("title, cleaner_id").eq("id", jobId).maybeSingle();
    if (j?.cleaner_id) {
      const { data: c } = await db.from("cleaners").select("email").eq("id", j.cleaner_id).maybeSingle();
      if (c?.email) await sendMail({ to: c.email as string, subject: `Message de ProClean — ${j.title}`, text: `ProClean Empire vous a écrit à propos de « ${j.title} » :\n\n${body}\n\nRépondre : ${siteUrl()}/nettoyeur\n\nProClean Empire` }).catch(() => undefined);
    }
  }
  revalidatePath("/nettoyeurs/messages");
}

/** Demande de suppression du compte, lancée depuis l'application (exigée par les stores). Traitée sous 30 jours ; les factures et virements restent conservés comme la loi l'impose. */
export async function cleanerDeleteRequestAction(token: string, fd: FormData) {
  guard(token);
  const path = base(token, "/profil");
  if (String(fd.get("confirm") ?? "") !== "1") return back(path, "error", "Cochez la case pour confirmer la demande.");
  const { data, error } = await agentClient().rpc("cleaner_overview", { p_token: token });
  if (error) return back(path, "error", agentMessage(error.message));
  const o = data as { name: string; email: string };
  let saved = false;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const sb = createAdmin();
    const { data: c } = await sb.from("cleaners").select("id, note").eq("email", o.email).maybeSingle();
    if (c) {
      const stamp = `SUPPRESSION DEMANDÉE le ${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`;
      if (!String(c.note ?? "").includes(stamp)) saved = !(await sb.from("cleaners").update({ note: [c.note, stamp].filter(Boolean).join("\n") }).eq("id", c.id)).error;
      else saved = true;
    }
  }
  let mailed = false;
  if (mailConfigured()) {
    mailed = await sendMail({ to: adminTo(), subject: `Suppression de compte demandée — ${o.name}`, text: `${o.name} (${o.email}) demande la suppression de son compte nettoyeur depuis l'application. À traiter sous 30 jours : supprimer le compte et les données personnelles, en gardant seulement ce que la loi impose (factures, virements).` }).then(() => true).catch(() => false);
    if (o.email) await sendMail({ to: o.email, subject: "Votre demande de suppression de compte", text: `Bonjour,\n\nNous avons bien reçu votre demande de suppression de compte. Elle sera traitée sous 30 jours. Les factures et virements sont conservés aussi longtemps que la loi l'impose.\n\nL'équipe ProClean Empire` }).catch(() => undefined);
  }
  if (!saved && !mailed) return back(path, "error", "La demande n'a pas pu être enregistrée. Écrivez-nous à contact@procleanempire.com.");
  return back(path, "ok", "Demande reçue. Votre compte sera supprimé sous 30 jours.");
}
