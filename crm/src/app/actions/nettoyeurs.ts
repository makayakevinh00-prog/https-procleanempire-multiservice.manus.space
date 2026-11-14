"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, numField, str } from "@/lib/data";
import { addDays, parisToday } from "@/lib/domain/dates";
import { sendMail, mailConfigured } from "@/lib/mail";
import { pctsValid } from "@/lib/cleaner-ui";
import { geocode } from "@/lib/zone";
import { dispatchTick } from "@/lib/marketplace/notify";

const BACK = "/nettoyeurs";
const to = (tab: string) => `${BACK}?tab=${tab}`;
const done = (tab: string, msg: string): never => { revalidatePath(BACK); return flash(to(tab), "ok", msg); };
const sha = (c: string) => createHash("sha256").update(c).digest("hex");
const origin = () => { const h = headers(); return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`; };

/** Valide une inscription (ou renouvelle le lien) : un lien privé est créé, envoyé par e-mail si possible, et affiché une seule fois ici. */
async function issueLink(id: string, tab: string, firstTime: boolean) {
  const sb = createClient();
  const { data: c } = await sb.from("cleaners").select("full_name, email, siret").eq("id", id).maybeSingle();
  if (!c) flash(to(tab), "error", "Nettoyeur introuvable.");
  const k = c as any;
  const token = randomBytes(32).toString("hex");
  const { error } = await sb.from("cleaners").update({ status: "actif", token_hash: sha(token), token_set_at: new Date().toISOString(), ...(firstTime ? { approved_at: new Date().toISOString() } : {}) }).eq("id", id);
  if (error) flash(to(tab), "error", dbMessage(error));
  const url = `${origin()}/nettoyeur/${token}`;
  let mailed = false;
  if (mailConfigured()) {
    const r = await sendMail({
      to: k.email, subject: firstTime ? "Votre inscription est validée — ProClean Empire" : "Votre nouveau lien ProClean Empire",
      text: `Bonjour ${String(k.full_name).split(" ")[0]},\n\n${firstTime ? "Votre inscription comme nettoyeur est validée." : "Voici votre nouveau lien personnel (l'ancien ne fonctionne plus)."}\n\nVotre lien personnel : ${url}\n\nGardez-le pour vous : il donne accès à vos ménages et à vos gains. Ajoutez-le à l'écran d'accueil de votre téléphone. Dans Profil, ajoutez votre IBAN pour être payé.\n\nÀ bientôt,\nProClean Empire`
    });
    mailed = r.sent;
  }
  cookies().set("cleaner_link", JSON.stringify({ name: k.full_name, url, mailed }), { httpOnly: true, secure: true, sameSite: "strict", path: BACK, maxAge: 120 });
  revalidatePath(BACK);
  flash(to(tab), "ok", mailed ? `Lien envoyé par e-mail à ${k.full_name}.` : `Lien créé pour ${k.full_name} : copiez-le ci-dessous (e-mail non envoyé).`);
}
export async function approveCleanerAction(id: string) { await requireOwner(); return issueLink(id, "inscriptions", true); }
export async function renewCleanerLinkAction(id: string) { await requireOwner(); return issueLink(id, "nettoyeurs", false); }

export async function setCleanerStatusAction(id: string, status: "refuse" | "suspendu" | "actif") {
  await requireOwner();
  if (!["refuse", "suspendu", "actif"].includes(status)) flash(to("nettoyeurs"), "error", "Statut inconnu.");
  const patch: Record<string, unknown> = { status };
  if (status !== "actif") patch.token_hash = null;                       // le lien cesse de fonctionner tout de suite
  const { error } = await createClient().from("cleaners").update(patch).eq("id", id);
  if (error) flash(to("nettoyeurs"), "error", dbMessage(error));
  if (status === "suspendu") {
    // Ses ménages à venir non commencés repartent en ligne.
    const sb = createClient();
    const { data: js } = await sb.from("cleaning_jobs").select("id, intervention_id").eq("cleaner_id", id).eq("status", "acceptee");
    for (const j of (js ?? []) as any[]) {
      await sb.from("cleaning_jobs").update({ status: "ouverte", cleaner_id: null, accepted_at: null }).eq("id", j.id);
      if (j.intervention_id) await sb.from("interventions").update({ assignee: null }).eq("id", j.intervention_id);
    }
  }
  done(status === "refuse" ? "inscriptions" : "nettoyeurs", status === "actif" ? "Compte réactivé : renvoyez-lui un lien." : status === "suspendu" ? "Compte suspendu : son lien est coupé et ses ménages à venir sont remis en ligne." : "Inscription refusée.");
}

export async function toggleFavoriteAction(fd: FormData) {
  await requireOwner();
  const cleaner = str(fd, "cleaner_id"), client = str(fd, "client_id"), remove = str(fd, "remove") === "1";
  if (!cleaner || !client) flash(to("nettoyeurs"), "error", "Choisissez un propriétaire et un nettoyeur.");
  const sb = createClient();
  const { error } = remove ? await sb.from("cleaner_favorites").delete().eq("cleaner_id", cleaner!).eq("client_id", client!) : await sb.from("cleaner_favorites").upsert({ cleaner_id: cleaner!, client_id: client! });
  if (error) flash(to("nettoyeurs"), "error", dbMessage(error));
  done("nettoyeurs", remove ? "Favori retiré." : "Favori ajouté : il verra d'abord les ménages de ce propriétaire.");
}

type Pub = { sb: ReturnType<typeof createClient>; settings: any; favClients: Set<string> };
async function publishOne(ctx: Pub, interventionId: string): Promise<string | null> {
  const { sb, settings, favClients } = ctx;
  const { data: i } = await sb.from("interventions").select("id, client_id, title, scheduled_date, duration_hours, site_address, source_key, staff_id, assignee, stage, clients(name, address, postal_code, city)").eq("id", interventionId).maybeSingle();
  if (!i) return "Ménage introuvable.";
  const m = i as any;
  if (m.staff_id || m.assignee) return `« ${m.title} » a déjà un agent.`;
  const stay = String(m.source_key ?? "").startsWith("conc:") ? String(m.source_key).slice(5) : null;
  const { data: st } = stay ? await sb.from("concierge_stays").select("listing_id").eq("id", stay).maybeSingle() : { data: null };
  const { data: l } = (st as any)?.listing_id ? await sb.from("concierge_listings").select("id, name, cleaning_price_ht, cleaning_hours, site_id, sites(address, postal_code, city, access_notes)").eq("id", (st as any).listing_id).maybeSingle() : { data: null };
  const L = l as any, site = L?.sites, cl = m.clients;
  const price = L?.cleaning_price_ht != null ? Number(L.cleaning_price_ht) : null;
  if (price == null) return `Prix du ménage manquant pour « ${m.title} » : renseignez-le dans Conciergerie › Logements.`;
  const postal = site?.postal_code ?? cl?.postal_code ?? null;
  if (!postal) return `Code postal manquant pour « ${m.title} » : ajoutez l'adresse du logement ou du propriétaire.`;
  const priority = favClients.has(m.client_id) && settings.priority_minutes > 0 ? new Date(Date.now() + settings.priority_minutes * 60_000).toISOString() : null;
  const { error } = await sb.from("cleaning_jobs").insert({
    intervention_id: m.id, listing_id: L?.id ?? null, client_id: m.client_id, title: m.title.replace(/^Ménage — /, "Ménage — "), job_date: m.scheduled_date,
    window_start: String(settings.window_start).slice(0, 5), window_end: String(settings.window_end).slice(0, 5),
    duration_hours: L?.cleaning_hours ?? m.duration_hours ?? null, city: site?.city ?? cl?.city ?? null, postal_code: postal,
    address: site?.address ?? m.site_address ?? cl?.address ?? null, access_notes: site?.access_notes ?? null, price_ht: price, priority_until: priority
  });
  if (error) return error.code === "23505" ? null : dbMessage(error);
  return null;
}

async function ctx(): Promise<Pub> {
  const sb = createClient();
  const [{ data: s }, { data: f }] = await Promise.all([sb.from("marketplace_settings").select("*").maybeSingle(), sb.from("cleaner_favorites").select("client_id")]);
  return { sb, settings: s ?? { window_start: "11:00", window_end: "14:00", priority_minutes: 120 }, favClients: new Set(((f ?? []) as any[]).map((x) => x.client_id as string)) };
}

export async function publishJobAction(interventionId: string) {
  await requireOwner();
  const err = await publishOne(await ctx(), interventionId);
  if (err) flash(to("demandes"), "error", err);
  done("demandes", "Ménage publié : les nettoyeurs de la zone le voient.");
}

export async function publishAllJobsAction() {
  await requireOwner();
  const c = await ctx();
  const today = parisToday();
  const { data } = await c.sb.from("interventions").select("id").like("source_key", "conc:%").is("staff_id", null).is("assignee", null).gte("scheduled_date", today).lte("scheduled_date", addDays(today, 30)).not("stage", "in", "(annulee,terminee,validee,facturable,facturee)");
  const { data: have } = await c.sb.from("cleaning_jobs").select("intervention_id").not("intervention_id", "is", null);
  const taken = new Set(((have ?? []) as any[]).map((x) => x.intervention_id as string));
  let ok = 0; const errs: string[] = [];
  for (const r of ((data ?? []) as any[]).filter((x) => !taken.has(x.id))) { const e = await publishOne(c, r.id); if (e) errs.push(e); else ok++; }
  revalidatePath(BACK);
  if (!ok && errs.length) flash(to("demandes"), "error", errs[0]);
  flash(to("demandes"), "ok", `${ok} ménage${ok > 1 ? "s" : ""} publié${ok > 1 ? "s" : ""}.${errs.length ? ` ${errs.length} à compléter (prix ou adresse manquant).` : ""}`);
}

export async function cancelJobAction(id: string) {
  await requireOwner();
  const sb = createClient();
  const { data: j } = await sb.from("cleaning_jobs").select("status, intervention_id").eq("id", id).maybeSingle();
  if (!j || !["ouverte", "acceptee", "a_reprendre"].includes((j as any).status)) flash(to("demandes"), "error", "Ce ménage ne peut plus être retiré.");
  await sb.from("cleaning_jobs").update({ status: "annulee" }).eq("id", id);
  if ((j as any).intervention_id) await sb.from("interventions").update({ assignee: null }).eq("id", (j as any).intervention_id);
  done("demandes", "Ménage retiré des demandes.");
}

export async function validateJobAction(id: string) {
  await requireOwner();
  const sb = createClient();
  const { data: j } = await sb.from("cleaning_jobs").select("status, intervention_id").eq("id", id).maybeSingle();
  if (!j || (j as any).status !== "a_verifier") flash(to("demandes"), "error", "Ce ménage n'est pas en attente de vérification.");
  const { error } = await sb.from("cleaning_jobs").update({ status: "validee", validated_at: new Date().toISOString(), validated_by: "direction", departure: "partir" }).eq("id", id);
  if (error) flash(to("demandes"), "error", dbMessage(error));
  if ((j as any).intervention_id) await sb.from("interventions").update({ stage: "validee" }).eq("id", (j as any).intervention_id);
  done("demandes", "Ménage validé : le nettoyeur est autorisé à partir et le ménage entre dans ses gains.");
}

export async function requestRedoAction(id: string, fd: FormData) {
  await requireOwner();
  const note = str(fd, "note");
  if (!note) flash(to("demandes"), "error", "Dites au nettoyeur ce qu'il faut reprendre.");
  const sb = createClient();
  const { error } = await sb.from("cleaning_jobs").update({ status: "a_reprendre", review_note: note, departure: "rester" }).eq("id", id).eq("status", "a_verifier");
  if (error) flash(to("demandes"), "error", dbMessage(error));
  done("demandes", "Demande de reprise envoyée : le nettoyeur voit le motif et doit rester sur place.");
}

export async function saveMarketplaceSettingsAction(fd: FormData) {
  await requireOwner();
  const c = numField(fd, "cleaner_pct"), p = numField(fd, "platform_pct"), l = numField(fd, "logistics_pct");
  if (c == null || p == null || l == null || !pctsValid(c, p, l)) flash(to("reglages"), "error", "Les trois parts doivent faire 100 %, avec 50 à 90 % pour le nettoyeur.");
  const t = (k: string, d: string) => { const v = str(fd, k); return v && /^\d{2}:\d{2}$/.test(v) ? v : d; };
  const ws = t("window_start", "11:00"), we = t("window_end", "14:00"), mx = t("max_end", "16:00");
  if (!(we > ws && mx >= we)) flash(to("reglages"), "error", "Le créneau doit finir après son début, et la fin maximale après la fin prévue.");
  const { error } = await createClient().from("marketplace_settings").update({ auto_validate: checked(fd, "auto_validate"), cleaner_pct: c!, platform_pct: p!, logistics_pct: l!, window_start: ws, window_end: we, max_end: mx, priority_minutes: Math.max(0, Math.min(2880, Math.round(numField(fd, "priority_minutes") ?? 120))), price_studio: Math.max(0, numField(fd, "price_studio") ?? 45), price_t2: Math.max(0, numField(fd, "price_t2") ?? 60), price_t3: Math.max(0, numField(fd, "price_t3") ?? 75), price_maison: Math.max(0, numField(fd, "price_maison") ?? 95), auto_publish: checked(fd, "auto_publish"), auto_payout: checked(fd, "auto_payout"), require_photos: checked(fd, "require_photos"), updated_at: new Date().toISOString() }).eq("id", true);
  if (error) flash(to("reglages"), "error", dbMessage(error));
  done("reglages", "Réglages enregistrés : ils s'appliquent aux prochains ménages publiés.");
}

/** Crée les paiements de la période : une ligne par nettoyeur, avec tous ses ménages validés pas encore payés jusqu'à la fin de la période. */
export async function createPayoutsAction(fd: FormData) {
  await requireOwner();
  const start = str(fd, "start"), end = str(fd, "end");
  if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) flash(to("paiements"), "error", "Choisissez une période valide.");
  const sb = createClient();
  const { data } = await sb.from("cleaning_jobs").select("id, cleaner_id, cleaner_amount").eq("status", "validee").is("payout_id", null).not("cleaner_id", "is", null).lte("validated_at", `${end}T23:59:59+02:00`);
  const by = new Map<string, { ids: string[]; total: number }>();
  for (const j of (data ?? []) as any[]) { const e = by.get(j.cleaner_id) ?? { ids: [], total: 0 }; e.ids.push(j.id); e.total += Number(j.cleaner_amount ?? 0); by.set(j.cleaner_id, e); }
  let n = 0;
  for (const [cleaner, e] of by) {
    if (!(e.total > 0)) continue;
    const { data: p, error } = await sb.from("cleaning_payouts").insert({ cleaner_id: cleaner, period_start: start!, period_end: end!, amount: Math.round(e.total * 100) / 100, jobs: e.ids.length }).select("id").single();
    if (error) flash(to("paiements"), "error", dbMessage(error));
    await sb.from("cleaning_jobs").update({ payout_id: (p as any).id }).in("id", e.ids);
    n++;
  }
  done("paiements", n ? `${n} paiement${n > 1 ? "s" : ""} créé${n > 1 ? "s" : ""} : téléchargez le fichier de virement, virez depuis Qonto, puis marquez-les payés.` : "Rien à payer : aucun ménage validé en attente.");
}

export async function markPayoutPaidAction(id: string) {
  await requireOwner();
  const { error } = await createClient().from("cleaning_payouts").update({ status: "paye", paid_on: parisToday() }).eq("id", id).eq("status", "a_payer");
  if (error) flash(to("paiements"), "error", dbMessage(error));
  done("paiements", "Paiement marqué comme payé : le nettoyeur le voit dans ses gains.");
}

/** Décision de la direction pour le nettoyeur sur place : il peut partir, ou il doit rester. */
export async function setDepartureAction(id: string, decision: "rester" | "partir") {
  await requireOwner();
  if (decision !== "rester" && decision !== "partir") flash(to("demandes"), "error", "Décision inconnue.");
  const { error } = await createClient().from("cleaning_jobs").update({ departure: decision }).eq("id", id).in("status", ["a_verifier", "a_reprendre", "acceptee"]);
  if (error) flash(to("demandes"), "error", dbMessage(error));
  done("demandes", decision === "partir" ? "Le nettoyeur est autorisé à partir." : "Le nettoyeur doit rester sur place.");
}

/** Envoie un de vos agents contrôler le logement sur place : une mission « Contrôle » apparaît dans son application, et le nettoyeur est prié de rester. */
export async function sendControlAction(id: string, fd: FormData) {
  await requireOwner();
  const staff = str(fd, "staff_id");
  if (!staff) flash(to("demandes"), "error", "Choisissez l'agent qui va contrôler.");
  const sb = createClient();
  const { data: j } = await sb.from("cleaning_jobs").select("title, client_id, job_date, address, status, control_intervention_id").eq("id", id).maybeSingle();
  if (!j || !["a_verifier", "a_reprendre"].includes((j as any).status)) flash(to("demandes"), "error", "Ce ménage n'est pas en attente de vérification.");
  const k = j as any;
  if (k.control_intervention_id) flash(to("demandes"), "error", "Un contrôle sur place est déjà demandé pour ce ménage.");
  const { data: i, error } = await sb.from("interventions").insert({
    client_id: k.client_id, title: `Contrôle qualité — ${String(k.title).replace(/^Ménage — /, "")}`, scheduled_date: k.job_date, staff_id: staff, stage: "affectee",
    site_address: k.address, notes: "Vérifier sur place que le ménage est bien fait ; signaler tout défaut. Le nettoyeur attend votre passage.", billable: false
  }).select("id").single();
  if (error) flash(to("demandes"), "error", dbMessage(error));
  await sb.from("cleaning_jobs").update({ control_intervention_id: (i as any).id, departure: "rester" }).eq("id", id);
  done("demandes", "Contrôle sur place demandé : la mission est dans l'application de l'agent et le nettoyeur est prié de rester.");
}

/** Linge : l'entreprise fait laver (« lavé ») puis renvoie (« renvoyé ») ; le nettoyeur récupère et remet en place. */
export async function setLinenStatusAction(jobId: string, status: "lave" | "renvoye") {
  await requireOwner();
  const need = status === "lave" ? "depose" : "lave";
  if (status !== "lave" && status !== "renvoye") flash(to("draps"), "error", "Étape inconnue.");
  const { error, data } = await createClient().from("cleaning_linen").update({ status, updated_at: new Date().toISOString() }).eq("job_id", jobId).eq("status", need).select("id");
  if (error) flash(to("draps"), "error", dbMessage(error));
  if (!data?.length) flash(to("draps"), "error", status === "lave" ? "Les draps doivent d'abord être déposés par le nettoyeur." : "Les draps doivent d'abord être marqués comme lavés.");
  done("draps", status === "lave" ? "Draps marqués comme lavés." : "Draps renvoyés : le nettoyeur peut les récupérer.");
}

/** Accepte une réservation : le client est retrouvé (par e-mail) ou créé, le ménage est publié aux nettoyeurs de la zone, et le client reçoit la confirmation. */
export async function acceptBookingAction(id: string, fd: FormData) {
  await requireOwner();
  const sb = createClient();
  const { data: b } = await sb.from("cleaning_bookings").select("*").eq("id", id).eq("status", "nouvelle").maybeSingle();
  if (!b) flash(to("reservations"), "error", "Cette réservation n'est plus en attente.");
  const k = b as any;
  const price = numField(fd, "price_ht") ?? Number(k.price_ht);
  if (!(price >= 0)) flash(to("reservations"), "error", "Prix invalide.");
  const { data: set } = await sb.from("marketplace_settings").select("window_start, window_end").maybeSingle();
  let clientId: string | null = ((await sb.from("clients").select("id").ilike("email", k.email).limit(1).maybeSingle()).data as any)?.id ?? null;
  if (!clientId) {
    const ins = await sb.from("clients").insert({ name: k.name, kind: "particulier", status: "actif", email: k.email, phone: k.phone, address: k.address, postal_code: k.postal_code, city: k.city }).select("id").single();
    if (ins.error?.code === "23505") clientId = ((await sb.from("clients").select("id").ilike("name", k.name).limit(1).maybeSingle()).data as any)?.id ?? null;
    else if (ins.error) flash(to("reservations"), "error", dbMessage(ins.error));
    else clientId = (ins.data as any).id;
  }
  if (!clientId) flash(to("reservations"), "error", "Impossible de retrouver ou créer le client.");
  const label = ({ studio: "Studio", t2: "2 pièces", t3: "3 pièces", maison: "Maison" } as Record<string, string>)[k.kind] ?? k.kind;
  const bpt = await geocode({ address: k.address, postal_code: k.postal_code, city: k.city });
  const { data: job, error } = await sb.from("cleaning_jobs").insert({
    lat: bpt?.lat ?? null, lng: bpt?.lng ?? null,
    client_id: clientId!, title: `Ménage — ${label} (${k.city})`, job_date: k.job_date, window_start: String((set as any)?.window_start ?? "11:00").slice(0, 5), window_end: String((set as any)?.window_end ?? "14:00").slice(0, 5),
    city: k.city, postal_code: k.postal_code, address: k.address, access_notes: [k.access_notes, k.note].filter(Boolean).join(" — ") || null, price_ht: price
  }).select("id").single();
  if (error) flash(to("reservations"), "error", dbMessage(error));
  await sb.from("cleaning_bookings").update({ status: "acceptee", job_id: (job as any).id, price_ht: price }).eq("id", id);
  await dispatchTick({ force: true }).catch(() => undefined);
  let mailed = false;
  if (mailConfigured()) {
    const day = new Date(k.job_date + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    const r = await sendMail({ to: k.email, subject: "Votre ménage est confirmé — ProClean Empire", text: `Bonjour ${String(k.name).split(" ")[0]},

Votre ménage (${label}) est confirmé le ${day}, entre ${String((set as any)?.window_start ?? "11:00").slice(0, 5).replace(":", "h")} et ${String((set as any)?.window_end ?? "14:00").slice(0, 5).replace(":", "h")}, à ${k.address}, ${k.postal_code} ${k.city}.\n\nUn nettoyeur va être désigné. Prix : ${price.toLocaleString("fr-FR")} € HT, à régler sur facture après le ménage.\n\nÀ bientôt,\nProClean Empire`.replace(/\\n/g, "\n") });
    mailed = r.sent;
  }
  done("reservations", `Réservation acceptée et publiée aux nettoyeurs de la zone${mailed ? ". Confirmation envoyée au client." : " (e-mail non envoyé : prévenez le client)."}`);
}

export async function refuseBookingAction(id: string) {
  await requireOwner();
  const { error } = await createClient().from("cleaning_bookings").update({ status: "refusee" }).eq("id", id).eq("status", "nouvelle");
  if (error) flash(to("reservations"), "error", dbMessage(error));
  done("reservations", "Réservation refusée : pensez à prévenir le client.");
}

/** Ménage ponctuel (hors calendrier Airbnb) : publié tout de suite aux nettoyeurs de la zone. */
export async function createManualJobAction(fd: FormData) {
  await requireOwner();
  const sb = createClient();
  const clientId = str(fd, "client_id"), date = str(fd, "job_date"), postal = (str(fd, "postal_code") ?? "").replace(/\s/g, ""), price = numField(fd, "price_ht");
  if (!clientId || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !/^\d{5}$/.test(postal) || price == null || !(price >= 0)) flash(to("direct"), "error", "Choisissez le client, la date, le code postal et le prix.");
  const city = str(fd, "city") ?? "", address = str(fd, "address") ?? "";
  const { data: set } = await sb.from("marketplace_settings").select("window_start, window_end").maybeSingle();
  const pt = await geocode({ address, postal_code: postal, city });
  const { error } = await sb.from("cleaning_jobs").insert({
    client_id: clientId, title: str(fd, "title") || `Ménage — ${city || postal}`, job_date: date, window_start: String((set as any)?.window_start ?? "11:00").slice(0, 5), window_end: String((set as any)?.window_end ?? "14:00").slice(0, 5),
    city, postal_code: postal, address, access_notes: str(fd, "access_notes") || null, price_ht: price, lat: pt?.lat ?? null, lng: pt?.lng ?? null
  });
  if (error) flash(to("direct"), "error", dbMessage(error));
  await dispatchTick({ force: true }).catch(() => undefined);
  done("direct", "Ménage publié : il est proposé en priorité aux nettoyeurs en ligne les mieux placés.");
}
