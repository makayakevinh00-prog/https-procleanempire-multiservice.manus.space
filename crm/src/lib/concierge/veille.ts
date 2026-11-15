/** Veille d'un logement : prix du jour, occupation, marché, avis, et un conseil de prix écrit en clair. Tout est calculé à partir de ce qui est saisi dans le CRM. */
export type PricePeriod = { id: string; label: string; start_date: string; end_date: string; price: number; min_nights: number | null; note: string | null };
export type Stay = { check_in: string; check_out: string; cancelled: boolean };
export type Review = { rating: number | null; topics: string[] };
export type MarketPoint = { seen_on: string; price: number };

export const TOPICS = { proprete: "Propreté", equipement: "Équipements", literie: "Literie", bruit: "Bruit", emplacement: "Emplacement", arrivee: "Arrivée / clés", communication: "Communication", prix: "Rapport qualité-prix", annonce: "Annonce / photos" } as const;
export type Topic = keyof typeof TOPICS;
export const TOPIC_KEYS = Object.keys(TOPICS) as Topic[];
export const isTopic = (v: unknown): v is Topic => typeof v === "string" && v in TOPICS;

const addDays = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

/** Prix d'une nuit à une date : la période qui contient la date (la plus courte l'emporte, ex. un week-end dans une saison), sinon le prix de base. */
export function priceOn(date: string, periods: PricePeriod[], base: number | null): { price: number | null; label: string } {
  const span = (p: PricePeriod) => Date.parse(p.end_date) - Date.parse(p.start_date);
  const hit = periods.filter((p) => p.start_date <= date && date <= p.end_date).sort((a, b) => span(a) - span(b))[0];
  return hit ? { price: Number(hit.price), label: hit.label } : { price: base, label: "prix de base" };
}

/** Nuits réservées et taux d'occupation sur `days` jours à partir de `from` (la nuit du départ ne compte pas). */
export function occupancy(stays: Stay[], from: string, days: number): { nights: number; days: number; pct: number } {
  let nights = 0;
  for (let k = 0; k < days; k++) { const d = addDays(from, k); if (stays.some((s) => !s.cancelled && s.check_in <= d && d < s.check_out)) nights++; }
  return { nights, days, pct: days ? Math.round((nights / days) * 100) : 0 };
}

/** Recette prévue des nuits réservées sur la période, au prix de chaque nuit. */
export function expectedRevenue(stays: Stay[], periods: PricePeriod[], base: number | null, from: string, days: number): number {
  let total = 0;
  for (let k = 0; k < days; k++) { const d = addDays(from, k); if (stays.some((s) => !s.cancelled && s.check_in <= d && d < s.check_out)) total += priceOn(d, periods, base).price ?? 0; }
  return Math.round(total * 100) / 100;
}

/** Prix moyen relevé sur le marché (relevés des 60 derniers jours). */
export function marketAverage(points: MarketPoint[], today: string): { avg: number | null; count: number } {
  const recent = points.filter((p) => p.seen_on >= addDays(today, -60));
  return { avg: recent.length ? Math.round((recent.reduce((t, p) => t + Number(p.price), 0) / recent.length) * 100) / 100 : null, count: recent.length };
}

/** Note moyenne et sujets cités dans les avis notés 3 ou moins (ce qui est à améliorer en premier). */
export function reviewSummary(reviews: Review[]): { avg: number | null; count: number; weak: { topic: Topic; count: number }[] } {
  const rated = reviews.filter((r) => r.rating != null);
  const counts = new Map<Topic, number>();
  for (const r of reviews) if (r.rating != null && r.rating <= 3) for (const t of r.topics) if (isTopic(t)) counts.set(t, (counts.get(t) ?? 0) + 1);
  return { avg: rated.length ? Math.round((rated.reduce((t, r) => t + Number(r.rating), 0) / rated.length) * 10) / 10 : null, count: reviews.length,
    weak: [...counts.entries()].map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count) };
}

/** Conseil de prix, en une phrase : il croise l'occupation des 30 prochains jours et l'écart avec le marché. Jamais appliqué tout seul. */
export function priceAdvice(a: { price: number | null; occupancyPct: number; marketAvg: number | null }): { tone: "hausse" | "baisse" | "ok" | "info"; text: string } {
  if (a.price == null) return { tone: "info", text: "Indiquez un prix de base ou une période de prix pour obtenir un conseil." };
  const gap = a.marketAvg ? Math.round(((a.price - a.marketAvg) / a.marketAvg) * 100) : null;
  if (a.occupancyPct >= 80 && (gap == null || gap <= 5)) return { tone: "hausse", text: `Logement presque plein (${a.occupancyPct} % sur 30 jours)${gap != null ? ` et prix ${gap <= 0 ? `${Math.abs(gap)} % sous` : "au niveau de"} la moyenne relevée` : ""} : vous pouvez tester une hausse de 5 à 10 % sur les dates encore libres.` };
  if (a.occupancyPct < 40 && gap != null && gap > 10) return { tone: "baisse", text: `Peu de réservations (${a.occupancyPct} % sur 30 jours) et prix ${gap} % au-dessus de la moyenne relevée : rapprochez-vous du marché sur les dates libres.` };
  if (a.occupancyPct < 40) return { tone: "baisse", text: `Peu de réservations (${a.occupancyPct} % sur 30 jours)${gap == null ? " : relevez les prix de logements comparables pour savoir si le prix est en cause" : " alors que le prix est dans le marché : regardez plutôt l'annonce (photos, titre) et les avis"}.` };
  return { tone: "ok", text: `Occupation correcte (${a.occupancyPct} % sur 30 jours)${gap != null ? `, prix ${gap === 0 ? "au niveau de" : gap > 0 ? `${gap} % au-dessus de` : `${Math.abs(gap)} % sous`} la moyenne relevée` : ""} : rien à changer pour l'instant.` };
}
