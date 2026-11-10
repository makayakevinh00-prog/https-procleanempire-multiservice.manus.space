import { PDFDocument } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { renderPdf } from "@/lib/pdf/document";
import { invoiceDoc } from "@/lib/pdf/doc-mapper";

/** PDF d'une facture émise pour le comptable : lu via compta_invoice (pas d'accès direct aux tables), sans e-mail ni téléphone du client. */
export async function invoicePdfByNumber(number: string): Promise<Uint8Array | null> {
  const { data, error } = await createClient().rpc("compta_invoice", { p_number: number });
  if (error || !data) return null;
  const d = data as any;
  return renderPdf(invoiceDoc(d.invoice, d.client, d.lines), d.company);
}

/** Plusieurs factures dans un seul PDF (une après l'autre, dans l'ordre des numéros). */
export async function mergePdfs(parts: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const bytes of parts) {
    const src = await PDFDocument.load(bytes);
    for (const p of await out.copyPages(src, src.getPageIndices())) out.addPage(p);
  }
  return out.save();
}
