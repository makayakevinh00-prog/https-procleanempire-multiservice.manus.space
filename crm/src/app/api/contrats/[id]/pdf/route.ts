import { canRead } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { pdfResponse } from "@/lib/pdf/load";
import { renderContractPdf } from "@/lib/pdf-next/render";
import { guessCategory, type ContractCategory } from "@/lib/contracts/clauses";

export const dynamic = "force-dynamic";

/** Contrat de prestation en PDF. ?type=airbnb|bureaux|commerce (par défaut : déduit du contrat). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!(await canRead("contrats"))) return new Response("Accès refusé", { status: 403 });
  const supabase = createClient();
  const { data: k } = await supabase.from("contracts").select("*, clients(name, kind, address, postal_code, city, phone, email, siret), sites(name, address)").eq("id", params.id).maybeSingle();
  if (!k) return new Response("Contrat introuvable", { status: 404 });
  const asked = new URL(req.url).searchParams.get("type");
  const category = (["airbnb", "bureaux", "commerce"].includes(asked ?? "") ? asked : guessCategory(k)) as ContractCategory;
  const settings = await getSettings(supabase);
  const ref = `CT-${(k.start_date ?? k.created_at ?? "").slice(2, 4)}${(k.start_date ?? k.created_at ?? "").slice(5, 7)}-${String(k.id).slice(0, 4).toUpperCase()}`;
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const bytes = await renderContractPdf({
    category, ref, client: k.clients, site: k.sites ?? null,
    contract: { label: k.label, billing_mode: k.billing_mode, monthly_amount_ht: num(k.monthly_amount_ht), per_visit_amount_ht: num(k.per_visit_amount_ht), terms: k.terms, start_date: k.start_date, end_date: k.end_date,
      visits_per_week: num(k.visits_per_week), weekdays: k.weekdays, start_time: k.start_time, hours_per_visit: num(k.hours_per_visit), notes: k.notes }
  }, settings, k.clients.name);
  return pdfResponse(bytes, `contrat-${ref}.pdf`);
}
