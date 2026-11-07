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
export const monthlyOf = (k: any) =>
  k.monthly_amount_ht != null ? num(k.monthly_amount_ht)
  : k.per_visit_amount_ht != null && k.visits_per_week != null ? (num(k.per_visit_amount_ht) * num(k.visits_per_week) * 52) / 12
  : k.commission_pct != null && k.commission_base_ht != null ? (num(k.commission_pct) / 100) * num(k.commission_base_ht)   // gestion : commission × revenus locatifs estimés
  : 0;

/** Contrats avec leur famille (enregistrée ou déduite) et les tables de correspondance client → famille, contrat → famille. */
export async function loadActivityModel(sb: SupabaseClient) {
  const r = { ...(await sb.from("contracts").select("*, clients(name)")), ready: true as boolean };   // « * » : prend les colonnes présentes (activity, commission) sans dépendre des migrations
  if (r.error) throw new Error(r.error.message);
  const contracts = (r.data ?? []).map((k: any) => {
    const ac: ActivityContract = { clientId: k.client_id, activity: isActivity(k.activity) ? k.activity : null, label: k.label, terms: k.terms, clientName: k.clients?.name ?? null, monthly: monthlyOf(k) };
    return { k, ac, family: contractActivity(ac) as Activity, saved: ac.activity !== null };
  });
  const active = contracts.filter((c) => c.k.status !== "resilie");
  return {
    ready: (r.data ?? []).length === 0 || (r.data ?? []).some((k: any) => "activity" in k), contracts,
    byClient: clientActivityMap(active.map((c) => c.ac)),
    byContract: new Map<string, Activity>(contracts.map((c) => [c.k.id as string, c.family]))
  };
}
