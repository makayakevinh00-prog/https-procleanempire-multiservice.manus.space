export type Fmt = "eur" | "pct" | "h" | "n";
export type Criterion = { label: string; value: number | null; threshold: number | null; op: ">=" | "<="; fmt: Fmt; key?: string };
export type Verdict = "pret" | "approche" | "pas_encore" | "a_definir";

const usable = (c: Criterion) => c.threshold != null && c.value != null;

/** Part du critère atteinte, de 0 à 1 (null si le palier ou la valeur manque). */
export function progress(c: Criterion): number | null {
  if (!usable(c)) return null;
  const v = c.value!, t = c.threshold!;
  if (c.op === ">=") return t <= 0 ? 1 : Math.min(Math.max(v / t, 0), 1);
  return v <= 0 ? 1 : Math.min(t / v, 1);
}
export const isMet = (c: Criterion): boolean | null => (usable(c) ? (c.op === ">=" ? c.value! >= c.threshold! : c.value! <= c.threshold!) : null);

/** Tous les critères remplis = prêt ; en moyenne à 70 % ou plus = en approche ; sans aucun palier fixé = à définir. */
export function verdict(cs: Criterion[]): Verdict {
  const d = cs.filter(usable);
  if (!d.length) return "a_definir";
  if (d.every((c) => isMet(c))) return "pret";
  const avg = d.reduce((a, c) => a + (progress(c) ?? 0), 0) / d.length;
  return avg >= 0.7 ? "approche" : "pas_encore";
}

export const THRESHOLD_KEYS = ["agency_mrr", "buyout_surplus", "intl_revenue_12m", "diversify_top_share"] as const;
export type ThresholdKey = (typeof THRESHOLD_KEYS)[number];
export const THRESHOLD_LABEL: Record<ThresholdKey, { label: string; unit: string; hint: string }> = {
  agency_mrr: { label: "Autre agence : CA récurrent mensuel visé", unit: "€ HT / mois", hint: "À partir de quel CA récurrent vous ouvririez une autre agence ?" },
  buyout_surplus: { label: "Rachat : excédent de trésorerie visé", unit: "€", hint: "Excédent (encaissé moins payé aux fournisseurs, sur 6 mois) à réunir avant d'envisager un rachat." },
  intl_revenue_12m: { label: "International : CA sur 12 mois visé", unit: "€ HT", hint: "CA annuel à atteindre avant de viser l'international." },
  diversify_top_share: { label: "Dépendance maximale à un seul client", unit: "% du CA", hint: "Au-delà, mieux vaut diversifier. Repère courant : 35 %, à ajuster." }
};
export const DEFAULT_TOP_SHARE = 35;

/** Le plus gros client pèse quelle part du CA ? (0 à 100) ; null sans CA. */
export function topShare(byClient: number[]): number | null {
  const total = byClient.reduce((a, b) => a + b, 0);
  return total > 0 ? Math.round((Math.max(...byClient) / total) * 1000) / 10 : null;
}

/** Nombre de mois consécutifs (en partant du plus récent) où le CA dépasse les paiements fournisseurs. */
export function positiveMonths(months: { billed: number; supplier: number }[]): number {
  let n = 0;
  for (let i = months.length - 1; i >= 0; i--) { if (months[i].billed - months[i].supplier > 0) n++; else break; }
  return n;
}
