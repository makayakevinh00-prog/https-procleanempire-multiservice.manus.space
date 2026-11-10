import { isOwner, isAccountant } from "@/lib/auth";
import { toCsv } from "@/lib/domain/accounting";
import { parsePeriod } from "@/lib/compta/period";
import { loadPeriod } from "@/lib/compta/load";
import { buildFec } from "@/lib/compta/fec";

export const dynamic = "force-dynamic";
const TYPES = ["ventes", "encaissements", "fournisseurs", "fec"];

/** Exports pour l'expert-comptable (lecture seule) : mois, trimestre ou année. Patron ou comptable invité. */
export async function GET(req: Request) {
  if (!(await isOwner()) && !(await isAccountant())) return new Response("Accès refusé", { status: 403 });
  const u = new URL(req.url);
  const type = u.searchParams.get("type") ?? "";
  const period = parsePeriod(u.searchParams.get("periode") ?? u.searchParams.get("mois"));
  if (!period || !TYPES.includes(type)) return new Response("Paramètres invalides", { status: 400 });
  const d = await loadPeriod(period);
  if (!d) return new Response("Erreur de lecture", { status: 500 });
  const head = { "cache-control": "no-store" };
  if (type === "fec") {
    const byNumber = new Map<string, string>(d.invoices.map((i: any) => [i.number, i.client]));
    const body = buildFec(d.invoices, d.payments, byNumber);
    return new Response(body, { headers: { ...head, "content-type": "text/plain; charset=utf-8", "content-disposition": `attachment; filename="FEC-partiel-${period.key}.txt"` } });
  }
  let csv: string;
  if (type === "ventes") csv = toCsv(["Numéro", "Date", "Échéance", "Client", "Statut", "HT", "TVA", "TTC", "Payée le"], d.invoices.map((i: any) => [i.number, i.issue_date, i.due_date, i.client, i.status, Number(i.total_ht), Number(i.total_vat), Number(i.total_ttc), i.paid_at?.slice(0, 10)]));
  else if (type === "encaissements") csv = toCsv(["Date", "Montant", "Payeur", "Libellé", "Rapprochement", "Facture"], d.payments.map((p: any) => [p.received_at?.slice(0, 10), Number(p.amount), p.counterparty, p.label, p.match_status, p.invoice]));
  else csv = toCsv(["Date", "Fournisseur", "Catégorie", "Libellé", "Montant", "Justificatif"], d.supplier_payments.map((p: any) => [p.paid_on, p.supplier, p.category, p.label, Number(p.amount), p.has_doc ? "oui" : "non"]));
  return new Response(csv, { headers: { ...head, "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${type}-${period.key}.csv"` } });
}
