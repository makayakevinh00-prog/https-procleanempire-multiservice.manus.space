/** Calculs comptables purs (aucune écriture) : TVA par taux, trous de numérotation, export CSV. */
export interface AcctLine { invoice_id: string; quantity: number; unit_price_ht: number; vat_rate: number }

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** TVA collectée par taux, d'après les lignes des factures émises. */
export function vatByRate(lines: AcctLine[]): { rate: number; base: number; vat: number }[] {
  const m = new Map<number, number>();
  for (const l of lines) m.set(Number(l.vat_rate), (m.get(Number(l.vat_rate)) ?? 0) + Number(l.quantity) * Number(l.unit_price_ht));
  return [...m.entries()].sort(([a], [b]) => a - b).map(([rate, base]) => ({ rate, base: r2(base), vat: r2((base * rate) / 100) }));
}

/** Numéros « F-2026-007 » : renvoie les numéros manquants dans chaque année (numérotation continue obligatoire). */
export function numberingGaps(numbers: (string | null)[]): string[] {
  const byYear = new Map<string, number[]>();
  for (const n of numbers) {
    const m = /^F-(\d{4})-(\d+)$/.exec(n ?? "");
    if (m) byYear.set(m[1], [...(byYear.get(m[1]) ?? []), Number(m[2])]);
  }
  const out: string[] = [];
  for (const [y, list] of byYear) {
    const set = new Set(list), max = Math.max(...list);
    for (let i = 1; i < max; i++) if (!set.has(i)) out.push(`F-${y}-${String(i).padStart(3, "0")}`);
  }
  return out;
}

/** CSV pour tableur (séparateur « ; », décimales à virgule). Les cellules qui commenceraient par = + - @ sont neutralisées. */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "number") return String(r2(v)).replace(".", ",");
    let s = v.replace(/\r?\n/g, " ");
    if (/^[=+\-@\t]/.test(s)) s = `'${s}`;
    return /[;"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}
