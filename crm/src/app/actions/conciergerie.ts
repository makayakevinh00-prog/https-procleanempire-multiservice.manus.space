"use server";

import { requireAccess } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, numField, str } from "@/lib/data";
import { parisToday } from "@/lib/domain/dates";
import { publishPendingNow } from "@/lib/marketplace/sync";
import { PLATFORMS, checkIcalUrl, type Platform } from "@/lib/concierge/ical";
import {
  createCommissionDraft,
  runConcierge,
  scheduleCleanings,
  syncListing,
} from "@/lib/concierge/run";

const back = (tab: string) => `/conciergerie?tab=${tab}`;
const done = (tab: string, msg: string) => {
  revalidatePath("/conciergerie");
  flash(back(tab), "ok", msg);
};

export async function saveListingAction(id: string | null, fd: FormData) {
  await requireAccess("conciergerie");
  const name = str(fd, "name");
  let clientId = str(fd, "client_id");
  const sb0 = createClient();
  // Nouveau propriétaire saisi dans le même formulaire : la fiche client est créée (ou retrouvée par son nom) sans quitter la page.
  const ownerName = str(fd, "owner_name");
  if (!clientId && ownerName) {
    const ins = await sb0.from("clients").insert({ name: ownerName, kind: "particulier", status: "actif", email: str(fd, "owner_email"), phone: str(fd, "owner_phone") }).select("id").single();
    if (ins.error?.code === "23505") {
      const ex = await sb0.from("clients").select("id").ilike("name", ownerName).maybeSingle();
      clientId = (ex.data as any)?.id ?? null;
    } else if (ins.error) flash(back("logements"), "error", dbMessage(ins.error));
    else clientId = (ins.data as any).id;
  }
  if (!name || !clientId)
    flash(
      back("logements"),
      "error",
      "Le nom du logement et le propriétaire sont obligatoires (choisissez-en un ou saisissez un nouveau nom).",
    );
  const url = str(fd, "ical_url");
  if (url) {
    const c = checkIcalUrl(url);
    if (!c.ok) flash(back("logements"), "error", c.reason);
  }
  const platform = (str(fd, "platform") ?? "airbnb") as Platform;
  const time = str(fd, "checkout_time");
  const hours = numField(fd, "cleaning_hours"),
    price = numField(fd, "cleaning_price_ht");
  // Commission de gestion saisie ici : un contrat à pourcentage est créé pour ce propriétaire (une seule fois).
  let contractId = str(fd, "contract_id");
  const pct = numField(fd, "commission_pct");
  if (!contractId && pct != null && pct > 0 && pct <= 100) {
    const k = await sb0.from("contracts").insert({ client_id: clientId!, label: `Gestion locative — ${name}`, billing_mode: "autre", commission_pct: pct, status: "actif", activity: "gestion_locative" }).select("id").single();
    if (k.error) flash(back("logements"), "error", dbMessage(k.error));
    contractId = (k.data as any).id;
  }
  const row = {
    name: name!,
    client_id: clientId!,
    contract_id: contractId,
    platform: platform in PLATFORMS ? platform : "airbnb",
    ical_url: url,
    checkout_time: time && /^\d{2}:\d{2}$/.test(time) ? time : "11:00",
    cleaning_hours: hours != null && hours > 0 ? hours : null,
    cleaning_price_ht: price != null && price >= 0 ? price : null,
    staff_id: str(fd, "staff_id"),
    auto_cleaning: checked(fd, "auto_cleaning"),
    updated_at: new Date().toISOString(),
  };
  const sb = createClient();
  const { data, error } = id
    ? await sb
        .from("concierge_listings")
        .update(row)
        .eq("id", id)
        .select("id, ical_url, platform")
        .single()
    : await sb
        .from("concierge_listings")
        .insert(row)
        .select("id, ical_url, platform")
        .single();
  if (error) flash(back("logements"), "error", dbMessage(error));
  let note = "";
  if (data!.ical_url) {
    const today = parisToday();
    const s = await syncListing(sb, data as any, today);
    if (s.error) note = ` Synchronisation impossible : ${s.error}.`;
    else {
      const p = await scheduleCleanings(sb, today);
      note = ` ${s.stays} réservation(s) importée(s), ${p.created} ménage(s) créé(s).`;
    }
  }
  const pub = await publishPendingNow();
  if (pub.published) note += ` ${pub.published} ménage(s) publié(s) aux nettoyeurs.`;
  done(
    "logements",
    `${id ? "Logement mis à jour." : "Logement ajouté."}${note}`,
  );
}

/** Supprime le logement ; ses ménages à venir encore non commencés sont annulés pour ne pas rester orphelins au planning. */
export async function deleteListingAction(id: string) {
  await requireAccess("conciergerie");
  const sb = createClient();
  const { data: stays } = await sb
    .from("concierge_stays")
    .select("id")
    .eq("listing_id", id);
  const keys = (stays ?? []).map((s: any) => `conc:${s.id}`);
  if (keys.length)
    await sb
      .from("interventions")
      .update({ stage: "annulee" })
      .in("source_key", keys)
      .in("stage", ["brouillon", "planifiee", "affectee"])
      .gte("scheduled_date", parisToday());
  const { error } = await sb.from("concierge_listings").delete().eq("id", id);
  if (error) flash(back("logements"), "error", dbMessage(error));
  done(
    "logements",
    "Logement supprimé ; ses ménages à venir non commencés ont été annulés.",
  );
}

export async function syncListingNowAction(id: string) {
  await requireAccess("conciergerie");
  const sb = createClient();
  const { data: l } = await sb
    .from("concierge_listings")
    .select("id, ical_url, platform")
    .eq("id", id)
    .maybeSingle();
  if (!l?.ical_url)
    flash(
      back("logements"),
      "error",
      "Ce logement n'a pas de lien calendrier.",
    );
  const today = parisToday();
  const s = await syncListing(sb, l as any, today);
  if (s.error) done("logements", `Synchronisation impossible : ${s.error}.`);
  const p = await scheduleCleanings(sb, today);
  const pub = await publishPendingNow();
  done(
    "logements",
    `${s.stays} réservation(s) lue(s) ; ${p.created} ménage(s) créé(s), ${p.moved} déplacé(s), ${p.cancelled} annulé(s)${pub.published ? `, ${pub.published} publié(s) aux nettoyeurs` : ""}.`,
  );
}

export async function runAllAction() {
  await requireAccess("conciergerie");
  const r: any = await runConcierge(createClient(), parisToday());
  if (r.skipped)
    flash(
      back("automatisations"),
      "error",
      "La conciergerie n'est pas encore installée en base.",
    );
  const pub = await publishPendingNow();
  const bits = [
    pub.published ? `${pub.published} ménage(s) publié(s) aux nettoyeurs` : null,
    r.sync && `${r.sync.stays} réservation(s) lue(s)`,
    r.menages && `${r.menages.created} ménage(s) créé(s)`,
    r.messages && `${r.messages.proposed} message(s) à valider`,
    r.facturation && `${r.facturation.drafts} brouillon(s) de commission`,
  ].filter(Boolean);
  done(
    "automatisations",
    `Automatisations exécutées : ${bits.join(", ") || "rien à faire"}.`,
  );
}

export async function toggleAutomationAction(key: string, enabled: boolean) {
  await requireAccess("conciergerie");
  if (!["menages", "facturation", "messages"].includes(key))
    flash(back("automatisations"), "error", "Automatisation inconnue.");
  const { error } = await createClient()
    .from("concierge_automations")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) flash(back("automatisations"), "error", dbMessage(error));
  done(
    "automatisations",
    enabled ? "Automatisation activée." : "Automatisation désactivée.",
  );
}

export async function saveRevenueAction(
  contractId: string,
  month: string,
  fd: FormData,
) {
  await requireAccess("conciergerie");
  const v = numField(fd, "revenue_ht");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    flash(back("revenus"), "error", "Mois invalide.");
  const sb = createClient();
  if (v == null || v < 0) {
    await sb
      .from("concierge_revenues")
      .delete()
      .eq("contract_id", contractId)
      .eq("month", month)
      .is("invoice_id", null);
    done("revenus", "Revenus effacés.");
  }
  const { error } = await sb
    .from("concierge_revenues")
    .upsert(
      {
        contract_id: contractId,
        month,
        revenue_ht: v!,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "contract_id,month" },
    );
  if (error)
    flash(`/conciergerie?tab=revenus&m=${month}`, "error", dbMessage(error));
  revalidatePath("/conciergerie");
  flash(`/conciergerie?tab=revenus&m=${month}`, "ok", "Revenus enregistrés.");
}

export async function createCommissionDraftAction(
  contractId: string,
  month: string,
) {
  await requireAccess("conciergerie");
  const r = await createCommissionDraft(createClient(), contractId, month);
  if (!r.ok) flash(`/conciergerie?tab=revenus&m=${month}`, "error", r.error);
  revalidatePath("/conciergerie");
  revalidatePath("/factures");
  flash(
    `/factures/${r.invoiceId}`,
    "ok",
    "Brouillon de commission créé : relisez-le puis validez-le.",
  );
}


// ───────────── Veille par logement : prix par période, marché, avis, améliorations ─────────────
const watch = (id: string) => `/conciergerie/veille/${id}`;
const watched = (id: string, kind: "ok" | "error", msg: string): never => { revalidatePath(watch(id)); return flash(watch(id), kind, msg); };
const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const money = (fd: FormData, k: string) => { const v = String(fd.get(k) ?? "").replace(",", ".").trim(); return v === "" || !(Number(v) >= 0) ? null : Math.round(Number(v) * 100) / 100; };

/** Lien de l'annonce et prix de base d'une nuit (utilisé hors période). */
export async function saveListingWatchAction(id: string, fd: FormData) {
  await requireAccess("conciergerie");
  const url = str(fd, "public_url");
  if (url && !/^https:\/\//.test(url)) watched(id, "error", "Le lien de l'annonce doit commencer par https://");
  const { error } = await createClient().from("concierge_listings").update({ public_url: url, base_price: money(fd, "base_price") }).eq("id", id);
  if (error) watched(id, "error", dbMessage(error));
  watched(id, "ok", "Enregistré.");
}

export async function addPricePeriodAction(id: string, fd: FormData) {
  await requireAccess("conciergerie");
  const label = str(fd, "label"), start = str(fd, "start_date"), end = str(fd, "end_date"), price = money(fd, "price");
  if (!label || !isDate(start) || !isDate(end) || price == null) watched(id, "error", "Indiquez un nom, les deux dates et le prix de la nuit.");
  if (end! < start!) watched(id, "error", "La date de fin doit être après la date de début.");
  const nights = Number(fd.get("min_nights") ?? 0);
  const { error } = await createClient().from("listing_prices").insert({ listing_id: id, label, start_date: start, end_date: end, price, min_nights: nights >= 1 ? Math.round(nights) : null, note: str(fd, "note") });
  if (error) watched(id, "error", dbMessage(error));
  watched(id, "ok", "Période de prix ajoutée. Pensez à reporter ce prix sur Airbnb : le CRM ne peut pas le modifier à votre place.");
}

export async function addMarketPriceAction(id: string, fd: FormData) {
  await requireAccess("conciergerie");
  const label = str(fd, "label"), price = money(fd, "price"), seen = str(fd, "seen_on");
  if (!label || price == null) watched(id, "error", "Indiquez le logement comparé et son prix par nuit.");
  const { error } = await createClient().from("listing_market").insert({ listing_id: id, label, price, seen_on: isDate(seen) ? seen : parisToday(), url: str(fd, "url"), note: str(fd, "note") });
  if (error) watched(id, "error", dbMessage(error));
  watched(id, "ok", "Prix relevé ajouté.");
}

export async function addReviewAction(id: string, fd: FormData) {
  await requireAccess("conciergerie");
  const rating = Number(String(fd.get("rating") ?? "").replace(",", ".")), comment = str(fd, "comment"), date = str(fd, "review_date");
  if (!(rating >= 1 && rating <= 5) && !comment) watched(id, "error", "Indiquez une note (1 à 5) ou un commentaire.");
  const topics = fd.getAll("topics").map(String).filter((t) => /^[a-z]{3,20}$/.test(t)).slice(0, 9);
  const { error } = await createClient().from("listing_reviews").insert({ listing_id: id, review_date: isDate(date) ? date : parisToday(), source: str(fd, "source") ?? "airbnb", guest: str(fd, "guest"), rating: rating >= 1 && rating <= 5 ? rating : null, comment, topics });
  if (error) watched(id, "error", dbMessage(error));
  watched(id, "ok", "Avis ajouté.");
}

export async function addImprovementAction(id: string, fd: FormData) {
  await requireAccess("conciergerie");
  const title = str(fd, "title");
  if (!title) watched(id, "error", "Décrivez l'amélioration en quelques mots.");
  const priority = ["basse", "normale", "haute"].includes(String(fd.get("priority"))) ? String(fd.get("priority")) : "normale";
  const { error } = await createClient().from("listing_improvements").insert({ listing_id: id, title, detail: str(fd, "detail"), priority, cost: money(fd, "cost") });
  if (error) watched(id, "error", dbMessage(error));
  watched(id, "ok", "Amélioration ajoutée.");
}

export async function setImprovementStatusAction(id: string, rowId: string, status: "a_faire" | "en_cours" | "fait") {
  await requireAccess("conciergerie");
  const { error } = await createClient().from("listing_improvements").update({ status, done_at: status === "fait" ? new Date().toISOString() : null }).eq("id", rowId).eq("listing_id", id);
  if (error) watched(id, "error", dbMessage(error));
  watched(id, "ok", status === "fait" ? "Marquée comme faite." : "Mise à jour.");
}

/** Supprime une ligne de la veille (période de prix, prix relevé, avis ou amélioration). */
export async function deleteWatchRowAction(id: string, table: "listing_prices" | "listing_market" | "listing_reviews" | "listing_improvements", rowId: string) {
  await requireAccess("conciergerie");
  if (!["listing_prices", "listing_market", "listing_reviews", "listing_improvements"].includes(table)) watched(id, "error", "Suppression impossible.");
  const { error } = await createClient().from(table).delete().eq("id", rowId).eq("listing_id", id);
  if (error) watched(id, "error", dbMessage(error));
  watched(id, "ok", "Supprimé.");
}
