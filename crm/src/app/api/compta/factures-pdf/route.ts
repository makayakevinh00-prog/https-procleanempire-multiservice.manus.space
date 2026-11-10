import { isOwner, isAccountant } from "@/lib/auth";
import { parsePeriod } from "@/lib/compta/period";
import { loadPeriod } from "@/lib/compta/load";
import { invoicePdfByNumber, mergePdfs } from "@/lib/compta/pdf";
import { pdfResponse } from "@/lib/pdf/load";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAX = 60;

/** Toutes les factures émises d'une période (mois, trimestre, année) dans un seul PDF. */
export async function GET(req: Request) {
  if (!(await isOwner()) && !(await isAccountant())) return new Response("Accès refusé", { status: 403 });
  const period = parsePeriod(new URL(req.url).searchParams.get("periode"));
  if (!period) return new Response("Période invalide", { status: 400 });
  const d = await loadPeriod(period);
  if (!d) return new Response("Erreur de lecture", { status: 500 });
  const numbers = (d.invoices as any[]).filter((i) => i.status !== "annule").map((i) => i.number as string).sort();
  if (!numbers.length) return new Response("Aucune facture sur cette période", { status: 404 });
  if (numbers.length > MAX) return new Response(`Trop de factures (${numbers.length}) : choisissez un mois ou un trimestre`, { status: 413 });
  const parts: Uint8Array[] = [];
  for (const n of numbers) {
    const b = await invoicePdfByNumber(n);
    if (b) parts.push(b);
  }
  return pdfResponse(await mergePdfs(parts), `factures-${period.key}.pdf`);
}
