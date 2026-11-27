import { canRead } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { pdfResponse } from "@/lib/pdf/load";
import { renderEntrepreneurContractPdf } from "@/lib/pdf-next/render";

export const dynamic = "force-dynamic";

const clean = (v: string | null, max = 200) => (v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) || undefined;

/** Contrat de sous-traitance (6 mois par défaut) pour un entrepreneur indépendant : champs vides = à compléter à la main (en bleu dans le PDF). */
export async function GET(req: Request) {
  if (!(await canRead("rh"))) return new Response("Accès refusé", { status: 403 });
  const q = new URL(req.url).searchParams;
  const start = /^\d{4}-\d{2}-\d{2}$/.test(q.get("start") ?? "") ? q.get("start")! : undefined;
  const amount = Number((q.get("amount") ?? "").replace(",", "."));
  const months = Math.min(24, Math.max(1, Math.round(Number(q.get("months")) || 6)));
  const settings = await getSettings(createClient());
  const ref = `CE-${(start ?? new Date().toISOString()).slice(2, 4)}${(start ?? new Date().toISOString()).slice(5, 7)}`;
  const bytes = await renderEntrepreneurContractPdf({
    ref, months, start,
    monthlyHt: Number.isFinite(amount) && amount > 0 ? amount : null,
    name: clean(q.get("name")), legalForm: clean(q.get("form")), siret: clean(q.get("siret"), 20), address: clean(q.get("address")),
    phone: clean(q.get("phone"), 30), email: clean(q.get("email"))
  }, settings);
  return pdfResponse(bytes, `contrat-entrepreneur-${ref}.pdf`);
}
