/**
 * Client Qonto API — crée et finalise les factures client.
 * Auth : Authorization: proclean-empire-8053:QONTO_API_KEY
 */

const BASE = "https://thirdparty.qonto.com/v2";
const ORG = "proclean-empire-8053";

function auth(): string {
  const key = process.env.QONTO_API_KEY;
  if (!key)
    throw new Error(
      "QONTO_API_KEY manquant dans les variables d'environnement.",
    );
  return `${ORG}:${key}`;
}

export interface QontoInvoiceLine {
  description: string;
  quantity: number;
  unit_price_ht: number; // en centimes (integer)
  vat_rate: number; // ex: 20 → "0.2"
}

export interface QontoInvoiceInput {
  qonto_client_id: string;
  issue_date: string; // YYYY-MM-DD
  due_date: string; // YYYY-MM-DD
  perf_start: string; // YYYY-MM-DD
  perf_end: string; // YYYY-MM-DD
  lines: QontoInvoiceLine[];
}

export interface QontoInvoiceResult {
  id: string;
  number: string;
}

export async function createAndFinalizeQontoInvoice(
  input: QontoInvoiceInput,
): Promise<QontoInvoiceResult> {
  const headers = {
    "Content-Type": "application/json",
    Authorization: auth(),
  };

  const body = {
    client_invoice: {
      client_id: input.qonto_client_id,
      issue_date: input.issue_date,
      due_date: input.due_date,
      performance_start_date: input.perf_start,
      performance_end_date: input.perf_end,
      items: input.lines.map((l) => ({
        title: l.description,
        description: l.description,
        quantity: String(l.quantity),
        unit: "forfait",
        unit_price_cents: Math.round(l.unit_price_ht),
        vat_rate: String(l.vat_rate / 100),
      })),
      discount_conditions: "Pas d'escompte pour paiement anticipé.",
      late_payment_penalties:
        "En cas de retard de paiement, des pénalités de retard au taux légal en vigueur seront appliquées.",
      legal_fixed_compensation:
        "Tout retard de paiement entraîne une indemnité forfaitaire pour frais de recouvrement de 40 €.",
    },
  };

  // 1. Créer le brouillon
  const createRes = await fetch(`${BASE}/client_invoices`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!createRes.ok) {
    const txt = await createRes.text();
    throw new Error(`Qonto createInvoice ${createRes.status}: ${txt}`);
  }
  const { client_invoice: draft } = await createRes.json();

  // 2. Finaliser
  const finalRes = await fetch(`${BASE}/client_invoices/${draft.id}/finalize`, {
    method: "POST",
    headers,
  });
  if (!finalRes.ok) {
    const txt = await finalRes.text();
    throw new Error(`Qonto finalizeInvoice ${finalRes.status}: ${txt}`);
  }
  const { client_invoice: final } = await finalRes.json();

  return { id: final.id, number: final.number };
}
