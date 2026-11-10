export const CATEGORY: Record<string, string> = {
  bureaux: "Bureaux",
  logements: "Logements (Airbnb, colocation, locatif)",
  commerces: "Commerces",
  vehicules: "Véhicules et flottes",
  specialites: "Prestations spécialisées",
  options: "Options et compléments",
  conciergerie: "Conciergerie (Airbnb, gestion locative)",
};
export const CATEGORY_ORDER = [
  "bureaux",
  "logements",
  "commerces",
  "vehicules",
  "specialites",
  "options",
  "conciergerie",
];
export const ACTIVITY: Record<string, string> = {
  nettoyage_pro: "Nettoyage professionnel",
  nettoyage_airbnb: "Nettoyage Airbnb",
  gestion_locative: "Gestion locative",
};
export const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export type MarginStatus = "ok" | "sous_cible" | "perte" | "inconnu";

/** Coût de revient d'une prestation : temps × coût horaire + produits / déplacement. Null tant que le temps n'est pas renseigné. */
export function costOf(
  durationHours: number | null | undefined,
  hourly: number,
  materials: number | null | undefined,
): number | null {
  if (durationHours == null || !Number.isFinite(durationHours)) return null;
  return Math.round((durationHours * hourly + (materials ?? 0)) * 100) / 100;
}

/** Marge en € et en % du prix de vente ; prix conseillé = coût / (1 - marge cible) arrondi à l'euro supérieur ; plancher = prix sans perte. */
export function evaluate(
  price: number,
  cost: number | null,
  targetPct: number,
) {
  if (cost == null || price <= 0)
    return {
      margin: null as number | null,
      pct: null as number | null,
      status: "inconnu" as MarginStatus,
      suggested: cost == null ? null : Math.ceil(cost / (1 - targetPct / 100)),
      floor: cost == null ? null : Math.ceil(cost),
    };
  const margin = Math.round((price - cost) * 100) / 100;
  const pct = Math.round((margin / price) * 1000) / 10;
  const status: MarginStatus =
    margin < 0 ? "perte" : pct < targetPct ? "sous_cible" : "ok";
  return {
    margin,
    pct,
    status,
    suggested: Math.ceil(cost / (1 - targetPct / 100)),
    floor: Math.ceil(cost),
  };
}

/** La saison de vente d'une prestation est ouverte ce mois-ci ou le mois prochain (on anticipe d'un mois). */
export function seasonOpen(
  months: number[] | null | undefined,
  month: number,
): boolean {
  if (!months?.length) return false;
  return months.includes(month) || months.includes((month % 12) + 1);
}

export type Prospect = {
  id: string;
  name: string;
  activities: string[];
  sinceDays: number;
  late: boolean;
  bought: string;
};

const keyword = (name: string) =>
  name
    .split(/[—:(,]/)[0]
    .trim()
    .toLowerCase();

/**
 * Clients à qui proposer une prestation complémentaire : leur activité est celle visée, aucun impayé en retard, et ils n'en ont pas déjà.
 * Hors saison, on attend au moins 60 jours de relation ; en saison (ex. Noël) on propose tout de suite.
 */
export function clientsFor(
  s: {
    name: string;
    complements: string[] | null;
    season_months: number[] | null;
  },
  month: number,
  cs: Prospect[],
  minDays = 60,
): Prospect[] {
  if (!s.complements?.length) return [];
  const inSeason = seasonOpen(s.season_months, month);
  const kw = keyword(s.name);
  return cs.filter(
    (c) =>
      c.activities.some((a) => s.complements!.includes(a)) &&
      !c.late &&
      !c.bought.includes(kw) &&
      (inSeason || c.sinceDays >= minDays),
  );
}
