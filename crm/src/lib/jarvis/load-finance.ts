import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getSettings, num, numOrNull } from "@/lib/data";
import { parisToday } from "@/lib/domain/dates";
import type { FinanceSnapshot } from "./agents/finance";

type Supa = ReturnType<typeof createClient>;

/** Charge la photo des données de l'agent Finance. Lecture seule, avec la session du patron (la RLS décide) : aucune clé spéciale. */
export async function loadFinanceSnapshot(sb: Supa, now: Date = new Date()): Promise<FinanceSnapshot> {
  const settings = await getSettings(sb);
  const [inv, ctr, pay] = await Promise.all([
    sb.from("invoices").select("id, number, client_id, status, issue_date, due_date, total_ttc, paid_amount, paid_at, sent_at, reminder_count, created_at, clients(name, is_reserved)"),
    sb.from("contracts").select("id, client_id, label, status, billing_mode, monthly_amount_ht, per_visit_amount_ht, terms, weekdays, visits_per_week, hours_per_visit, site_address, assignee, start_date, clients(name)"),
    sb.from("payments").select("id", { count: "exact", head: true })
  ]);
  if (inv.error) throw new Error(inv.error.message);
  if (ctr.error) throw new Error(ctr.error.message);
  if (pay.error) throw new Error(pay.error.message);
  return {
    today: parisToday(now),
    settings: { payment_terms_days: settings.payment_terms_days, reminder_max_count: settings.reminder_max_count, reminder_manual_days: settings.reminder_manual_days, quote_terms: settings.quote_terms ?? null },
    invoices: (inv.data ?? []).map((i: any) => ({
      id: i.id, number: i.number, client_id: i.client_id, client_name: i.clients?.name ?? "Client inconnu", client_reserved: !!i.clients?.is_reserved, status: i.status,
      issue_date: i.issue_date, due_date: i.due_date, total_ttc: num(i.total_ttc), paid_amount: num(i.paid_amount), paid_at: i.paid_at, sent_at: i.sent_at,
      reminder_count: i.reminder_count ?? 0, created_at: i.created_at
    })),
    contracts: (ctr.data ?? []).map((k: any) => ({
      id: k.id, client_id: k.client_id, client_name: k.clients?.name ?? "Client inconnu", label: k.label, status: k.status, billing_mode: k.billing_mode,
      monthly_amount_ht: numOrNull(k.monthly_amount_ht), per_visit_amount_ht: numOrNull(k.per_visit_amount_ht), terms: k.terms, weekdays: k.weekdays,
      visits_per_week: numOrNull(k.visits_per_week), hours_per_visit: numOrNull(k.hours_per_visit), site_address: k.site_address, assignee: k.assignee, start_date: k.start_date
    })),
    paymentsCount: pay.count ?? 0
  };
}
