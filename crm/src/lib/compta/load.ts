import { createClient } from "@/lib/supabase/server";
import type { Period } from "./period";

/** Lit compta_data pour chaque mois de la période et fusionne : toujours via la fonction qui vérifie patron / comptable invité. */
export async function loadPeriod(p: Period) {
  const sb = createClient();
  const parts = await Promise.all(p.months.map((m) => sb.rpc("compta_data", { p_month: m })));
  if (parts.some((r) => r.error || !r.data)) return null;
  const ds = parts.map((r) => r.data as any);
  return {
    invoices: ds.flatMap((d) => d.invoices) as any[],
    payments: ds.flatMap((d) => d.payments) as any[],
    supplier_payments: ds.flatMap((d) => d.supplier_payments) as any[],
  };
}
