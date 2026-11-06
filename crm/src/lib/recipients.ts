import type { SupabaseClient } from "@supabase/supabase-js";

export interface Recipient { email: string; label: string | null; primary: boolean; forInvoices: boolean }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Adresse principale du client + adresses supplémentaires de sa fiche. */
export async function loadRecipients(sb: SupabaseClient, clientId: string): Promise<Recipient[]> {
  const [{ data: c }, { data: extra }] = await Promise.all([
    sb.from("clients").select("email").eq("id", clientId).maybeSingle(),
    sb.from("client_emails").select("email, label, for_invoices").eq("client_id", clientId).order("created_at")
  ]);
  const out: Recipient[] = [];
  if (c?.email && EMAIL.test(c.email)) out.push({ email: c.email.trim(), label: "Principale", primary: true, forInvoices: true });
  for (const e of extra ?? []) if (!out.some((r) => r.email.toLowerCase() === String(e.email).toLowerCase())) out.push({ email: e.email, label: e.label, primary: false, forInvoices: !!e.for_invoices });
  return out;
}

/** Destinataires choisis dans le formulaire : cases « to » + champ libre « to_extra ». Dédoublonnés, adresses invalides refusées. */
export function pickRecipients(fd: FormData): { list: string[]; invalid: string[] } {
  const raw = [...fd.getAll("to").map(String), ...String(fd.get("to_extra") ?? "").split(/[\s,;]+/)].map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>(); const list: string[] = []; const invalid: string[] = [];
  for (const r of raw) {
    if (!EMAIL.test(r)) { invalid.push(r); continue; }
    if (!seen.has(r.toLowerCase())) { seen.add(r.toLowerCase()); list.push(r); }
  }
  return { list, invalid };
}
