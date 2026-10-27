"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, numField, str } from "@/lib/data";

export async function saveSettingsAction(fd: FormData) {
  const n = (k: string, fallback: number) => numField(fd, k) ?? fallback;
  const green = n("recruit_green_max_hours", 30);
  const orange = n("recruit_orange_max_hours", 35);
  if (green >= orange) flash("/parametres", "error", "Le seuil vert doit être inférieur au seuil orange.");
  const { error } = await createClient().from("app_settings").update({
    company_name: str(fd, "company_name") ?? "ProClean Empire", company_address: str(fd, "company_address"),
    company_siret: str(fd, "company_siret"), company_vat_number: str(fd, "company_vat_number"), company_iban: str(fd, "company_iban"),
    company_phone: str(fd, "company_phone"), company_email: str(fd, "company_email"),
    default_vat_rate: n("default_vat_rate", 20), payment_terms_days: Math.round(n("payment_terms_days", 30)),
    large_amount_threshold_ht: n("large_amount_threshold_ht", 1500), unpaid_alert_days: Math.round(n("unpaid_alert_days", 15)),
    auto_reminders_enabled: checked(fd, "auto_reminders_enabled"), reminder_first_after_days: Math.round(n("reminder_first_after_days", 7)),
    reminder_interval_days: Math.round(n("reminder_interval_days", 14)), reminder_max_count: Math.round(n("reminder_max_count", 3)),
    indep_hourly_cost: n("indep_hourly_cost", 22), salarie_gross_hourly: n("salarie_gross_hourly", 12.02),
    salarie_employer_charges_pct: n("salarie_employer_charges_pct", 42), salarie_paid_leave_pct: n("salarie_paid_leave_pct", 10),
    recruit_green_max_hours: green, recruit_orange_max_hours: orange, updated_at: new Date().toISOString()
  }).eq("id", true);
  if (error) flash("/parametres", "error", dbMessage(error));
  revalidatePath("/", "layout");
  flash("/parametres", "ok", "Paramètres enregistrés.");
}
