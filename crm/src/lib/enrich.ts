import "server-only";
import { classifyQuery, mapResult, type Company } from "@/lib/entreprises";
import { mapRival, type Rival } from "@/lib/veille";

/** Enrichissement : recherche d'une entreprise dans l'annuaire officiel (gratuit, sans clé). Rien n'est inventé : champ absent = null. */
export type Lookup = { rival: Rival | null; error?: string; candidates?: { name: string; siren: string; city: string | null }[] };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\b(sarl|sas|sasu|eurl|sa|sci|ets|societe|entreprise|groupe)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export async function lookupCompany(o: { siren?: string | null; name?: string | null; city?: string | null }): Promise<Lookup> {
  const siren = (o.siren ?? "").replace(/\s/g, "");
  const q = /^\d{9}$/.test(siren) ? siren : classifyQuery(o.name ?? "").q;
  if (!q || q.length < 3) return { rival: null, error: "Indiquez au moins le nom ou le SIREN." };
  let raw: any;
  try {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&per_page=8`, { signal: AbortSignal.timeout(9000), cache: "no-store", headers: { accept: "application/json" } });
    if (!res.ok) return { rival: null, error: "L'annuaire des entreprises ne répond pas, réessayez dans un instant." };
    raw = await res.json();
  } catch {
    return { rival: null, error: "L'annuaire des entreprises ne répond pas, réessayez dans un instant." };
  }
  const found = ((raw.results ?? []) as Record<string, any>[]).map(mapRival).filter((x): x is Rival => !!x);
  if (!found.length) return { rival: null, error: "Aucune entreprise trouvée dans l'annuaire officiel : vérifiez l'orthographe ou saisissez le SIREN." };
  if (/^\d{9}$/.test(siren)) return { rival: found.find((f) => f.siren === siren) ?? found[0] };
  // Par le nom : on ne retient un résultat que s'il est sans ambiguïté (nom identique, ou seul résultat actif de la ville).
  const want = norm(o.name ?? "");
  const same = found.filter((f) => norm(f.name) === want || (want.length >= 5 && (norm(f.name).startsWith(want) || want.startsWith(norm(f.name)))));
  const pool = (same.length ? same : []).filter((f) => f.active);
  const city = (o.city ?? "").toLowerCase();
  const local = city ? pool.filter((f) => (f.city ?? "").toLowerCase() === city) : [];
  const pick = local.length === 1 ? local[0] : pool.length === 1 ? pool[0] : null;
  if (pick) return { rival: pick };
  return { rival: null, error: "Plusieurs entreprises correspondent : précisez le SIREN pour que je trouve la bonne.", candidates: found.slice(0, 5).map((f) => ({ name: f.name, siren: f.siren, city: f.city })) };
}

export type { Company, Rival };
export { mapResult };
