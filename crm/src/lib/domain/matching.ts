export interface PayCandidate {
  amount: number;
  label: string | null;
  reference: string | null;
  counterparty: string | null;
}
export interface InvoiceCandidate {
  id: string;
  number: string | null;
  total_ttc: number;
  paid_amount: number;
  client_name: string;
  client_is_reserved: boolean;
}
export interface MatchResult {
  invoiceId: string;
  /** "certain" : numéro de facture trouvé + montant exact. Seul cas rapproché sans clic. */
  confidence: "certain" | "probable";
  reason: string;
}

const norm = (s: string | null | undefined) =>
  (s ?? "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]+/g, " ").trim();

const cents = (n: number) => Math.round(n * 100);

/**
 * Propose la facture correspondant à un virement.
 * - certain : le numéro (F-2026-001) figure dans libellé/référence ET le montant restant dû correspond exactement
 * - probable : montant exact + nom du client dans le libellé (à confirmer manuellement)
 * Les contacts réservés ne sont jamais "certain" : rapprochement manuel du patron.
 */
export function matchPayment(p: PayCandidate, invoices: InvoiceCandidate[]): MatchResult | null {
  const haystack = norm(`${p.label ?? ""} ${p.reference ?? ""} ${p.counterparty ?? ""}`);
  const compact = haystack.replace(/ /g, "");
  const results: MatchResult[] = [];

  for (const inv of invoices) {
    const due = cents(inv.total_ttc) - cents(inv.paid_amount);
    if (due <= 0) continue;
    const exact = cents(p.amount) === due;
    const numberFound = inv.number ? compact.includes(norm(inv.number).replace(/ /g, "")) : false;
    const nameFound = norm(inv.client_name).length >= 3 && haystack.includes(norm(inv.client_name));

    if (numberFound && exact) {
      results.push({
        invoiceId: inv.id,
        confidence: inv.client_is_reserved ? "probable" : "certain",
        reason: `numéro ${inv.number} + montant exact`
      });
    } else if (numberFound) {
      results.push({ invoiceId: inv.id, confidence: "probable", reason: `numéro ${inv.number} (montant différent)` });
    } else if (exact && nameFound) {
      results.push({ invoiceId: inv.id, confidence: "probable", reason: "montant exact + nom du client" });
    }
  }
  // ambiguïté : plusieurs candidats certains → on ne tranche pas automatiquement
  const certain = results.filter((r) => r.confidence === "certain");
  if (certain.length === 1) return certain[0];
  if (certain.length > 1) return { ...certain[0], confidence: "probable", reason: "plusieurs factures possibles" };
  return results[0] ?? null;
}
