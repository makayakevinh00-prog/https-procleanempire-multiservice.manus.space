/** Les 12 étapes d'une mission, dans l'ordre du cycle de vie. */
export const STAGES = [
  ["brouillon", "Brouillon"],
  ["planifiee", "Planifiée"],
  ["affectee", "Affectée"],
  ["en_route", "En route"],
  ["arrivee", "Arrivée"],
  ["en_cours", "En cours"],
  ["a_verifier", "À vérifier"],
  ["terminee", "Terminée"],
  ["validee", "Validée"],
  ["facturable", "Facturable"],
  ["facturee", "Facturée"],
  ["annulee", "Annulée"]
] as const;

export type Stage = (typeof STAGES)[number][0];
export const STAGE_LABEL = Object.fromEntries(STAGES) as Record<Stage, string>;
export const isStage = (s: unknown): s is Stage => typeof s === "string" && s in STAGE_LABEL;

export const STAGE_TONE: Record<Stage, string> = {
  brouillon: "bg-slate-100 text-slate-700",
  planifiee: "bg-sky-50 text-sky-800",
  affectee: "bg-blue-100 text-blue-800",
  en_route: "bg-indigo-100 text-indigo-800",
  arrivee: "bg-violet-100 text-violet-800",
  en_cours: "bg-purple-100 text-purple-800",
  a_verifier: "bg-amber-100 text-amber-900",
  terminee: "bg-teal-100 text-teal-800",
  validee: "bg-emerald-100 text-emerald-800",
  facturable: "bg-lime-100 text-lime-900",
  facturee: "bg-green-200 text-green-900",
  annulee: "bg-red-100 text-red-800"
};

/** Étapes qu'un responsable peut choisir à la main ; « facturée » est posée par la facturation, jamais à la main. */
export const MANUAL_STAGES = STAGES.map(([s]) => s).filter((s) => s !== "facturee") as Stage[];

/** Prochaine étape « logique » proposée en un clic. */
export function nextStage(s: Stage): Stage | null {
  const flow: Partial<Record<Stage, Stage>> = {
    brouillon: "planifiee", planifiee: "affectee", affectee: "en_route", en_route: "arrivee", arrivee: "en_cours",
    en_cours: "terminee", a_verifier: "validee", terminee: "validee", validee: "facturable"
  };
  return flow[s] ?? null;
}

export type StaffLite = { id: string; full_name: string; zone: string | null; weekly_capacity_hours: number | null; active: boolean };
export type MissionLite = { id: string; staff_id: string | null; site_id: string | null; scheduled_date: string; start_time: string | null; duration_hours: number | null; stage: string; city?: string | null };

export type Suggestion = { staff: StaffLite; score: number; reasons: string[]; blocking: string[] };

const toMin = (t: string | null) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null);
const overlap = (a: MissionLite, b: MissionLite) => {
  const sa = toMin(a.start_time), sb = toMin(b.start_time);
  if (sa === null || sb === null) return false; // heure inconnue : on ne peut pas affirmer un conflit
  const ea = sa + (a.duration_hours ?? 1) * 60, eb = sb + (b.duration_hours ?? 1) * 60;
  return sa < eb && sb < ea;
};

/**
 * Classe les agents pour une mission. Jamais d'affectation automatique : c'est une proposition.
 * Critères : disponible sur le créneau (bloquant), connaît déjà le site, même secteur, charge de la semaine.
 * `week` = missions non annulées de la même semaine (toutes les personnes).
 */
export function suggestAgents(mission: MissionLite, staff: StaffLite[], week: MissionLite[]): Suggestion[] {
  return staff
    .filter((s) => s.active)
    .map((s) => {
      const mine = week.filter((m) => m.staff_id === s.id && m.id !== mission.id && m.stage !== "annulee");
      const reasons: string[] = [];
      const blocking: string[] = [];
      let score = 0;
      const clash = mine.find((m) => m.scheduled_date === mission.scheduled_date && overlap(m, mission));
      if (clash) blocking.push(`déjà en mission à ${clash.start_time?.slice(0, 5)} ce jour-là`);
      const sameDay = mine.filter((m) => m.scheduled_date === mission.scheduled_date).length;
      if (!clash && sameDay === 0) { score += 2; reasons.push("libre ce jour-là"); }
      if (mission.site_id && week.some((m) => m.staff_id === s.id && m.site_id === mission.site_id)) { score += 3; reasons.push("connaît déjà ce site"); }
      if (s.zone && mission.city && mission.city.toLowerCase().includes(s.zone.toLowerCase())) { score += 2; reasons.push(`secteur ${s.zone}`); }
      const hours = mine.reduce((a, m) => a + (m.duration_hours ?? 0), 0);
      if (s.weekly_capacity_hours) {
        const left = s.weekly_capacity_hours - hours;
        if (left < (mission.duration_hours ?? 0)) blocking.push(`capacité dépassée (${hours} h / ${s.weekly_capacity_hours} h cette semaine)`);
        else { score += Math.min(2, left / s.weekly_capacity_hours * 2); reasons.push(`${Math.round(left)} h disponibles cette semaine`); }
      } else {
        score -= hours / 40;
        reasons.push(`${hours} h prévues cette semaine`);
      }
      return { staff: s, score: Math.round(score * 10) / 10, reasons, blocking };
    })
    .sort((a, b) => (a.blocking.length ? 1 : 0) - (b.blocking.length ? 1 : 0) || b.score - a.score);
}
