/**
 * Stock de produits compté par l'IA à partir d'un film.
 * « left » = nombre de contenants restants, décimales comprises (1,5 = une bouteille pleine et une à moitié).
 * La consommation se mesure entre deux comptages ; au premier, seule l'estimation de l'IA est disponible.
 */
export type StockSeen = { name: string; left: number; unit: string; low: boolean; guess_days: number | null };
export type StockItem = { name: string; left: number; unit: string; low: boolean; rate: number | null; days_left: number | null; basis: "mesure" | "estimation" | null; buy: boolean };
export type StockCount = { counted_at: string; items: StockItem[] };

const key = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const days = (a: string, b: string) => Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
/** À racheter quand il reste moins de tant de jours. */
export const BUY_WITHIN_DAYS = 10;

/** Prévision de chaque produit : consommation mesurée depuis le comptage précédent, sinon reprise de l'ancienne mesure, sinon estimation de l'IA. */
export function forecast(seen: StockSeen[], prev: StockCount | null, now: string): StockItem[] {
  const before = new Map((prev?.items ?? []).map((i) => [key(i.name), i]));
  const gap = prev ? days(prev.counted_at, now) : 0;
  return seen.filter((s) => s.name.trim()).map((s) => {
    const left = Math.max(0, Math.round(s.left * 10) / 10), p = before.get(key(s.name));
    let rate: number | null = null, basis: StockItem["basis"] = null;
    // Le stock a baissé depuis au moins deux jours : consommation mesurée. Il a remonté (réassort) : on garde l'ancienne mesure.
    if (p && gap >= 2 && p.left > left) { rate = (p.left - left) / gap; basis = "mesure"; }
    else if (p?.rate && p.basis === "mesure") { rate = p.rate; basis = "mesure"; }
    let daysLeft: number | null = rate ? Math.round(left / rate) : null;
    if (daysLeft == null && s.guess_days != null && s.guess_days >= 0) { daysLeft = Math.round(s.guess_days); basis = "estimation"; }
    return { name: s.name.trim().slice(0, 80), left, unit: s.unit.trim().slice(0, 30) || "unité", low: s.low, rate: rate ? Math.round(rate * 1000) / 1000 : null, days_left: daysLeft, basis, buy: s.low || left === 0 || (daysLeft != null && daysLeft <= BUY_WITHIN_DAYS) };
  });
}

/** Prochain comptage : à mi-chemin du premier produit qui va manquer, jamais avant 7 jours ni après 30. */
export function nextDue(items: StockItem[], now: string): string {
  const soonest = Math.min(...items.map((i) => i.days_left ?? Infinity));
  const wait = Number.isFinite(soonest) ? Math.min(30, Math.max(7, Math.round(soonest / 2))) : 14;
  return new Date(new Date(now).getTime() + wait * 86_400_000).toISOString().slice(0, 10);
}

/** « dans 12 jours », « cette semaine », « épuisé ». */
export function leftLabel(i: Pick<StockItem, "days_left" | "left" | "basis">): string {
  if (i.left === 0) return "épuisé";
  if (i.days_left == null) return "durée inconnue";
  const d = i.days_left, t = d <= 1 ? "1 jour" : d < 14 ? `${d} jours` : d < 60 ? `${Math.round(d / 7)} semaines` : `${Math.round(d / 30)} mois`;
  return `${i.basis === "estimation" ? "environ " : ""}${t}`;
}
