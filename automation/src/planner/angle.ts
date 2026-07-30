import { angles, type Angle, type AngleId } from "../../config/angles.js";
import type { CalendarContext, HistoryEntry } from "../types.js";

/**
 * Choix de l'angle du jour.
 *
 * Trois règles, dans cet ordre :
 *  1. un angle en période de repos (cooldown) est écarté ;
 *  2. un angle qui exige une photo est écarté s'il n'y en a pas ;
 *  3. parmi les restants, tirage pondéré favorisant ceux qu'on n'a pas vus
 *     depuis longtemps.
 *
 * Le tirage est déterministe pour une date donnée : deux exécutions le même
 * jour produisent le même angle, ce qui rend les incidents reproductibles.
 */

export type AngleChoice = {
  angle: Angle;
  reason: string;
};

const daysSince = (isoDate: string, today: string): number => {
  const diff = Date.parse(today) - Date.parse(isoDate);
  return Math.floor(diff / 86_400_000);
};

/** Générateur pseudo-aléatoire déterministe, amorcé par la date. */
const seededRandom = (seed: string): (() => number) => {
  let hash = 2_166_136_261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16_777_619);
  }

  return () => {
    hash += 0x6d2b79f5;
    let t = hash;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

/** Le dimanche exclut la promotion : on ne vend pas un jour de repos. */
const isAllowedOnWeekday = (angle: Angle, calendar: CalendarContext): boolean => {
  if (calendar.weekday === "dimanche" && angle.id === "promotion") return false;
  // Un jour férié se prête mal à une promotion commerciale.
  if (calendar.occasion && angle.id === "promotion") return false;
  return true;
};

/** Angles mis en avant selon le jour, sans être imposés. */
const WEEKDAY_AFFINITY: Record<string, AngleId[]> = {
  lundi: ["motivation", "presentation-service", "conseil-nettoyage"],
  mardi: ["conseil-nettoyage", "astuce-pro", "erreur-frequente"],
  mercredi: ["coulisses", "presentation-service"],
  jeudi: ["avant-apres", "resultat-obtenu", "temoignage"],
  vendredi: ["faq", "fait-interessant", "promotion"],
  samedi: ["conseil-nettoyage", "avant-apres", "astuce-pro"],
  dimanche: ["storytelling", "motivation", "coulisses"],
};

export const chooseAngle = (
  calendar: CalendarContext,
  history: HistoryEntry[],
  options: { hasPhoto: boolean },
): AngleChoice => {
  const lastUse = new Map<AngleId, string>();
  for (const entry of history) {
    if (!lastUse.has(entry.angle)) lastUse.set(entry.angle, entry.date);
  }

  const eligible = angles.filter((angle) => {
    if (angle.requiresPhoto && !options.hasPhoto) return false;
    if (!isAllowedOnWeekday(angle, calendar)) return false;

    const last = lastUse.get(angle.id);
    if (last && daysSince(last, calendar.date) < angle.cooldownDays) return false;

    return true;
  });

  // Tout est en repos (historique dense, peu d'angles) : on reprend le plus ancien.
  if (eligible.length === 0) {
    const fallback = [...angles]
      .filter((angle) => !angle.requiresPhoto || options.hasPhoto)
      .sort((a, b) => {
        const dateA = lastUse.get(a.id) ?? "0000-00-00";
        const dateB = lastUse.get(b.id) ?? "0000-00-00";
        return dateA.localeCompare(dateB);
      })[0];

    return {
      angle: fallback ?? (angles[0] as Angle),
      reason: "tous les angles étaient en période de repos, reprise du plus ancien",
    };
  }

  const affinity = new Set(WEEKDAY_AFFINITY[calendar.weekday] ?? []);
  const random = seededRandom(calendar.date);

  const weighted = eligible.map((angle) => {
    const last = lastUse.get(angle.id);
    const age = last ? daysSince(last, calendar.date) : 90;
    // L'ancienneté pèse autant que le poids éditorial, plafonnée à 30 jours
    // pour qu'un angle jamais utilisé n'écrase pas tout le tirage.
    const freshness = 1 + Math.min(age, 30) / 15;
    const bonus = affinity.has(angle.id) ? 1.8 : 1;
    return { angle, weight: angle.weight * freshness * bonus };
  });

  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * total;

  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return {
        angle: item.angle,
        reason: affinity.has(item.angle.id)
          ? `affinité avec le ${calendar.weekday}`
          : "tirage pondéré par l'ancienneté",
      };
    }
  }

  return {
    angle: weighted[weighted.length - 1]?.angle ?? (eligible[0] as Angle),
    reason: "dernier candidat du tirage",
  };
};
