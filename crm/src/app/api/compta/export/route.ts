import { isOwner, isAccountant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/domain/accounting";

export const dynamic = "force-dynamic";

/** Exports pour l'expert-comptable (lecture seule) : journal des ventes, encaissements, paiements fournisseurs. Patron ou comptable invité. */
export async function GET(req: Request) {
  if (!(await isOwner()) && !(await isAccountant())) return new Response("Accès refusé", { status: 403 });
  const u = new URL(req.url);
  const type = u.searchParams.get("type"), mois = u.searchParams.get("mois") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mois) || !["ventes", "encaissements", "fournisseurs"].includes(type ?? "")) return new Response("Paramètres invalides", { status: 400 });
  const { data, error } = await createClient().rpc("compta_data", { p_month: mois });
  if (error || !data) return new Response("Erreur de lecture", { status: 500 });
  const d = data as any;
  let csv: string;
  if (type === "ventes") csv = toCsv(["Numéro", "Date", "Échéance", "Client", "Statut", "HT", "TVA", "TTC", "Payée le"], d.invoices.map((i: any) => [i.number, i.issue_date, i.due_date, i.client, i.status, Number(i.total_ht), Number(i.total_vat), Number(i.total_ttc), i.paid_at?.slice(0, 10)]));
  else if (type === "encaissements") csv = toCsv(["Date", "Montant", "Payeur", "Libellé", "Rapprochement", "Facture"], d.payments.map((p: any) => [p.received_at?.slice(0, 10), Number(p.amount), p.counterparty, p.label, p.match_status, p.invoice]));
  else csv = toCsv(["Date", "Fournisseur", "Catégorie", "Libellé", "Montant"], d.supplier_payments.map((p: any) => [p.paid_on, p.supplier, p.category, p.label, Number(p.amount)]));
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${type}-${mois}.csv"`, "cache-control": "no-store" } });
}
