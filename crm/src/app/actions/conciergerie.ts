"use server";

import { requireAccess } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, numField, str } from "@/lib/data";
import { parisToday } from "@/lib/domain/dates";
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
  const name = str(fd, "name"),
    clientId = str(fd, "client_id");
  if (!name || !clientId)
    flash(
      back("logements"),
      "error",
      "Le nom du logement et le propriétaire sont obligatoires.",
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
  const row = {
    name: name!,
    client_id: clientId!,
    contract_id: str(fd, "contract_id"),
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
  done(
    "logements",
    `${s.stays} réservation(s) lue(s) ; ${p.created} ménage(s) créé(s), ${p.moved} déplacé(s), ${p.cancelled} annulé(s).`,
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
  const bits = [
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
