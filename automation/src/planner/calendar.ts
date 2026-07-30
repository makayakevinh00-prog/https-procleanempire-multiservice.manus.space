import type { CalendarContext } from "../types.js";

/**
 * Contexte calendaire : jour de la semaine, saison, jours fériés et moments
 * forts du métier. C'est ce qui évite qu'une publication de mi-août ressemble à
 * une publication de mi-janvier.
 */

const WEEKDAYS = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
] as const;

/** Consigne éditoriale par jour de la semaine. */
const WEEKDAY_GUIDANCE: Record<string, string> = {
  lundi:
    "Début de semaine : organisation, planification des prestations, mise en route. Ton tonique et utile.",
  mardi:
    "Jour technique : conseil précis, méthode, matériel. Le lecteur doit apprendre quelque chose.",
  mercredi:
    "Coulisses et terrain : montrer le travail réel, les équipes, le déroulé d'une intervention.",
  jeudi:
    "Preuve : résultat obtenu, avant/après, retour client. C'est le jour où l'on démontre.",
  vendredi:
    "Fin de semaine : bilan, préparation du week-end, ton plus léger sans perdre le sérieux.",
  samedi:
    "Audience plus grand public et particuliers : conseils domestiques, automobile, logements.",
  dimanche:
    "Registre plus posé : storytelling, réflexion sur le métier, coulisses humaines. Aucune promotion.",
};

const SEASON_GUIDANCE: Record<CalendarContext["season"], string> = {
  hiver:
    "Hiver : sel et boue apportés à l'intérieur, sols et paillassons, air confiné, vitres embuées, entretien renforcé des halls d'entrée.",
  printemps:
    "Printemps : grand nettoyage, pollen sur les vitres et les véhicules, remise en état après l'hiver, textiles et moquettes.",
  été: "Été : congés et interventions en site vide, poussière et sécheresse, climatisation, remise en état avant la rentrée, locations saisonnières.",
  automne:
    "Automne : pluie et feuilles, sols glissants, reprise d'activité, préparation des locaux pour la saison froide.",
};

/** Calcul de Pâques (algorithme de Meeus/Jones/Butcher, calendrier grégorien). */
export const easterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
};

const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 86_400_000);

const key = (date: Date): string =>
  `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

/** Jours fériés français pour une année donnée, indexés par `MM-JJ`. */
export const frenchHolidays = (year: number): Map<string, string> => {
  const easter = easterSunday(year);

  const entries: Array<[string, string]> = [
    ["01-01", "Jour de l'An"],
    ["05-01", "Fête du Travail"],
    ["05-08", "Victoire 1945"],
    ["07-14", "Fête nationale"],
    ["08-15", "Assomption"],
    ["11-01", "Toussaint"],
    ["11-11", "Armistice"],
    ["12-25", "Noël"],
    [key(addDays(easter, 1)), "Lundi de Pâques"],
    [key(addDays(easter, 39)), "Ascension"],
    [key(addDays(easter, 50)), "Lundi de Pentecôte"],
  ];

  return new Map(entries);
};

/**
 * Moments forts du métier, en plus des jours fériés : ce sont eux qui portent
 * la pertinence commerciale d'une publication saisonnière.
 */
const businessMoments = (date: Date): string | null => {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  if (month === 9 && day <= 15) return "Rentrée : réouverture des bureaux et des commerces";
  if (month === 3) return "Saison du grand nettoyage de printemps";
  if (month === 12 && day <= 24) return "Fêtes de fin d'année : locaux et vitrines à soigner";
  if ((month === 7 && day >= 15) || month === 8)
    return "Période de congés : interventions en site vide et remises en état";
  if (month === 1 && day <= 15) return "Début d'année : reprise et nouveaux contrats";

  return null;
};

const seasonOf = (date: Date): CalendarContext["season"] => {
  const month = date.getUTCMonth() + 1;
  if (month === 12 || month <= 2) return "hiver";
  if (month <= 5) return "printemps";
  if (month <= 8) return "été";
  return "automne";
};

export const buildCalendarContext = (date = new Date()): CalendarContext => {
  // On travaille en UTC pour que le calcul soit stable quel que soit le serveur.
  const utc = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );

  const weekday = WEEKDAYS[utc.getUTCDay()] ?? "lundi";
  const season = seasonOf(utc);
  const holiday = frenchHolidays(utc.getUTCFullYear()).get(key(utc)) ?? null;

  return {
    date: utc.toISOString().slice(0, 10),
    weekday,
    season,
    occasion: holiday ?? businessMoments(utc),
    weekdayGuidance: WEEKDAY_GUIDANCE[weekday] ?? "",
    seasonGuidance: SEASON_GUIDANCE[season],
  };
};
