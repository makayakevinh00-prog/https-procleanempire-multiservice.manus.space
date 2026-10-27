import { round2 } from "../utils";
import type { Line, Settings } from "./types";

export function lineTotals(l: Line) {
  const ht = round2(l.quantity * l.unit_price_ht);
  const vat = round2((l.quantity * l.unit_price_ht * l.vat_rate) / 100);
  return { ht, vat, ttc: round2(ht + vat) };
}

/** Même arrondi que le trigger SQL (somme des lignes arrondies). */
export function documentTotals(lines: Line[]) {
  const ht = round2(lines.reduce((a, l) => a + lineTotals(l).ht, 0));
  const vat = round2(lines.reduce((a, l) => a + lineTotals(l).vat, 0));
  return { ht, vat, ttc: round2(ht + vat) };
}

/** Règle 4 : strictement supérieur au seuil (1500 € HT pile = pas d'alerte). */
export const isLargeAmount = (totalHt: number, s: Pick<Settings, "large_amount_threshold_ht">) =>
  totalHt > Number(s.large_amount_threshold_ht);

/** Messages d'erreur métier levés par la base : "CODE: message". */
export function parseDbError(message: string): { code: string; text: string } {
  const m = /^([A-Z_]{4,}):?\s*(.*)$/s.exec(message.trim());
  return m ? { code: m[1], text: m[2] || m[1] } : { code: "ERREUR", text: message };
}
