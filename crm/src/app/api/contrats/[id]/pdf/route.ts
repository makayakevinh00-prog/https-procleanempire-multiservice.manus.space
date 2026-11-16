import { canRead } from "@/lib/auth";
import { pdfResponse } from "@/lib/pdf/load";
import { buildContractPdf } from "@/lib/pdf/contract-load";

export const dynamic = "force-dynamic";

/** Contrat de prestation en PDF. ?type=airbnb|bureaux|commerce (par défaut : déduit du contrat). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!(await canRead("contrats"))) return new Response("Accès refusé", { status: 403 });
  const r = await buildContractPdf(params.id, new URL(req.url).searchParams.get("type"));
  if (!r) return new Response("Contrat introuvable", { status: 404 });
  return pdfResponse(r.bytes, r.filename);
}
