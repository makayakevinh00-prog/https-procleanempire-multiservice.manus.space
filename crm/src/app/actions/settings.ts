"use server";

import { requireOwner } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash, numField, str } from "@/lib/data";

export async function saveSettingsAction(fd: FormData) {
  await requireOwner();
  const n = (k: string, fallback: number) => numField(fd, k) ?? fallback;
  const green = n("recruit_green_max_hours", 30);
  const orange = n("recruit_orange_max_hours", 35);
  const month = str(fd, "auto_invoicing_start_month") ?? "2026-11";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) flash("/parametres", "error", "Premier mois facturé : format AAAA-MM (ex. 2026-11).");
  if (green >= orange) flash("/parametres", "error", "Le seuil vert doit être inférieur au seuil orange.");
  const { error } = await createClient().from("app_settings").update({
    company_name: str(fd, "company_name") ?? "ProClean Empire", company_address: str(fd, "company_address"),
    company_siret: str(fd, "company_siret"), company_vat_number: str(fd, "company_vat_number"), company_iban: str(fd, "company_iban"), company_bic: str(fd, "company_bic"),
    company_phone: str(fd, "company_phone"), company_email: str(fd, "company_email"),
    default_vat_rate: n("default_vat_rate", 20), payment_terms_days: Math.round(n("payment_terms_days", 30)),
    large_amount_threshold_ht: n("large_amount_threshold_ht", 1500), unpaid_alert_days: Math.round(n("unpaid_alert_days", 15)), reminder_manual_days: Math.max(Math.round(n("reminder_manual_days", 30)), Math.round(n("unpaid_alert_days", 15)) + 1),
    billing_requires_validation: checked(fd, "billing_requires_validation"),
    auto_reminders_enabled: checked(fd, "auto_reminders_enabled"), reminder_first_after_days: Math.round(n("reminder_first_after_days", 7)),
    reminder_interval_days: Math.round(n("reminder_interval_days", 14)), reminder_max_count: Math.round(n("reminder_max_count", 3)),
    indep_hourly_cost: n("indep_hourly_cost", 22), salarie_gross_hourly: n("salarie_gross_hourly", 12.02),
    salarie_employer_charges_pct: n("salarie_employer_charges_pct", 42), salarie_paid_leave_pct: n("salarie_paid_leave_pct", 10),
    recruit_green_max_hours: green, recruit_orange_max_hours: orange,
    company_legal_form: str(fd, "company_legal_form"), company_capital: str(fd, "company_capital"), company_rcs: str(fd, "company_rcs"), company_footer: str(fd, "company_footer"),
    quote_default_validity_days: Math.round(n("quote_default_validity_days", 30)), quote_terms: str(fd, "quote_terms"), notify_email: str(fd, "notify_email"),
    quote_followup_enabled: checked(fd, "quote_followup_enabled"), quote_followup_days: Math.round(n("quote_followup_days", 5)),
    quote_followup2_days: Math.round(n("quote_followup2_days", 12)), quote_expire_enabled: checked(fd, "quote_expire_enabled"), auto_planning_enabled: checked(fd, "auto_planning_enabled"),
    auto_invoicing_enabled: checked(fd, "auto_invoicing_enabled"), auto_invoicing_start_month: month,
    count_planned_as_done: checked(fd, "count_planned_as_done"), month_end_send_next_day: checked(fd, "month_end_send_next_day"),
    updated_at: new Date().toISOString()
  }).eq("id", true);
  if (error) flash("/parametres", "error", dbMessage(error));
  revalidatePath("/", "layout");
  flash("/parametres", "ok", "Paramètres enregistrés.");
}
