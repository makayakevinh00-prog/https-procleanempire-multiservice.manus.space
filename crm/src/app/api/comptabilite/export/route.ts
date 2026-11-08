import { isOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { monthBounds } from "@/lib/domain/dates";
import { toCsv } from "@/lib/domain/accounting";

export const dynamic = "force-dynamic";

/** Exports pour l'expert-comptable (lecture seule) : journal des ventes, encaissements, paiements fournisseurs. */
export async function GET(req: Request) {
  if (!(await isOwner())) return new Response("Accès refusé", { status: 403 });
  const u = new URL(req.url);
  const type = u.searchParams.get("type"), mois = u.searchParams.get("mois") ?? "";
  if (!/^\d{4}-\d{2}$/.test(mois) || !["ventes", "encaissements", "fournisseurs"].includes(type ?? "")) return new Response("Paramètres invalides", { status: 400 });
  const { start, end } = monthBounds(mois);
  const sb = createClient();
  let csv: string;
  if (type === "ventes") {
    const { data, error } = await sb.from("invoices").select("number, issue_date, due_date, status, total_ht, total_vat, total_ttc, paid_at, clients(name)").not("number", "is", null).neq("status", "brouillon").gte("issue_date", start).lte("issue_date", end).order("number");
    if (error) return new Response("Erreur de lecture", { status: 500 });
    csv = toCsv(["Numéro", "Date", "Échéance", "Client", "Statut", "HT", "TVA", "TTC", "Payée le"], (data ?? []).map((i: any) => [i.number, i.issue_date, i.due_date, i.clients?.name, i.status, Number(i.total_ht), Number(i.total_vat), Number(i.total_ttc), i.paid_at?.slice(0, 10)]));
  } else if (type === "encaissements") {
    const { data, error } = await sb.from("payments").select("received_at, amount, counterparty, label, match_status, matched:matched_invoice_id(number)").gte("received_at", `${start}T00:00:00Z`).lte("received_at", `${end}T23:59:59Z`).order("received_at");
    if (error) return new Response("Erreur de lecture", { status: 500 });
    csv = toCsv(["Date", "Montant", "Payeur", "Libellé", "Rapprochement", "Facture"], (data ?? []).map((p: any) => [p.received_at?.slice(0, 10), Number(p.amount), p.counterparty, p.label, p.match_status, p.matched?.number]));
  } else {
    const { data, error } = await sb.from("supplier_payments").select("paid_on, amount, label, suppliers(name, category)").gte("paid_on", start).lte("paid_on", end).order("paid_on");
    if (error) return new Response("Erreur de lecture", { status: 500 });
    csv = toCsv(["Date", "Fournisseur", "Catégorie", "Libellé", "Montant"], (data ?? []).map((p: any) => [p.paid_on, p.suppliers?.name, p.suppliers?.category, p.label, Number(p.amount)]));
  }
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${type}-${mois}.csv"`, "cache-control": "no-store" } });
}
