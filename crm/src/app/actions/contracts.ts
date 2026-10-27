"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, flash, numField, str } from "@/lib/data";

function payload(fd: FormData, back: string) {
  const clientId = str(fd, "client_id");
  const label = str(fd, "label");
  if (!clientId || !label) flash(back, "error", "Client et intitulé sont obligatoires.");
  const mode = str(fd, "billing_mode") ?? "mensuel";
  const start = str(fd, "start_date");
  const end = str(fd, "end_date");
  if (start && end && end < start) flash(back, "error", "La date de fin précède la date de début.");
  const hours = numField(fd, "hours_per_visit");
  const visits = numField(fd, "visits_per_week");
  if ((hours !== null && hours <= 0) || (visits !== null && visits <= 0)) flash(back, "error", "Heures et fréquence doivent être positives.");
  return {
    client_id: clientId!, label: label!, billing_mode: mode,
    monthly_amount_ht: mode === "mensuel" ? numField(fd, "monthly_amount_ht") : null,
    per_visit_amount_ht: mode === "passage" ? numField(fd, "per_visit_amount_ht") : null,
    terms: str(fd, "terms"), start_date: start, end_date: end, status: str(fd, "status") ?? "en_cours",
    hours_per_visit: hours, visits_per_week: visits, site_address: str(fd, "site_address"), notes: str(fd, "notes")
  };
}

export async function createContractAction(fd: FormData) {
  const { data, error } = await createClient().from("contracts").insert(payload(fd, "/contrats/new")).select("id").single();
  if (error) flash("/contrats/new", "error", dbMessage(error));
  revalidatePath("/contrats");
  flash(`/contrats/${data!.id}`, "ok", "Contrat créé.");
}

export async function updateContractAction(id: string, fd: FormData) {
  const back = `/contrats/${id}`;
  const { error } = await createClient().from("contracts").update(payload(fd, back)).eq("id", id);
  if (error) flash(back, "error", dbMessage(error));
  revalidatePath("/contrats");
  revalidatePath("/recrutement");
  flash(back, "ok", "Contrat mis à jour.");
}

export async function terminateContractAction(id: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await createClient().from("contracts").update({ status: "resilie", end_date: today }).eq("id", id);
  if (error) flash(`/contrats/${id}`, "error", dbMessage(error));
  revalidatePath("/contrats");
  revalidatePath("/recrutement");
  flash(`/contrats/${id}`, "ok", "Contrat résilié.");
}
