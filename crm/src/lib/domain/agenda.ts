/**
 * Équilibre de la semaine : combien d'heures sur le terrain (opérationnel) et combien pour développer l'entreprise (commercial).
 * Fonction pure. Les créneaux qui se chevauchent dans une même famille ne sont comptés qu'une fois
 * (une mission présente à la fois dans le CRM et dans Outlook ne compte pas double).
 */
export type AgendaKind = "operationnel" | "commercial" | "personnel";
export type AgendaEvent = { id: string; title: string; start: string; end: string; allDay: boolean; kind: AgendaKind; source: string; location?: string | null; href?: string | null };
export type Balance = { operationnelH: number; commercialH: number; commercialShare: number | null; level: "ok" | "attention" | "alerte" | "vide"; message: string };

/** En dessous de cette part de commercial, la semaine est jugée trop opérationnelle. */
export const COMMERCIAL_TARGET_SHARE = 0.2;
/** Minimum d'heures de commercial visé par semaine. */
export const COMMERCIAL_TARGET_HOURS = 4;

const toMin = (wall: string) => Date.UTC(+wall.slice(0, 4), +wall.slice(5, 7) - 1, +wall.slice(8, 10), +wall.slice(11, 13), +wall.slice(14, 16)) / 60000;

/** Heures couvertes par des créneaux, chevauchements fusionnés. Les évènements « journée entière » ne comptent pas. */
export function coveredHours(events: Pick<AgendaEvent, "start" | "end" | "allDay">[]): number {
  const spans = events.filter((e) => !e.allDay).map((e) => [toMin(e.start), toMin(e.end)] as [number, number]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  let total = 0, curStart = NaN, curEnd = NaN;
  for (const [a, b] of spans) {
    if (Number.isNaN(curStart)) { curStart = a; curEnd = b; }
    else if (a <= curEnd) curEnd = Math.max(curEnd, b);
    else { total += curEnd - curStart; curStart = a; curEnd = b; }
  }
  if (!Number.isNaN(curStart)) total += curEnd - curStart;
  return Math.round((total / 60) * 10) / 10;
}

const h = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`;

export function weekBalance(events: AgendaEvent[]): Balance {
  const operationnelH = coveredHours(events.filter((e) => e.kind === "operationnel"));
  const commercialH = coveredHours(events.filter((e) => e.kind === "commercial"));
  const total = operationnelH + commercialH;
  if (total === 0) return { operationnelH, commercialH, commercialShare: null, level: "vide", message: "Aucun créneau de terrain ni de commercial cette semaine." };
  const commercialShare = commercialH / total;
  if (commercialH === 0) return { operationnelH, commercialH, commercialShare, level: "alerte", message: `${h(operationnelH)} de terrain et aucun créneau commercial cette semaine. Bloquez au moins ${COMMERCIAL_TARGET_HOURS} h pour prospecter et relancer.` };
  if (commercialShare < COMMERCIAL_TARGET_SHARE && commercialH < COMMERCIAL_TARGET_HOURS) {
    const missing = Math.round((COMMERCIAL_TARGET_HOURS - commercialH) * 10) / 10;
    return { operationnelH, commercialH, commercialShare, level: "attention", message: `Trop d'opérationnel : ${h(operationnelH)} de terrain pour ${h(commercialH)} de commercial. Il manque ${h(missing)} pour atteindre ${COMMERCIAL_TARGET_HOURS} h de commercial.` };
  }
  return { operationnelH, commercialH, commercialShare, level: "ok", message: `Semaine équilibrée : ${h(commercialH)} de commercial pour ${h(operationnelH)} de terrain.` };
}
