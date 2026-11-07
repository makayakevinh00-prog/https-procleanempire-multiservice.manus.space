import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { num } from "@/lib/data";
import { parisToday } from "@/lib/domain/dates";
import { computeKpis, type KpiSet, type KpiSnapshot, type Source } from "./kpis";

type Supa = ReturnType<typeof createClient>;

/**
 * Lecture SEULE des tables du CRM avec la session du patron (la RLS décide) : aucune clé spéciale, aucune écriture.
 * Une source illisible n'arrête pas le tableau : ses indicateurs passent en « non disponible » avec la raison.
 */
export async function loadKpis(sb: Supa, now: Date = new Date()): Promise<KpiSet> {
  const errors: Partial<Record<Source, string>> = {};
  const read = async <T,>(source: Source, q: PromiseLike<{ data: unknown; error: { message: string } | null }>, map: (r: any) => T): Promise<T[] | null> => {
    try {
      const { data, error } = await q;
      if (error) { errors[source] = error.message.slice(0, 160); return null; }
      return ((data as any[]) ?? []).map(map);
    } catch (e) { errors[source] = (e as Error).message.slice(0, 160); return null; }
  };
  const [invoices, quotes, requests, clients, contracts, interventions, staff, supplierPayments] = await Promise.all([
    read("invoices", sb.from("invoices").select("number, status, issue_date, due_date, total_ht, total_ttc, paid_amount, paid_at, updated_at, clients(name)").limit(5000), (i) => ({ number: i.number, client_name: i.clients?.name ?? "Client inconnu", status: i.status, issue_date: i.issue_date, due_date: i.due_date, total_ht: num(i.total_ht), total_ttc: num(i.total_ttc), paid_amount: num(i.paid_amount), paid_at: i.paid_at, updated_at: i.updated_at })),
    read("quotes", sb.from("quotes").select("status, issue_date, sent_at, accepted_at, total_ht, updated_at").limit(5000), (q) => ({ ...q, total_ht: num(q.total_ht) })),
    read("quote_requests", sb.from("quote_requests").select("status, received_at").limit(5000), (r) => r),
    read("clients", sb.from("clients").select("status, created_at, updated_at").limit(5000), (c) => c),
    read("contracts", sb.from("contracts").select("status, updated_at").limit(5000), (c) => c),
    read("interventions", sb.from("interventions").select("status, scheduled_date, staff_id, assignee, title, updated_at, clients(name), contracts(label)").limit(10000), (i) => ({ status: i.status, scheduled_date: i.scheduled_date, staff_id: i.staff_id, assignee: i.assignee, client_name: i.clients?.name ?? null, contract_label: i.contracts?.label ?? null, title: i.title, updated_at: i.updated_at })),
    read("staff", sb.from("staff").select("id, full_name, active, updated_at").limit(1000), (p) => p),
    read("supplier_payments", sb.from("supplier_payments").select("paid_on, amount, created_at").limit(5000), (p) => ({ ...p, amount: num(p.amount) }))
  ]);
  const snap: KpiSnapshot = { today: parisToday(now), computedAt: now.toISOString(), invoices, quotes, requests, clients, contracts, interventions, staff, supplierPayments, errors };
  return computeKpis(snap);
}
