import { shiftMonth } from "@/lib/objectifs";

export const PERIODS = [3, 6, 12] as const;
export type Period = (typeof PERIODS)[number];
export const toPeriod = (v: unknown): Period =>
  (PERIODS as readonly number[]).includes(Number(v))
    ? (Number(v) as Period)
    : 6;

/** Les n derniers mois, du plus ancien au mois en cours (AAAA-MM). */
export const monthsBack = (currentMonth: string, n: number) =>
  Array.from({ length: n }, (_, k) => shiftMonth(currentMonth, k - (n - 1)));

/** Somme par mois d'une liste de lignes datées. */
export function sumByMonth<T>(
  rows: T[],
  date: (r: T) => string | null | undefined,
  value: (r: T) => number,
  months: string[],
): number[] {
  const out = new Map(months.map((m) => [m, 0]));
  for (const r of rows) {
    const m = String(date(r) ?? "").slice(0, 7);
    if (out.has(m))
      out.set(m, Math.round(((out.get(m) ?? 0) + value(r)) * 100) / 100);
  }
  return months.map((m) => out.get(m) ?? 0);
}

/** Un camembert lisible a 4 parts au plus : les plus petites sont regroupées dans « Autres ». */
export function groupSmall(
  parts: { label: string; value: number }[],
  max = 4,
): { label: string; value: number }[] {
  const sorted = parts
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);
  if (sorted.length <= max) return sorted;
  const head = sorted.slice(0, max - 1),
    rest = sorted.slice(max - 1);
  return [
    ...head,
    {
      label: "Autres",
      value: Math.round(rest.reduce((a, p) => a + p.value, 0) * 100) / 100,
    },
  ];
}

/** Scénario : et si le CA changeait de x % et les dépenses de y % ? */
export function scenario(
  base: { revenue: number; costs: number },
  revenuePct: number,
  costsPct: number,
) {
  const revenue = Math.round(base.revenue * (1 + revenuePct / 100) * 100) / 100;
  const costs = Math.round(base.costs * (1 + costsPct / 100) * 100) / 100;
  const result = Math.round((revenue - costs) * 100) / 100;
  return {
    revenue,
    costs,
    result,
    marginPct: revenue > 0 ? Math.round((result / revenue) * 1000) / 10 : null,
  };
}

/** Moyenne par mois sur les mois complets (le mois en cours est exclu). */
export function averageComplete(values: number[]): number {
  const done = values.slice(0, -1);
  return done.length
    ? Math.round((done.reduce((a, b) => a + b, 0) / done.length) * 100) / 100
    : 0;
}
