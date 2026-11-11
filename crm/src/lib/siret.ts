/** Contrôle d'un SIRET : format + clé de Luhn, puis existence et activité dans l'annuaire officiel des entreprises (gratuit, sans clé). */
export function siretValid(raw: string): boolean {
  const s = raw.replace(/\s/g, "");
  if (!/^\d{14}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) { let d = Number(s[13 - i]); if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; } sum += d; }
  return sum % 10 === 0;
}

export type SiretCheck = { status: "actif" | "cesse" | "inconnu" | "indisponible" };

export async function checkSiret(raw: string): Promise<SiretCheck> {
  const siret = raw.replace(/\s/g, "");
  if (!siretValid(siret)) return { status: "inconnu" };
  try {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&per_page=3`, { signal: AbortSignal.timeout(8000), cache: "no-store", headers: { accept: "application/json" } });
    if (!res.ok) return { status: "indisponible" };
    const results = (((await res.json()) as any)?.results ?? []) as any[];
    for (const r of results) {
      const est = [r.siege, ...(Array.isArray(r.matching_etablissements) ? r.matching_etablissements : [])].find((e) => e?.siret === siret);
      if (!est) continue;
      return { status: est.etat_administratif === "A" ? "actif" : "cesse" };
    }
    return { status: "inconnu" };
  } catch {
    return { status: "indisponible" };
  }
}
