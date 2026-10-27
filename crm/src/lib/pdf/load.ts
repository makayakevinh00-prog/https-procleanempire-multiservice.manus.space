import { createClient } from "@/lib/supabase/server";
import { getSettings, num } from "@/lib/data";
import { renderPdf, type PdfDoc } from "./document";

const CLIENT_COLS = "name, address, postal_code, city, siret, email";

export async function buildPdf(kind: "devis" | "facture", id: string): Promise<{ bytes: Uint8Array; filename: string } | null> {
  const supabase = createClient();
  const settings = await getSettings(supabase);

  if (kind === "devis") {
    const { data: q } = await supabase.from("quotes").select(`*, clients(${CLIENT_COLS}), quote_lines(*)`).eq("id", id).maybeSingle();
    if (!q) return null;
    const doc: PdfDoc = {
      kind, number: q.number, status: q.status, issueDate: q.issue_date, dueOrValidUntil: q.valid_until,
      subject: q.subject, notes: q.notes, client: q.clients,
      lines: [...q.quote_lines].sort((a: any, b: any) => a.position - b.position).map(mapLine),
      totals: { ht: num(q.total_ht), vat: num(q.total_vat), ttc: num(q.total_ttc) }
    };
    return { bytes: await renderPdf(doc, settings), filename: `${q.number}.pdf` };
  }

  const { data: i } = await supabase.from("invoices").select(`*, clients(${CLIENT_COLS}), invoice_lines(*)`).eq("id", id).maybeSingle();
  if (!i) return null;
  const doc: PdfDoc = {
    kind, number: i.number, status: i.status, issueDate: i.issue_date, dueOrValidUntil: i.due_date,
    subject: i.subject, notes: i.notes, client: i.clients,
    lines: [...i.invoice_lines].sort((a: any, b: any) => a.position - b.position).map(mapLine),
    totals: { ht: num(i.total_ht), vat: num(i.total_vat), ttc: num(i.total_ttc) }
  };
  return { bytes: await renderPdf(doc, settings), filename: `${i.number ?? `brouillon-${i.id.slice(0, 8)}`}.pdf` };
}

const mapLine = (l: any) => ({
  description: l.description, quantity: num(l.quantity), unit_price_ht: num(l.unit_price_ht), vat_rate: num(l.vat_rate)
});

export const pdfResponse = (bytes: Uint8Array, filename: string) =>
  new Response(bytes as unknown as BodyInit, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" }
  });
