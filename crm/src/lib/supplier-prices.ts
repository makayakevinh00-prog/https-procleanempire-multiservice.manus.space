/** « Libellé ; prix HT ; unité ; note » : une ligne par prix. Un prix absent ou illisible vaut null (jamais 0). */
export function parsePrices(text: string | null) {
  return (text ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const [label, price, unit, ...note] = l.split(";").map((x) => x.trim());
    const cleaned = (price ?? "").replace(",", ".").replace(/[^\d.-]/g, "");
    const p = cleaned ? Number(cleaned) : NaN;
    return { label, price_ht: Number.isFinite(p) ? p : null, unit: unit ?? "", note: note.join("; ") };
  });
}
export const pricesToText = (prices: any[] | null) =>
  (prices ?? []).map((p) => [p.label, p.price_ht ?? "", p.unit ?? "", p.note ?? ""].join(" ; ").replace(/( ; )+$/, "")).join("\n");
