import { NextResponse } from "next/server";
import { isRef, isTok, publicClient } from "@/lib/public-api";
import { renderPdf } from "@/lib/pdf/document";
import { invoiceDoc, quoteDoc } from "@/lib/pdf/doc-mapper";
import { pdfResponse } from "@/lib/pdf/load";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PDF d'un devis ou d'une facture de la demande — uniquement avec le numéro ET le jeton, jamais pour un contact réservé ni un brouillon. */
export async function GET(req: Request, { params }: { params: { number: string; kind: string } }) {
  const token = req.headers.get("x-tracking-token") ?? new URL(req.url).searchParams.get("t");
  const notFound = () => NextResponse.json({ error: "Document introuvable" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!isRef(params.number) || !isTok(token) || !["devis", "facture"].includes(params.kind)) return notFound();
  const { data, error } = await publicClient().rpc("public_request_doc", { p_ref: params.number, p_token: token, p_kind: params.kind });
  if (error || !data) return notFound();
  const d = data as { row: any; lines: any[]; client: any; company: any };
  const doc = params.kind === "devis" ? quoteDoc(d.row, d.client, d.lines) : invoiceDoc(d.row, d.client, d.lines);
  const bytes = await renderPdf(doc, d.company);
  return pdfResponse(bytes, `${d.row.number}.pdf`);
}
