import { isOwner } from "@/lib/auth";
import { buildPdf, pdfResponse } from "@/lib/pdf/load";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!(await isOwner())) return new Response("Accès refusé", { status: 403 });
  const r = await buildPdf("facture", params.id);
  return r ? pdfResponse(r.bytes, r.filename) : new Response("Introuvable", { status: 404 });
}
