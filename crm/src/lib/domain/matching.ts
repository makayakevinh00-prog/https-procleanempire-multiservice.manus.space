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

// ───────────── Rapprochement intelligent (suggestions classées, jamais appliquées sans clic) ─────────────

const STOP = new Set(["SOCIETE", "SARL", "SAS", "SASU", "EURL", "SA", "DE", "DES", "DU", "LA", "LE", "ET", "MME", "MLLE", "MR", "M", "OU", "D", "L", "ENTREPRISE", "ETS"]);
const tokens = (s: string | null | undefined) => [...new Set(norm(s).split(" ").filter((t) => t.length >= 3 && !STOP.has(t)))];

/** Part des mots du client retrouvés dans le payeur. Un mot tronqué par la banque (« AUTOMOBIL ») compte s'il en est le début. */
export function nameOverlap(payer: string | null | undefined, client: string | null | undefined): number {
  const a = tokens(payer), b = tokens(client);
  if (!a.length || !b.length) return 0;
  const hit = b.filter((tb) => a.some((ta) => ta === tb || (ta.length >= 5 && tb.startsWith(ta)) || (tb.length >= 5 && ta.startsWith(tb)))).length;
  return hit / Math.min(a.length, b.length) > 1 ? 1 : hit / Math.min(a.length, b.length);
}

export interface Suggestion { invoiceId: string; number: string | null; clientName: string; score: number; level: "tres_probable" | "probable"; reasons: string[]; due: number }

/**
 * Classe les factures ouvertes pour un virement. Chaque critère ajoute des points et le dit en clair :
 * numéro trouvé (même avec un écart de 1 centime), montant égal au reste dû ou au total, nom du payeur proche
 * du client (mots tronqués compris), acompte probable quand le montant est inférieur au reste dû.
 */
export function suggestInvoices(p: PayCandidate, invoices: InvoiceCandidate[], max = 3): Suggestion[] {
  const haystack = norm(`${p.label ?? ""} ${p.reference ?? ""} ${p.counterparty ?? ""}`);
  const compact = haystack.replace(/ /g, "");
  const payer = `${p.counterparty ?? ""} ${p.label ?? ""}`;
  const out: Suggestion[] = [];
  for (const inv of invoices) {
    const due = cents(inv.total_ttc) - cents(inv.paid_amount);
    if (due <= 0) continue;
    const reasons: string[] = []; let score = 0;
    const numberFound = !!inv.number && compact.includes(norm(inv.number).replace(/ /g, ""));
    if (numberFound) { score += 55; reasons.push(`numéro ${inv.number} cité`); }
    const diffDue = Math.abs(cents(p.amount) - due), diffTotal = Math.abs(cents(p.amount) - cents(inv.total_ttc));
    if (diffDue <= 1) { score += 30; reasons.push(due === cents(inv.total_ttc) ? "montant exact" : "montant égal au reste dû"); }
    else if (diffTotal <= 1) { score += 25; reasons.push("montant égal au total de la facture"); }
    const ov = nameOverlap(payer, inv.client_name);
    if (ov >= 0.99) { score += 30; reasons.push("nom du payeur = client"); }
    else if (ov >= 0.5) { score += 20; reasons.push("nom du payeur proche du client"); }
    if (!(diffDue <= 1 || diffTotal <= 1) && ov >= 0.5 && cents(p.amount) < due) { score += 10; reasons.push(`acompte possible (reste ${((due - cents(p.amount)) / 100).toFixed(2).replace(".", ",")} €)`); }
    if (score >= 40) out.push({ invoiceId: inv.id, number: inv.number, clientName: inv.client_name, score, level: score >= 60 ? "tres_probable" : "probable", reasons, due: due / 100 });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, max);
}
