import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { matchPayment, type InvoiceCandidate } from "./domain/matching";

const BASE = "https://thirdparty.qonto.com/v2";

function authHeader(): string {
  if (process.env.QONTO_ACCESS_TOKEN) return `Bearer ${process.env.QONTO_ACCESS_TOKEN}`;
  if (process.env.QONTO_ORGANIZATION_SLUG && process.env.QONTO_SECRET_KEY) {
    return `${process.env.QONTO_ORGANIZATION_SLUG}:${process.env.QONTO_SECRET_KEY}`; // clé API historique
  }
  throw new Error("Qonto non configuré : renseignez QONTO_ACCESS_TOKEN (ou QONTO_ORGANIZATION_SLUG + QONTO_SECRET_KEY).");
}

async function qonto<T>(path: string, params: URLSearchParams = new URLSearchParams()): Promise<T> {
  const res = await fetch(`${BASE}${path}?${params}`, { headers: { Authorization: authHeader() }, cache: "no-store" });
  if (!res.ok) throw new Error(`Qonto ${res.status} sur ${path} : ${(await res.text()).slice(0, 300)}`);
  return res.json() as Promise<T>;
}

interface QontoTx {
  transaction_id: string; amount: number; currency: string; side: string; status: string;
  label: string | null; reference: string | null; settled_at: string | null; emitted_at: string | null;
  operation_type?: string | null; income?: { counterparty_account_number?: string | null } | null;
}

/**
 * Seuls les encaissements de clients sont des « paiements » : on écarte les remboursements de carte
 * (ex. Leroy Merlin, Getaround) et les virements internes entre vos propres comptes (principal ↔ TVA).
 */
export function isCustomerPayment(t: QontoTx, ownIbans: string[] = []): boolean {
  if (t.side !== "credit" || t.amount <= 0) return false;
  if (t.operation_type === "card") return false;
  if (/virement interne/i.test(t.reference ?? "")) return false;
  const from = t.income?.counterparty_account_number?.replace(/\s/g, "");
  if (from && ownIbans.some((i) => i.replace(/\s/g, "") === from)) return false;
  return true;
}

async function bankAccountParams(): Promise<URLSearchParams> {
  const p = new URLSearchParams();
  if (process.env.QONTO_IBAN) { p.set("iban", process.env.QONTO_IBAN); return p; }
  const org = await qonto<{ organization: { bank_accounts: { id: string; main?: boolean; iban?: string }[] } }>("/organization");
  const accounts = org.organization.bank_accounts;
  const main = accounts.find((a) => a.main) ?? accounts[0];
  if (!main) throw new Error("Aucun compte bancaire Qonto trouvé.");
  p.set("bank_account_id", main.id);
  return p;
}

async function ownIbans(): Promise<string[]> {
  try {
    const org = await qonto<{ organization: { bank_accounts: { iban?: string }[] } }>("/organization");
    return org.organization.bank_accounts.map((a) => a.iban ?? "").filter(Boolean);
  } catch { return []; }
}

/** Virements reçus (crédits terminés) depuis `since` (ISO). Pagination protégée contre les boucles. */
export async function fetchCredits(since: string): Promise<QontoTx[]> {
  const base = await bankAccountParams();
  base.set("side", "credit");
  base.append("status[]", "completed");
  base.set("settled_at_from", since);
  base.set("per_page", "100");
  base.set("sort_by", "settled_at:desc");

  const seen = new Set<string>();
  const out: QontoTx[] = [];
  for (let page = 1; page <= 50; page++) {
    const p = new URLSearchParams(base);
    p.set("page", String(page));
    const r = await qonto<{ transactions: QontoTx[]; meta: { next_page: number | null } }>("/transactions", p);
    const fresh = r.transactions.filter((t) => !seen.has(t.transaction_id));
    if (!fresh.length) break;
    fresh.forEach((t) => { seen.add(t.transaction_id); out.push(t); });
    if (!r.meta?.next_page) break;
  }
  return out;
}

export interface SyncReport { fetched: number; inserted: number; autoMatched: number; proposed: number }

/** Importe les virements, rapproche automatiquement SEULEMENT les cas certains (n° de facture + montant exact). */
export async function syncQonto(db: SupabaseClient, sinceDays = 90): Promise<SyncReport> {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const [all, ibans] = await Promise.all([fetchCredits(since), ownIbans()]);
  const txs = all.filter((t) => isCustomerPayment(t, ibans));
  const report: SyncReport = { fetched: txs.length, inserted: 0, autoMatched: 0, proposed: 0 };
  if (!txs.length) return report;

  const rows = txs.filter((t) => t.amount > 0).map((t) => ({
    source: "qonto", qonto_transaction_id: t.transaction_id, amount: t.amount, currency: t.currency,
    received_at: t.settled_at ?? t.emitted_at ?? new Date().toISOString(),
    counterparty: t.label, label: t.label, reference: t.reference
  }));
  const { data: inserted, error } = await db.from("payments")
    .upsert(rows, { onConflict: "qonto_transaction_id", ignoreDuplicates: true }).select("id, amount, label, reference, counterparty");
  if (error) throw new Error(`Import des paiements : ${error.message}`);
  report.inserted = inserted?.length ?? 0;
  if (!inserted?.length) return report;

  const { data: open } = await db.from("invoices")
    .select("id, number, total_ttc, paid_amount, clients(name, is_reserved)").in("status", ["envoye", "en_retard"]);
  const candidates: InvoiceCandidate[] = (open ?? []).map((i: any) => ({
    id: i.id, number: i.number, total_ttc: Number(i.total_ttc), paid_amount: Number(i.paid_amount),
    client_name: i.clients.name, client_is_reserved: i.clients.is_reserved
  }));

  for (const p of inserted) {
    const m = matchPayment({ amount: Number(p.amount), label: p.label, reference: p.reference, counterparty: p.counterparty }, candidates);
    if (!m) continue;
    if (m.confidence === "certain") {
      const { error: e } = await db.rpc("reconcile_payment", { p_payment_id: p.id, p_invoice_id: m.invoiceId, p_ack_reserved: false });
      if (!e) { report.autoMatched++; continue; }
    }
    await db.from("payments").update({ match_status: "propose", suggested_invoice_id: m.invoiceId }).eq("id", p.id);
    report.proposed++;
  }
  return report;
}
