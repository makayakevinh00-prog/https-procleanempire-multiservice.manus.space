/** Territoire commercial : secteurs à prospecter, lecture de l'annuaire officiel, calculs d'avancement. Fonctions pures (sauf `fetchTargets`). */
export type SectorKey = "bureaux" | "sante" | "commerce" | "auto" | "hotellerie" | "enseignement" | "industrie" | "immobilier";
/** Secteurs utiles à une entreprise de propreté. `sections` = sections NAF de l'annuaire ; `naf` = filtre plus fin sur le code de l'établissement. */
export const SECTORS: Record<SectorKey, { label: string; hint: string; sections: string[]; naf?: RegExp }> = {
  bureaux: { label: "Bureaux et services", hint: "Conseil, informatique, banque, assurance, services aux entreprises", sections: ["J", "K", "M", "N"] },
  immobilier: { label: "Immobilier et syndics", hint: "Agences, administrateurs de biens, copropriétés", sections: ["L"] },
  sante: { label: "Santé et médico-social", hint: "Cabinets, cliniques, laboratoires, EHPAD, crèches", sections: ["Q"] },
  commerce: { label: "Commerces", hint: "Magasins et grande distribution", sections: ["G"], naf: /^4[67]\./ },
  auto: { label: "Automobile", hint: "Concessions, garages, centres de contrôle", sections: ["G"], naf: /^45\./ },
  hotellerie: { label: "Hôtels et restaurants", hint: "Hôtels, résidences, restaurants", sections: ["I"] },
  enseignement: { label: "Enseignement et formation", hint: "Écoles privées, centres de formation", sections: ["P"] },
  industrie: { label: "Industrie et logistique", hint: "Ateliers, entrepôts, transport", sections: ["C", "H"] }
};
export const SECTOR_KEYS = Object.keys(SECTORS) as SectorKey[];
export const isSector = (v: unknown): v is SectorKey => typeof v === "string" && v in SECTORS;

/** Tranches d'effectif de l'Insee (au niveau de l'entreprise). */
export const HEADCOUNT: Record<string, string> = { "01": "1 à 2", "02": "3 à 5", "03": "6 à 9", "11": "10 à 19", "12": "20 à 49", "21": "50 à 99", "22": "100 à 199", "31": "200 à 249", "32": "250 à 499", "41": "500 à 999", "42": "1 000 à 1 999", "51": "2 000 à 4 999", "52": "5 000 à 9 999", "53": "10 000 et plus" };
export const SIZES: Record<string, { label: string; codes: string[] }> = {
  "3": { label: "3 salariés et plus", codes: ["02", "03", "11", "12", "21", "22", "31", "32", "41", "42", "51", "52", "53"] },
  "10": { label: "10 salariés et plus", codes: ["11", "12", "21", "22", "31", "32", "41", "42", "51", "52", "53"] },
  "20": { label: "20 salariés et plus", codes: ["12", "21", "22", "31", "32", "41", "42", "51", "52", "53"] },
  "50": { label: "50 salariés et plus", codes: ["21", "22", "31", "32", "41", "42", "51", "52", "53"] }
};
export const headcountLabel = (c: string | null | undefined) => (c && HEADCOUNT[c] ? `${HEADCOUNT[c]} salariés` : "effectif non communiqué");

export type TargetRow = { siret: string; siren: string; name: string; naf_code: string | null; headcount: string | null; address: string | null; postal_code: string | null; city: string | null; dept: string; lat: number | null; lng: number | null; sector: SectorKey };

const cap = (s: string) => s.toLowerCase().replace(/(^|[\s'’\-(])([a-zà-ÿ])/g, (_, a, b) => a + b.toUpperCase());
const coord = (v: unknown, lo: number, hi: number) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };

/**
 * Un résultat de l'annuaire → les établissements OUVERTS situés dans le département (une entreprise peut en avoir plusieurs, son siège peut être ailleurs).
 * Rien n'est inventé : sans position, l'établissement est gardé dans la liste mais n'apparaît pas sur la carte.
 */
export function targetsOf(r: Record<string, any>, dept: string, sector: SectorKey): TargetRow[] {
  const siren = String(r?.siren ?? "");
  if (!/^\d{9}$/.test(siren) || r?.etat_administratif !== "A") return [];
  const name = cap(String(r.nom_complet ?? r.nom_raison_sociale ?? "").trim()).slice(0, 160);
  if (!name) return [];
  const list = [...(Array.isArray(r.matching_etablissements) ? r.matching_etablissements : []), ...(r.siege ? [r.siege] : [])];
  const seen = new Set<string>(), out: TargetRow[] = [];
  for (const e of list) {
    const siret = String(e?.siret ?? ""), cp = String(e?.code_postal ?? "");
    if (!/^\d{14}$/.test(siret) || seen.has(siret) || e?.etat_administratif !== "A" || !cp.startsWith(dept)) continue;
    const naf = typeof e.activite_principale === "string" ? e.activite_principale : (typeof r.activite_principale === "string" ? r.activite_principale : null);
    if (SECTORS[sector].naf && !(naf && SECTORS[sector].naf!.test(naf))) continue;
    seen.add(siret);
    const enseigne = Array.isArray(e.liste_enseignes) && e.liste_enseignes[0] ? ` (${cap(String(e.liste_enseignes[0]))})` : "";
    out.push({
      siret, siren, name: `${name}${enseigne}`.slice(0, 180), naf_code: naf, headcount: typeof r.tranche_effectif_salarie === "string" && r.tranche_effectif_salarie in HEADCOUNT ? r.tranche_effectif_salarie : null,
      address: e.adresse ? cap(String(e.adresse)).slice(0, 200) : null, postal_code: /^\d{5}$/.test(cp) ? cp : null, city: e.libelle_commune ? cap(String(e.libelle_commune)).slice(0, 100) : null,
      dept, lat: coord(e.latitude, 41, 52), lng: coord(e.longitude, -6, 10), sector
    });
  }
  return out;
}

/** Une page de l'annuaire officiel (gratuit, sans clé) pour un département, une section d'activité et des tranches d'effectif. */
export async function fetchPage(dept: string, section: string, sizes: string[], page: number): Promise<{ rows: Record<string, any>[]; totalPages: number; total: number } | { error: string }> {
  const url = `https://recherche-entreprises.api.gouv.fr/search?departement=${encodeURIComponent(dept)}&section_activite_principale=${section}&tranche_effectif_salarie=${sizes.join(",")}&etat_administratif=A&per_page=25&page=${page}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(9000), cache: "no-store", headers: { accept: "application/json" } });
    if (res.status === 429) return { error: "L'annuaire limite le débit : réessayez dans une minute." };
    if (!res.ok) return { error: `L'annuaire des entreprises répond ${res.status}.` };
    const j = (await res.json()) as { results?: Record<string, any>[]; total_pages?: number; total_results?: number };
    return { rows: j.results ?? [], totalPages: Math.min(Number(j.total_pages ?? 0), 400), total: Number(j.total_results ?? 0) };
  } catch { return { error: "L'annuaire des entreprises ne répond pas, réessayez dans un instant." }; }
}

export type State = "cible" | "en_cours" | "client";
export type Point = { siret: string; name: string; city: string | null; lat: number | null; lng: number | null; headcount: string | null; sector: SectorKey; state: State; clientId: string | null; naf: string | null; address: string | null; postal: string | null };
export const pointOf = (a: any[]): Point => ({ siret: a[0], name: a[1], city: a[2], lat: a[3], lng: a[4], headcount: a[5], sector: a[6], state: a[7], clientId: a[8], naf: a[9], address: a[10], postal: a[11] });

/** Part des établissements ciblés devenus clients, en % (0 si la zone est vide). */
export const coverage = (clients: number, total: number) => (total > 0 ? Math.round((clients / total) * 1000) / 10 : 0);

/** Avancement par commune, les plus grosses d'abord. */
export function byCity(points: Point[]) {
  const m = new Map<string, { city: string; total: number; clients: number; enCours: number; lat: number; lng: number; n: number }>();
  for (const p of points) {
    const k = p.city ?? "Commune inconnue", c = m.get(k) ?? { city: k, total: 0, clients: 0, enCours: 0, lat: 0, lng: 0, n: 0 };
    c.total++; if (p.state === "client") c.clients++; else if (p.state === "en_cours") c.enCours++;
    if (p.lat != null && p.lng != null) { c.lat += p.lat; c.lng += p.lng; c.n++; }
    m.set(k, c);
  }
  return [...m.values()].map((c) => ({ city: c.city, total: c.total, clients: c.clients, enCours: c.enCours, pct: coverage(c.clients, c.total), lat: c.n ? c.lat / c.n : null, lng: c.n ? c.lng / c.n : null })).sort((a, b) => b.total - a.total);
}

/** Départements d'Île-de-France proposés sur la carte. */
export const IDF: Record<string, string> = { "75": "Paris", "77": "Seine-et-Marne", "78": "Yvelines", "91": "Essonne", "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis", "94": "Val-de-Marne", "95": "Val-d'Oise" };
