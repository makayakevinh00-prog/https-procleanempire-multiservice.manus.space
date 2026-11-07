"use server";

import { requireOwner } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, numField, str } from "@/lib/data";
import { contractVisits, type ScheduleContract } from "@/lib/domain/schedule";
import { monthBounds, monthOf, parisToday } from "@/lib/domain/dates";

const back = (month: string) => `/planning?mois=${month}`;

export async function addInterventionAction(fd: FormData) {
  await requireOwner();
  const date = str(fd, "scheduled_date");
  const clientId = str(fd, "client_id");
  const month = date ? monthOf(date) : monthOf(parisToday());
  if (!clientId || !date) flash(back(month), "error", "Client et date obligatoires.");
  const supabase = createClient();

  // Prestation du catalogue : complète désignation, prix et TVA laissés vides
  let title = str(fd, "title"), price = numField(fd, "unit_price_ht"), vat = numField(fd, "vat_rate"), serviceId = str(fd, "service_id");
  if (serviceId) {
    const { data: s } = await supabase.from("services").select("name, unit_price_ht, vat_rate").eq("id", serviceId).maybeSingle();
    if (s) { title = title ?? s.name; price = price ?? Number(s.unit_price_ht); vat = vat ?? Number(s.vat_rate); }
  }
  if (!title) flash(back(month), "error", "Indiquez une désignation ou choisissez une prestation.");
  const billable = checked(fd, "billable");
  if (billable && price === null) flash(back(month), "error", "Une intervention facturable doit avoir un prix (ou décochez « facturable »).");

  const { error } = await supabase.from("interventions").insert({
    client_id: clientId, service_id: serviceId, title, scheduled_date: date, start_time: str(fd, "start_time"),
    duration_hours: numField(fd, "duration_hours"), assignee: str(fd, "assignee"), quantity: numField(fd, "quantity") ?? 1,
    unit_price_ht: billable ? price : null, vat_rate: vat ?? 20, billable, site_address: str(fd, "site_address"), notes: str(fd, "notes")
  });
  if (error) flash(back(month), "error", dbMessage(error));
  revalidatePath("/planning");
  flash(back(month), "ok", "Intervention ajoutée.");
}

export async function setInterventionStatusAction(id: string, status: "planifie" | "realise" | "annule", month: string) {
  await requireOwner();
  const { error } = await createClient().from("interventions").update({ status }).eq("id", id);
  if (error) flash(back(month), "error", dbMessage(error));
  revalidatePath("/planning");
  flash(back(month), "ok", status === "realise" ? "Marquée réalisée." : status === "annule" ? "Intervention annulée." : "Remise au planning.");
}

export async function deleteInterventionAction(id: string, month: string) {
  await requireOwner();
  const { error } = await createClient().from("interventions").delete().eq("id", id);
  if (error) flash(back(month), "error", dbMessage(error));
  revalidatePath("/planning");
  flash(back(month), "ok", "Intervention supprimée.");
}

/** Crée les passages du mois d'après les jours de la semaine des contrats actifs (sans doublon). */
export async function generateFromContractsAction(month: string) {
  await requireOwner();
  const supabase = createClient();
  const { data: contracts, error } = await supabase.from("contracts").select("*").eq("status", "actif").not("weekdays", "is", null);
  if (error) flash(back(month), "error", dbMessage(error));
  const visits = contractVisits((contracts ?? []).map((k: any) => ({
    ...k, per_visit_amount_ht: k.per_visit_amount_ht == null ? null : Number(k.per_visit_amount_ht),
    hours_per_visit: k.hours_per_visit == null ? null : Number(k.hours_per_visit), weekdays: k.weekdays
  })) as ScheduleContract[], month);
  if (!visits.length) flash(back(month), "error", "Aucun contrat actif avec des jours de passage définis (à renseigner dans la fiche contrat).");
  const { data, error: e2 } = await supabase.from("interventions").upsert(visits, { onConflict: "source_key", ignoreDuplicates: true }).select("id");
  if (e2) flash(back(month), "error", dbMessage(e2));
  revalidatePath("/planning");
  flash(back(month), "ok", `${data?.length ?? 0} passage(s) créé(s) (${visits.length - (data?.length ?? 0)} déjà présent(s)).`);
}

/** Confirme en bloc les passages planifiés dont la date est passée. */
export async function markPastDoneAction(month: string) {
  await requireOwner();
  const { start, end } = monthBounds(month);
  const today = parisToday();
  const upto = end < today ? end : today;
  const { data, error } = await createClient().from("interventions").update({ status: "realise" })
    .eq("status", "planifie").gte("scheduled_date", start).lte("scheduled_date", upto).is("invoice_id", null).select("id");
  if (error) flash(back(month), "error", dbMessage(error));
  revalidatePath("/planning");
  flash(back(month), "ok", `${data?.length ?? 0} intervention(s) marquée(s) réalisée(s).`);
}
