import { mapResult, titleCase, type Company } from "@/lib/entreprises";

export const CERT_KIND: Record<string, string> = {
  norme: "Norme ISO",
  certification: "Certification",
  qualification: "Qualification",
  label: "Label",
  formation: "Formation",
};
export const CERT_STATUS: Record<string, string> = {
  a_envisager: "À envisager",
  en_cours: "En cours",
  obtenu: "Obtenu",
  ecarte: "Écarté",
};
export const PRIORITY: Record<string, string> = {
  haute: "Priorité haute",
  normale: "Priorité normale",
  basse: "Priorité basse",
};
export const WATCH_KIND: Record<string, string> = {
  prix: "Prix",
  offre: "Offre / service",
  certification: "Certification",
  recrutement: "Recrutement",
  communication: "Communication",
  avis: "Avis clients",
  appel_offres: "Appel d'offres",
  autre: "Autre",
};
export const IMPACT: Record<string, string> = {
  faible: "Impact faible",
  moyen: "Impact moyen",
  fort: "Impact fort",
};

/** Codes NAF du nettoyage : bâtiments, autres nettoyages, désinfection / dératisation, nettoyages divers. */
export const CLEANING_NAF = ["81.21Z", "81.22Z", "81.29A", "81.29B"];

const HEADCOUNT: Record<string, string> = {
  NN: "Non employeur",
  "00": "0 salarié",
  "01": "1 à 2 salariés",
  "02": "3 à 5 salariés",
  "03": "6 à 9 salariés",
  "11": "10 à 19 salariés",
  "12": "20 à 49 salariés",
  "21": "50 à 99 salariés",
  "22": "100 à 199 salariés",
  "31": "200 à 249 salariés",
  "32": "250 à 499 salariés",
  "41": "500 à 999 salariés",
  "42": "1 000 à 1 999 salariés",
  "51": "2 000 à 4 999 salariés",
  "52": "5 000 à 9 999 salariés",
  "53": "10 000 salariés et plus",
};
export const headcountLabel = (code: unknown) =>
  typeof code === "string" && HEADCOUNT[code] ? HEADCOUNT[code] : null;

export type Rival = Company & {
  headcount: string | null;
  revenue_eur: number | null;
  revenue_year: number | null;
  local_place: string | null;
};

/** Dernier chiffre d'affaires publié dans l'annuaire (les petites entreprises n'en publient souvent pas : alors null). */
export function latestRevenue(finances: unknown): {
  revenue_eur: number | null;
  revenue_year: number | null;
} {
  if (!finances || typeof finances !== "object")
    return { revenue_eur: null, revenue_year: null };
  const years = Object.keys(finances as Record<string, any>)
    .filter((y) => /^\d{4}$/.test(y))
    .sort()
    .reverse();
  for (const y of years) {
    const ca = (finances as Record<string, any>)[y]?.ca;
    if (typeof ca === "number" && Number.isFinite(ca))
      return { revenue_eur: ca, revenue_year: Number(y) };
  }
  return { revenue_eur: null, revenue_year: null };
}

export function mapRival(r: Record<string, any>): Rival | null {
  const c = mapResult(r);
  if (!c) return null;
  const local = (Array.isArray(r.matching_etablissements) ? r.matching_etablissements : []).find(
    (e: Record<string, any>) => e?.etat_administratif === "A" && e?.libelle_commune,
  );
  const local_place = local ? `${titleCase(local.libelle_commune)}${local.code_postal ? ` (${local.code_postal})` : ""}` : null;
  return {
    ...c,
    headcount: headcountLabel(r.tranche_effectif_salarie),
    ...latestRevenue(r.finances),
    local_place,
  };
}

/** Écart avec la concurrence : certifications que des concurrents ont et que nous n'avons pas (encore). Les plus répandues d'abord. */
export function gapOrder<T extends { id: string; status: string }>(
  certs: T[],
  holders: Map<string, number>,
): T[] {
  const rank = (c: T) =>
    c.status === "obtenu" || c.status === "ecarte"
      ? 2
      : (holders.get(c.id) ?? 0) > 0
        ? 0
        : 1;
  return [...certs].sort(
    (a, b) =>
      rank(a) - rank(b) || (holders.get(b.id) ?? 0) - (holders.get(a.id) ?? 0),
  );
}
