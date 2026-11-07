import type { SupabaseClient } from "@supabase/supabase-js";
import { clientActivityMap, contractActivity, isActivity, type Activity, type ActivityContract } from "@/lib/domain/activity";

/** Tant que la migration 0025 n'est pas installée, la colonne « activity » n'existe pas : on relit sans elle (aucune page ne casse). */
export async function selectResilient<T = any>(run: (cols: string) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, cols: string) {
  const first = await run(`${cols}, activity`);
  if (!first.error) return { ...first, ready: true };
  if (/activity/i.test(first.error.message)) return { ...(await run(cols)), ready: false };
  return { ...first, ready: true };
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
/** Montant mensuel HT d'un contrat : mensuel, ou prix par passage × fréquence × 52 / 12. */
export const monthlyOf = (k: any) => (k.monthly_amount_ht != null ? num(k.monthly_amount_ht) : k.per_visit_amount_ht != null && k.visits_per_week != null ? (num(k.per_visit_amount_ht) * num(k.visits_per_week) * 52) / 12 : 0);

/** Contrats avec leur famille (enregistrée ou déduite) et les tables de correspondance client → famille, contrat → famille. */
export async function loadActivityModel(sb: SupabaseClient) {
  const r = await selectResilient<any>((cols) => sb.from("contracts").select(cols), "id, client_id, label, terms, status, billing_mode, monthly_amount_ht, per_visit_amount_ht, visits_per_week, weekly_hours, clients(name)");
  if (r.error) throw new Error(r.error.message);
  const contracts = (r.data ?? []).map((k: any) => {
    const ac: ActivityContract = { clientId: k.client_id, activity: isActivity(k.activity) ? k.activity : null, label: k.label, terms: k.terms, clientName: k.clients?.name ?? null, monthly: monthlyOf(k) };
    return { k, ac, family: contractActivity(ac) as Activity, saved: ac.activity !== null };
  });
  const active = contracts.filter((c) => c.k.status !== "resilie");
  return {
    ready: r.ready, contracts,
    byClient: clientActivityMap(active.map((c) => c.ac)),
    byContract: new Map<string, Activity>(contracts.map((c) => [c.k.id as string, c.family]))
  };
}
