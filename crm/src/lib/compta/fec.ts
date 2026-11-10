/**
 * Fichier des Écritures Comptables (FEC) — PARTIEL : ventes et encaissements seulement.
 * Les achats et la TVA déductible ne sont pas suivis dans le CRM : l'expert-comptable les complète (Qonto, factures fournisseurs).
 * Format : 18 colonnes séparées par des tabulations, dates AAAAMMJJ, montants à virgule.
 */
export const FEC_HEADER = ["JournalCode", "JournalLib", "EcritureNum", "EcritureDate", "CompteNum", "CompteLib", "CompAuxNum", "CompAuxLib", "PieceRef", "PieceDate", "EcritureLib", "Debit", "Credit", "EcritureLet", "DateLet", "ValidDate", "Montantdevise", "Idevise"];

type Inv = { number: string; issue_date: string; status: string; total_ht: number; total_vat: number; total_ttc: number; client: string };
type Pay = { received_at: string; amount: number; counterparty: string | null; label: string | null; invoice: string | null };

const d8 = (iso: string | null | undefined) => (iso ?? "").slice(0, 10).replace(/-/g, "");
const money = (n: number) => (Math.round((Number(n) + Number.EPSILON) * 100) / 100).toFixed(2).replace(".", ",");
const clean = (s: string | null | undefined) => (s ?? "").replace(/[\t\r\n]+/g, " ").trim();
const aux = (client: string) => `C${clean(client).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "DIVERS"}`;

export function buildFec(invoices: Inv[], payments: Pay[], invoiceClient: Map<string, string>): string {
  const rows: string[][] = [];
  let n = 0;
  const line = (j: string, jl: string, num: number, date: string, acc: string, accLib: string, auxNum: string, auxLib: string, piece: string, pieceDate: string, lib: string, debit: number, credit: number) =>
    rows.push([j, jl, String(num), d8(date), acc, accLib, auxNum, auxLib, clean(piece), d8(pieceDate), clean(lib), money(debit), money(credit), "", "", d8(date), "", ""]);

  for (const i of [...invoices].filter((x) => x.status !== "annule").sort((a, b) => a.number.localeCompare(b.number))) {
    n += 1;
    const a = aux(i.client), lib = `Facture ${i.number} ${i.client}`;
    line("VT", "Ventes", n, i.issue_date, "411000", "Clients", a, i.client, i.number, i.issue_date, lib, Number(i.total_ttc), 0);
    line("VT", "Ventes", n, i.issue_date, "706000", "Prestations de services", "", "", i.number, i.issue_date, lib, 0, Number(i.total_ht));
    if (Number(i.total_vat) !== 0) line("VT", "Ventes", n, i.issue_date, "445710", "TVA collectée", "", "", i.number, i.issue_date, lib, 0, Number(i.total_vat));
  }
  for (const p of [...payments].sort((a, b) => a.received_at.localeCompare(b.received_at))) {
    n += 1;
    const amount = Number(p.amount);
    if (!(amount > 0)) continue;
    const who = (p.invoice && invoiceClient.get(p.invoice)) || p.counterparty || "Divers";
    const lib = `Encaissement ${clean(p.counterparty ?? p.label)}${p.invoice ? ` ${p.invoice}` : ""}`;
    line("BQ", "Banque", n, p.received_at, "512000", "Banque", "", "", p.invoice ?? "", p.received_at, lib, amount, 0);
    line("BQ", "Banque", n, p.received_at, "411000", "Clients", aux(who), who, p.invoice ?? "", p.received_at, lib, 0, amount);
  }
  return [FEC_HEADER, ...rows].map((r) => r.join("\t")).join("\r\n") + "\r\n";
}
