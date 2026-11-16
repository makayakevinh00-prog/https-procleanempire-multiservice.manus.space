import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { renderContractPdf } from "@/lib/pdf-next/render";
import { guessCategory, type ContractCategory } from "@/lib/contracts/clauses";

/** Contrat de prestation en PDF (même rendu pour le téléchargement et pour l'envoi à signer). `asked` : airbnb | bureaux | commerce, sinon déduit du contrat. */
export async function buildContractPdf(id: string, asked?: string | null): Promise<{ bytes: Uint8Array; filename: string; ref: string; clientEmail: string | null; clientId: string; clientName: string; label: string } | null> {
  const supabase = createClient();
  const { data: k } = await supabase.from("contracts").select("*, clients(id, name, kind, address, postal_code, city, phone, email, siret), sites(name, address)").eq("id", id).maybeSingle();
  if (!k) return null;
  const category = (["airbnb", "bureaux", "commerce"].includes(asked ?? "") ? asked : guessCategory(k)) as ContractCategory;
  const settings = await getSettings(supabase);
  const ref = `CT-${(k.start_date ?? k.created_at ?? "").slice(2, 4)}${(k.start_date ?? k.created_at ?? "").slice(5, 7)}-${String(k.id).slice(0, 4).toUpperCase()}`;
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const bytes = await renderContractPdf({
    category, ref, client: k.clients, site: k.sites ?? null,
    contract: { label: k.label, billing_mode: k.billing_mode, monthly_amount_ht: num(k.monthly_amount_ht), per_visit_amount_ht: num(k.per_visit_amount_ht), terms: k.terms, start_date: k.start_date, end_date: k.end_date,
      visits_per_week: num(k.visits_per_week), weekdays: k.weekdays, start_time: k.start_time, hours_per_visit: num(k.hours_per_visit), notes: k.notes }
  }, settings, k.clients.name);
  return { bytes, filename: `contrat-${ref}.pdf`, ref, clientEmail: k.clients.email ?? null, clientId: k.clients.id, clientName: k.clients.name, label: k.label };
}
