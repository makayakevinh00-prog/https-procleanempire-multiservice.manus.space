import type { SupabaseClient } from "@supabase/supabase-js";
import { checkInvoicePrice, type PriceCheck } from "@/lib/domain/price-check";

/**
 * Rassemble ce qu'il faut pour contrôler le prix d'une facture (contrats actifs du client, missions rattachées,
 * factures précédentes) et rend le verdict. Une lecture qui échoue ne fait pas planter la page : le contrôle
 * se fait alors sur ce qui a pu être lu.
 */
export async function loadPriceCheck(sb: SupabaseClient, invoice: { id: string; client_id: string; total_ht: number | string; issue_date: string | null; invoice_lines: any[] }): Promise<PriceCheck> {
  const month = (invoice.issue_date ?? new Date().toISOString()).slice(0, 7);
  const [contracts, missions, previous] = await Promise.all([
    sb.from("contracts").select("id, label, billing_mode, monthly_amount_ht, per_visit_amount_ht").eq("client_id", invoice.client_id).eq("status", "actif"),
    sb.from("interventions").select("title, unit_price_ht, quantity").eq("invoice_id", invoice.id),
    sb.from("invoices").select("id, total_ht, issue_date, status").eq("client_id", invoice.client_id).neq("id", invoice.id).neq("status", "annule").order("issue_date", { ascending: false }).limit(12)
  ]);
  const prev = previous.error ? [] : ((previous.data ?? []) as any[]);
  const total = Number(invoice.total_ht);
  return checkInvoicePrice({
    totalHt: total,
    lines: (invoice.invoice_lines ?? []).map((l: any) => ({ description: String(l.description ?? ""), quantity: Number(l.quantity ?? 1), unitPriceHt: Number(l.unit_price_ht ?? 0) })),
    contracts: contracts.error ? [] : ((contracts.data ?? []) as any[]).map((c) => ({ id: c.id, label: String(c.label ?? "Contrat"), billingMode: c.billing_mode, monthlyHt: c.monthly_amount_ht != null ? Number(c.monthly_amount_ht) : null, perVisitHt: c.per_visit_amount_ht != null ? Number(c.per_visit_amount_ht) : null })),
    missions: missions.error ? [] : ((missions.data ?? []) as any[]).map((m) => ({ title: String(m.title ?? ""), unitPriceHt: m.unit_price_ht != null ? Number(m.unit_price_ht) : null, quantity: Number(m.quantity ?? 1) })),
    previousTotalsHt: prev.filter((p) => p.status !== "brouillon").map((p) => Number(p.total_ht)),
    sameMonthSameTotal: prev.filter((p) => String(p.issue_date ?? "").slice(0, 7) === month && Math.abs(Number(p.total_ht) - total) < 0.01).length
  });
}
