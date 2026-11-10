import "server-only";
import { CLEANING_NAF, mapRival, type Rival } from "@/lib/veille";

const WITH_STAFF = "02,03,11,12,21,22,31,32,41,42,51,52,53";   // 3 salariés et plus

export type RivalSearch = { rivals: Rival[]; total: number; pages: number; error?: string };

/** Entreprises de nettoyage actives d'un lieu (département ou code postal), depuis l'annuaire officiel. */
export async function searchRivals(o: { lieu: string; q?: string; staff?: boolean; page?: number }): Promise<RivalSearch> {
  const lieu = o.lieu.replace(/\s/g, "");
  const p = new URLSearchParams({ activite_principale: CLEANING_NAF.join(","), etat_administratif: "A", per_page: "20", page: String(Math.min(Math.max(o.page ?? 1, 1), 50)) });
  if (/^\d{5}$/.test(lieu)) p.set("code_postal", lieu);
  else if (/^(\d{2,3}|2[AB])$/i.test(lieu)) p.set("departement", lieu.toUpperCase());
  if (o.q && o.q.trim().length >= 3) p.set("q", o.q.trim().slice(0, 100));
  if (o.staff) p.set("tranche_effectif_salarie", WITH_STAFF);
  try {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?${p}`, { signal: AbortSignal.timeout(10000), cache: "no-store", headers: { accept: "application/json" } });
    if (!res.ok) return { rivals: [], total: 0, pages: 0, error: "L'annuaire des entreprises ne répond pas, réessayez dans un instant." };
    const j = await res.json();
    return { rivals: ((j.results ?? []) as Record<string, any>[]).map(mapRival).filter((x): x is Rival => !!x), total: Number(j.total_results) || 0, pages: Math.min(Number(j.total_pages) || 0, 50) };
  } catch {
    return { rivals: [], total: 0, pages: 0, error: "L'annuaire des entreprises ne répond pas, réessayez dans un instant." };
  }
}
