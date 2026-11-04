import type { PdfDoc } from "./document";

const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

const mapLine = (l: any) => ({ description: l.description, quantity: n(l.quantity), unit_price_ht: n(l.unit_price_ht), vat_rate: n(l.vat_rate) });
export const sortedLines = (rows: any[]) => [...rows].sort((a, b) => a.position - b.position).map(mapLine);

/** Document PDF d'une facture à partir de lignes brutes (envois manuels et automatiques). */
export function invoiceDoc(i: any, client: any, lines: any[]): PdfDoc {
  return {
    kind: "facture", number: i.number, status: i.status, issueDate: i.issue_date, dueOrValidUntil: i.due_date,
    subject: i.subject, notes: i.notes?.startsWith("Importé d'Axonaut") ? null : i.notes, client, lines: sortedLines(lines),
    totals: { ht: n(i.total_ht), vat: n(i.total_vat), ttc: n(i.total_ttc) }, paidAmount: n(i.paid_amount)
  };
}

export function quoteDoc(q: any, client: any, lines: any[]): PdfDoc {
  return {
    kind: "devis", number: q.number, status: q.status, issueDate: q.issue_date, dueOrValidUntil: q.valid_until,
    subject: q.subject, notes: q.notes, client, lines: sortedLines(lines), totals: { ht: n(q.total_ht), vat: n(q.total_vat), ttc: n(q.total_ttc) }
  };
}
