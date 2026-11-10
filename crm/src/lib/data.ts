import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Settings } from "@/lib/domain/types";
import { parseDbError } from "@/lib/domain/billing";

type Supa = ReturnType<typeof createClient>;

/** Colonnes de app_settings lues par l'application. `automation_secret` en est volontairement ABSENT : il ne doit jamais quitter la base. */
export const SETTINGS_COLUMNS =
  "id, owner_email, company_name, company_address, company_siret, company_vat_number, company_iban, company_bic, company_phone, company_email, company_legal_form, company_capital, company_rcs, company_footer, default_vat_rate, payment_terms_days, large_amount_threshold_ht, unpaid_alert_days, auto_reminders_enabled, reminder_first_after_days, reminder_interval_days, reminder_max_count, reminder_manual_days, indep_hourly_cost, salarie_gross_hourly, salarie_employer_charges_pct, salarie_paid_leave_pct, recruit_green_max_hours, recruit_orange_max_hours, updated_at, quote_default_validity_days, quote_terms, notify_email, auto_invoicing_enabled, auto_invoicing_start_month, count_planned_as_done, month_end_send_next_day, quote_followup_enabled, quote_followup_days, quote_followup2_days, quote_expire_enabled, auto_planning_enabled, billing_requires_validation, default_target_margin_pct";

export async function getSettings(supabase: Supa): Promise<Settings> {
  const { data, error } = await supabase.from("app_settings").select(SETTINGS_COLUMNS).single();
  if (error || !data) throw new Error(`Paramètres introuvables : ${error?.message ?? "table vide"}`);
  return data as unknown as Settings;
}

/** Numériques Postgres → nombres JS (PostgREST renvoie parfois des chaînes). */
export const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
export const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export function flash(path: string, kind: "ok" | "error", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
}

/** Convertit une erreur Supabase/Postgres en message lisible pour le patron. */
export function dbMessage(error: { message: string }): string {
  return parseDbError(error.message).text;
}

export const checked = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";
export const str = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
};
export const numField = (fd: FormData, key: string) => {
  const v = str(fd, key);
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
