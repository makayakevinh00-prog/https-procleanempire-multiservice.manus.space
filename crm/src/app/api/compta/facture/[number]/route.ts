import { isOwner, isAccountant } from "@/lib/auth";
import { invoicePdfByNumber } from "@/lib/compta/pdf";
import { pdfResponse } from "@/lib/pdf/load";

export const dynamic = "force-dynamic";

/** PDF d'une facture émise, pour le patron et le comptable invité. */
export async function GET(_: Request, { params }: { params: { number: string } }) {
  if (!(await isOwner()) && !(await isAccountant())) return new Response("Accès refusé", { status: 403 });
  const number = decodeURIComponent(params.number);
  if (!/^[A-Za-z0-9._-]{1,40}$/.test(number)) return new Response("Numéro invalide", { status: 400 });
  const bytes = await invoicePdfByNumber(number);
  if (!bytes) return new Response("Facture introuvable", { status: 404 });
  return pdfResponse(bytes, `${number}.pdf`);
}
