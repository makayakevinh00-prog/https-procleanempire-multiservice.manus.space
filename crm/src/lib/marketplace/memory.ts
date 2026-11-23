import type { BeforeReport } from "@/lib/ai-inspect";

/** Ce que l'IA retient d'un logement d'une visite à l'autre : les zones vues, ce qui revient sale, la durée habituelle. */
export type PlaceVisit = { date: string; level: number | null; summary: string; minutes: number | null; zones: string[] };
export type PlaceMemory = { visits: number; zones: string[]; recurring: string[]; last: PlaceVisit[] };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const uniq = (list: string[], max: number) => { const seen = new Set<string>(), out: string[] = []; for (const z of list) { const k = norm(z); if (k && !seen.has(k)) { seen.add(k); out.push(z.trim()); } } return out.slice(0, max); };

export function isMemory(v: unknown): v is PlaceMemory {
  return !!v && typeof v === "object" && Array.isArray((v as PlaceMemory).last) && Array.isArray((v as PlaceMemory).zones);
}

/** Ajoute la visite du jour. Le même jour rejoué (nouvelles photos) remplace la visite au lieu de compter double. Garde les 4 dernières visites. */
export function updateMemory(prev: PlaceMemory | null, report: BeforeReport, date: string): PlaceMemory {
  const visit: PlaceVisit = { date, level: report.level, summary: report.summary.slice(0, 300), minutes: report.minutes ?? null, zones: uniq(report.items.map((i) => i.zone), 14) };
  const before = (prev?.last ?? []).filter((v) => v.date !== date);
  const sameDay = (prev?.last ?? []).some((v) => v.date === date);
  const last = [...before, visit].slice(-4);
  const counts = new Map<string, { label: string; n: number }>();
  for (const v of last) for (const z of v.zones) { const k = norm(z); const c = counts.get(k) ?? { label: z, n: 0 }; c.n++; counts.set(k, c); }
  return {
    visits: (prev?.visits ?? 0) + (sameDay ? 0 : 1),
    zones: uniq([...(report.zones ?? []), ...(prev?.zones ?? []), ...visit.zones], 20),
    recurring: [...counts.values()].filter((c) => c.n >= 2).sort((a, b) => b.n - a.n).map((c) => c.label).slice(0, 8),
    last
  };
}

/** Ce qu'on rappelle à l'IA avant d'analyser un logement déjà connu. Vide pour une première visite. */
export function memoryPrompt(m: PlaceMemory | null, today: string): string {
  const past = (m?.last ?? []).filter((v) => v.date !== today);
  if (!m || !past.length) return "";
  const mins = past.map((v) => v.minutes).filter((x): x is number => typeof x === "number");
  return ` Ce logement est déjà connu (${past.length} visite${past.length > 1 ? "s" : ""} analysée${past.length > 1 ? "s" : ""}). Zones déjà vues : ${m.zones.join(", ") || "non précisées"}.`
    + (m.recurring.length ? ` Points qui reviennent sales d'une visite à l'autre : ${m.recurring.join(", ")}.` : "")
    + ` Dernière visite (${past[past.length - 1]!.date}) : niveau ${past[past.length - 1]!.level ?? "inconnu"}/5, ${past[past.length - 1]!.summary}`
    + (mins.length ? ` Durées estimées précédentes : ${mins.join(", ")} min.` : "")
    + " Ces informations servent seulement à nommer les zones de la même façon et à comparer : ne cite une zone des visites précédentes que si elle apparaît sur les images d'aujourd'hui.";
}
