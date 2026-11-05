import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { renderPdf } from "./document";
import { invoiceDoc, quoteDoc } from "./doc-mapper";

const CLIENT_COLS = "name, address, postal_code, city, siret, email";

/** `sent: true` : le document part chez le client, il ne doit donc pas porter la mention « Brouillon ». */
export async function buildPdf(kind: "devis" | "facture", id: string, opts: { sent?: boolean } = {}): Promise<{ bytes: Uint8Array; filename: string } | null> {
  const supabase = createClient();
  const settings = await getSettings(supabase);

  if (kind === "devis") {
    const { data: q } = await supabase.from("quotes").select(`*, clients(${CLIENT_COLS}), quote_lines(*)`).eq("id", id).maybeSingle();
    if (!q) return null;
    const row = opts.sent && q.status === "brouillon" ? { ...q, status: "envoye" } : q;
    return { bytes: await renderPdf(quoteDoc(row, q.clients, q.quote_lines), settings), filename: `${q.number}.pdf` };
  }

  const { data: i } = await supabase.from("invoices").select(`*, clients(${CLIENT_COLS}), invoice_lines(*)`).eq("id", id).maybeSingle();
  if (!i) return null;
  return { bytes: await renderPdf(invoiceDoc(i, i.clients, i.invoice_lines), settings), filename: `${i.number ?? `brouillon-${i.id.slice(0, 8)}`}.pdf` };
}

export const pdfResponse = (bytes: Uint8Array, filename: string) =>
  new Response(bytes as unknown as BodyInit, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" }
  });
