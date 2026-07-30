import { audiences, type Audience } from "../../config/audiences.js";
import type { CalendarContext, HistoryEntry, PhotoAnalysis } from "../types.js";

/**
 * Choix de la cible du jour.
 *
 * Même logique que pour les angles — délai de réutilisation puis tirage
 * pondéré — avec deux règles propres aux cibles :
 *  - si une photo est disponible, la cible doit correspondre à ce qu'elle
 *    montre (inutile de parler bureaux sous une photo de siège de voiture) ;
 *  - le week-end, on s'adresse davantage aux particuliers et aux conciergeries,
 *    dont l'activité ne s'arrête pas le samedi.
 */

/** Rattache une prestation détectée sur la photo à une cible cohérente. */
const SERVICE_TO_AUDIENCE: Record<string, Audience["id"]> = {
  vitrerie: "commerces-restaurants",
  bureaux: "bureaux-entreprises",
  automobile: "automobile",
  aéronautique: "aeronautique",
  aeronautique: "aeronautique",
  sols: "bureaux-entreprises",
  "textile-mobilier": "particuliers",
  sanitaires: "bureaux-entreprises",
  "remise-en-état": "particuliers",
  "remise-en-etat": "particuliers",
  hôtellerie: "conciergerie-airbnb",
  hotellerie: "conciergerie-airbnb",
};

const WEEKEND_FAVOURED: Audience["id"][] = [
  "particuliers",
  "conciergerie-airbnb",
  "automobile",
];

const daysSince = (isoDate: string, today: string): number =>
  Math.floor((Date.parse(today) - Date.parse(isoDate)) / 86_400_000);

/** Générateur déterministe, décalé par rapport à celui des angles. */
const seededRandom = (seed: string): (() => number) => {
  let hash = 5_381;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }

  return () => {
    hash += 0x9e3779b9;
    let t = hash >>> 0;
    t = Math.imul(t ^ (t >>> 16), 2_246_822_507);
    t = Math.imul(t ^ (t >>> 13), 3_266_489_909);
    return ((t ^ (t >>> 16)) >>> 0) / 4_294_967_296;
  };
};

export type AudienceChoice = {
  audience: Audience;
  reason: string;
};

export const chooseAudience = (
  calendar: CalendarContext,
  history: HistoryEntry[],
  analysis: PhotoAnalysis | null,
): AudienceChoice => {
  // Une photo impose son sujet : la cible s'y aligne.
  if (analysis) {
    const mapped = SERVICE_TO_AUDIENCE[analysis.serviceType.toLowerCase()];
    const match = audiences.find((audience) => audience.id === mapped);
    if (match) {
      return { audience: match, reason: `imposée par la photo (${analysis.serviceType})` };
    }
  }

  const lastUse = new Map<string, string>();
  for (const entry of history) {
    if (entry.audience && !lastUse.has(entry.audience)) {
      lastUse.set(entry.audience, entry.date);
    }
  }

  const eligible = audiences.filter((audience) => {
    const last = lastUse.get(audience.id);
    return !last || daysSince(last, calendar.date) >= audience.cooldownDays;
  });

  const pool = eligible.length > 0 ? eligible : audiences;
  const isWeekend = calendar.weekday === "samedi" || calendar.weekday === "dimanche";
  const random = seededRandom(`audience-${calendar.date}`);

  const weighted = pool.map((audience) => {
    const last = lastUse.get(audience.id);
    const age = last ? daysSince(last, calendar.date) : 60;
    const freshness = 1 + Math.min(age, 21) / 10;
    const bonus = isWeekend && WEEKEND_FAVOURED.includes(audience.id) ? 1.6 : 1;
    return { audience, weight: audience.weight * freshness * bonus };
  });

  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * total;

  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return {
        audience: item.audience,
        reason:
          eligible.length === 0
            ? "toutes les cibles étaient en période de repos"
            : "tirage pondéré par l'ancienneté",
      };
    }
  }

  return {
    audience: weighted[weighted.length - 1]?.audience ?? (audiences[0] as Audience),
    reason: "dernier candidat du tirage",
  };
};
