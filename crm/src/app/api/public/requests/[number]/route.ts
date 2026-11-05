import { NextResponse } from "next/server";
import { corsHeaders, fetchStatus } from "@/lib/public-api";

export const dynamic = "force-dynamic";

/**
 * Suivi d'une demande : GET /api/public/requests/DEM-2611-0001 avec le jeton en en-tête `x-tracking-token` (ou `?t=`).
 * Numéro inconnu et mauvais jeton donnent exactement la même réponse 404.
 */
export async function GET(req: Request, { params }: { params: { number: string } }) {
  const url = new URL(req.url);
  const token = req.headers.get("x-tracking-token") ?? url.searchParams.get("t");
  const cors = corsHeaders(req.headers.get("origin"));
  const status = await fetchStatus(params.number, token);
  if (!status) return NextResponse.json({ error: "Demande introuvable" }, { status: 404, headers: { ...cors, "Cache-Control": "no-store" } });
  const base = `${url.origin}/api/public/requests/${status.request_number}/documents`;
  const q = `?t=${token}`;
  return NextResponse.json({
    ...status,
    links: {
      tracking_page: `${url.origin}/suivi/${status.request_number}${q}`,
      quote_pdf: status.quote?.document ? `${base}/devis${q}` : null,
      invoice_pdf: status.invoice?.document ? `${base}/facture${q}` : null
    }
  }, { headers: { ...cors, "Cache-Control": "no-store" } });
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}
