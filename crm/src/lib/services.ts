import { createClient } from "@/lib/supabase/server";
import { num } from "@/lib/data";
import type { ServiceOption } from "@/components/crm/lines-editor";

export async function loadServices(supabase: ReturnType<typeof createClient>): Promise<ServiceOption[]> {
  const { data } = await supabase.from("services").select("id, code, name, description, unit, unit_price_ht, vat_rate").eq("active", true).order("code");
  return (data ?? []).map((s: any) => ({ ...s, unit_price_ht: num(s.unit_price_ht), vat_rate: num(s.vat_rate) }));
}
