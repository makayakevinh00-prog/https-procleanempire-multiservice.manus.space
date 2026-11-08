/**
 * Analyse « intelligente » d'une mission : fonctions pures, à partir de FAITS enregistrés (pointage, photos, check-list, prix).
 * Aucune donnée inventée : quand un fait manque, l'analyse le dit au lieu de deviner.
 */
export interface MissionFacts {
  date: string; startTime: string | null; plannedHours: number | null; stage: string;
  hasAssignee: boolean; arrivedAt: string | null; departedAt: string | null;
  arrivedVerified: boolean | null; arrivedDistanceM: number | null;
  checklist: { label: string; done: boolean; room?: string | null }[];
  photos: { kind: string; at: string }[]; openIssues: number;
  priceHt: number | null; billable: boolean;
}
export type Level = "ok" | "info" | "warn" | "alert";
export interface Insight { level: Level; key: string; title: string; detail?: string }
export interface Analysis {
  insights: Insight[]; recommendation: string | null;
  metrics: { realHours: number | null; plannedHours: number | null; lateMin: number | null; checklistDone: number; checklistTotal: number; photosBefore: number; photosAfter: number; margin: number | null; marginPct: number | null };
}

const FINISHED = ["terminee", "a_verifier", "validee", "facturable", "facturee"];
const BEFORE_ARRIVAL = ["planifiee", "affectee", "en_route"];

/** Instant UTC d'une date/heure locales de Paris (gère l'heure d'été). */
export function parisInstant(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number); const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const off = (t: number) => { const p = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(t)); const g = (k: string) => Number(p.find((x) => x.type === k)!.value); return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute")) - t; };
  let t = guess - off(guess); t = guess - off(t);
  return new Date(t);
}
const hm = (mins: number) => { const m = Math.round(Math.abs(mins)); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`; };
const parisHHMM = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });

export function analyseMission(f: MissionFacts, now: Date, hourlyCost: number): Analysis {
  const ins: Insight[] = [];
  const finished = FINISHED.includes(f.stage);
  const planned = f.startTime ? parisInstant(f.date, f.startTime.slice(0, 5)) : null;
  const daysAhead = (parisInstant(f.date, "00:00").getTime() - now.getTime()) / 86_400_000;

  if (!f.hasAssignee && !finished && daysAhead <= 2) ins.push({ level: "alert", key: "sans_intervenant", title: "Sans intervenant", detail: daysAhead < 0 ? "La date est passée." : "À affecter avant le passage." });

  let lateMin: number | null = null;
  if (f.arrivedAt && planned) {
    lateMin = Math.round((new Date(f.arrivedAt).getTime() - planned.getTime()) / 60_000);
    ins.push(lateMin <= 5 ? { level: "ok", key: "ponctualite", title: lateMin < -5 ? `Arrivée en avance (${hm(lateMin)})` : "Arrivée à l'heure", detail: `Arrivée à ${parisHHMM(f.arrivedAt)}, prévue à ${f.startTime!.slice(0, 5)}.` }
      : { level: lateMin > 15 ? "warn" : "info", key: "ponctualite", title: `Arrivée avec ${hm(lateMin)} de retard`, detail: `Arrivée à ${parisHHMM(f.arrivedAt)}, prévue à ${f.startTime!.slice(0, 5)}.` });
  } else if (!f.arrivedAt && planned && BEFORE_ARRIVAL.includes(f.stage) && now.getTime() > planned.getTime() + 15 * 60_000 && now.getTime() < planned.getTime() + 18 * 3_600_000) {
    lateMin = Math.round((now.getTime() - planned.getTime()) / 60_000);
    ins.push({ level: "alert", key: "retard", title: "En retard : arrivée non pointée", detail: `Prévue à ${f.startTime!.slice(0, 5)}, ${hm(lateMin)} de retard.` });
  }

  if (f.arrivedAt) {
    if (f.arrivedVerified === false) ins.push({ level: "warn", key: "hors_zone", title: "Arrivée hors de la zone du site", detail: f.arrivedDistanceM != null ? `Pointage à environ ${f.arrivedDistanceM} m du site.` : undefined });
    else if (f.arrivedVerified === null) ins.push({ level: "info", key: "position", title: "Position non vérifiable", detail: "Le site n'a pas de coordonnées GPS enregistrées." });
    else ins.push({ level: "ok", key: "position", title: "Position vérifiée sur le site", detail: f.arrivedDistanceM != null ? `À ${f.arrivedDistanceM} m de l'adresse.` : undefined });
  }

  let realHours: number | null = null;
  if (f.arrivedAt && f.departedAt) realHours = (new Date(f.departedAt).getTime() - new Date(f.arrivedAt).getTime()) / 3_600_000;
  if (realHours != null && f.plannedHours) {
    const r = realHours / f.plannedHours;
    if (r > 1.3) ins.push({ level: "warn", key: "duree", title: `Durée dépassée de ${Math.round((r - 1) * 100)} %`, detail: `${hm(realHours * 60)} sur place pour ${hm(f.plannedHours * 60)} prévues.` });
    else if (r < 0.6) ins.push({ level: "warn", key: "duree", title: "Durée très courte", detail: `${hm(realHours * 60)} sur place pour ${hm(f.plannedHours * 60)} prévues : à contrôler.` });
    else ins.push({ level: "ok", key: "duree", title: "Durée conforme", detail: `${hm(realHours * 60)} sur place pour ${hm(f.plannedHours * 60)} prévues.` });
  } else if (f.arrivedAt && !f.departedAt && !finished) {
    const el = (now.getTime() - new Date(f.arrivedAt).getTime()) / 60_000;
    if (el >= 0 && el < 16 * 60) ins.push({ level: f.plannedHours && el > f.plannedHours * 60 * 1.3 ? "warn" : "info", key: "en_cours", title: `Sur place depuis ${hm(el)}`, detail: f.plannedHours ? `${hm(f.plannedHours * 60)} prévues.` : undefined });
  }

  const done = f.checklist.filter((c) => c.done).length, total = f.checklist.length;
  if (total) {
    if (finished && done < total) ins.push({ level: "warn", key: "checklist", title: `Check-list incomplète (${done}/${total})`, detail: f.checklist.filter((c) => !c.done).slice(0, 3).map((c) => c.label).join(" · ") });
    else if (done === total) ins.push({ level: "ok", key: "checklist", title: `Check-list complète (${total}/${total})` });
  }

  const before = f.photos.filter((p) => p.kind === "avant").length, after = f.photos.filter((p) => p.kind === "apres").length;
  if (finished && after === 0) ins.push({ level: "warn", key: "photos", title: "Aucune photo « après »", detail: "Sans photo, la qualité ne peut pas être contrôlée." });
  else if (finished && before === 0) ins.push({ level: "info", key: "photos", title: "Pas de photo « avant »" });
  else if (before > 0 && after > 0) ins.push({ level: "ok", key: "photos", title: `Photos avant/après (${before}/${after})` });

  if (f.openIssues > 0) ins.push({ level: "alert", key: "anomalies", title: `${f.openIssues} anomalie(s) ouverte(s)`, detail: "La validation est bloquée tant qu'elles ne sont pas réglées." });

  let margin: number | null = null, marginPct: number | null = null;
  if (f.billable && f.priceHt != null && f.priceHt > 0 && (realHours ?? f.plannedHours)) {
    const h = (realHours ?? f.plannedHours)!;
    margin = f.priceHt - h * hourlyCost; marginPct = (margin / f.priceHt) * 100;
    if (margin < 0) ins.push({ level: "warn", key: "marge", title: "Mission déficitaire (estimation)", detail: `${Math.round(f.priceHt)} € facturés pour ${hm(h * 60)} de travail à ${hourlyCost} €/h.` });
  }

  const order: Record<Level, number> = { alert: 0, warn: 1, info: 2, ok: 3 };
  ins.sort((a, b) => order[a.level] - order[b.level]);
  const problems = ins.filter((i) => i.level === "alert" || i.level === "warn");
  let recommendation: string | null = null;
  if (finished && ["terminee", "a_verifier"].includes(f.stage)) recommendation = problems.length ? `À vérifier avant validation : ${problems.map((p) => p.title.toLowerCase()).slice(0, 3).join(" ; ")}.` : "Prête à valider : tout est conforme.";
  else if (problems.length) recommendation = `À traiter : ${problems.map((p) => p.title.toLowerCase()).slice(0, 2).join(" ; ")}.`;
  return { insights: ins, recommendation, metrics: { realHours, plannedHours: f.plannedHours, lateMin, checklistDone: done, checklistTotal: total, photosBefore: before, photosAfter: after, margin, marginPct } };
}

export interface TimelineEvent { at: string; label: string; detail?: string; tone: "neutral" | "ok" | "warn" | "alert" }
/** Chronologie : pointages, étapes, photos (groupées), anomalies. Tout vient de lignes enregistrées. */
export function buildTimeline(x: {
  arrivedAt: string | null; departedAt: string | null; arrivedVerified: boolean | null; arrivedDistanceM: number | null;
  photos: { kind: string; at: string }[]; issues: { at: string; description: string; severity: string; kind: string }[];
  history: { at: string; actor: string | null; stage?: [string | null, string | null] | null }[]; stageLabel: (s: string) => string;
}): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  if (x.arrivedAt) ev.push({ at: x.arrivedAt, label: "Arrivée pointée", detail: x.arrivedVerified === true ? `Position vérifiée${x.arrivedDistanceM != null ? ` (${x.arrivedDistanceM} m)` : ""}` : x.arrivedVerified === false ? `Hors zone${x.arrivedDistanceM != null ? ` (${x.arrivedDistanceM} m)` : ""}` : "Position non vérifiée", tone: x.arrivedVerified === false ? "warn" : "ok" });
  if (x.departedAt) ev.push({ at: x.departedAt, label: "Départ pointé", tone: "ok" });
  for (const kind of ["avant", "apres", "anomalie"]) {
    const ps = x.photos.filter((p) => p.kind === kind).sort((a, b) => a.at.localeCompare(b.at));
    if (ps.length) ev.push({ at: ps[0].at, label: `${ps.length} photo${ps.length > 1 ? "s" : ""} ${kind === "apres" ? "après" : kind === "avant" ? "avant" : "du problème"}`, tone: kind === "anomalie" ? "warn" : "neutral" });
  }
  for (const i of x.issues) ev.push({ at: i.at, label: i.kind === "reclamation" ? "Réclamation" : "Anomalie signalée", detail: i.description.slice(0, 120), tone: i.severity === "haute" ? "alert" : "warn" });
  for (const h of x.history) if (h.stage && h.stage[1]) ev.push({ at: h.at, label: `Étape : ${x.stageLabel(h.stage[1])}`, detail: h.actor ? `par ${h.actor}` : undefined, tone: "neutral" });
  return ev.sort((a, b) => a.at.localeCompare(b.at));
}

export interface InterventionReport { verdict: "conforme" | "a_verifier" | "non_conforme" | "en_attente"; verdictLabel: string; text: string }
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).replace(":", " h ");
/** Rapport d'intervention rédigé à partir des seuls faits enregistrés ; le verdict découle de l'analyse (jamais d'une impression). */
export function interventionReport(f: MissionFacts, a: Analysis, ctx: { title: string; site: string | null; agent: string | null }): InterventionReport {
  const finished = ["terminee", "a_verifier", "validee", "facturable", "facturee"].includes(f.stage);
  if (!finished) return { verdict: "en_attente", verdictLabel: "En attente", text: "Le rapport sera établi à la fin de l'intervention, à partir du pointage, des photos et de la check-list." };
  const alerts = a.insights.filter((i) => i.level === "alert"), warns = a.insights.filter((i) => i.level === "warn");
  const verdict = alerts.length ? "non_conforme" : warns.length ? "a_verifier" : "conforme";
  const parts: string[] = [];
  parts.push(`Intervention « ${ctx.title} »${ctx.site ? ` sur le site ${ctx.site}` : ""}${ctx.agent ? `, réalisée par ${ctx.agent}` : ""}.`);
  if (f.arrivedAt) parts.push(`Arrivée pointée à ${hhmm(f.arrivedAt)}${a.metrics.lateMin != null ? (a.metrics.lateMin > 5 ? `, avec ${Math.round(a.metrics.lateMin)} min de retard` : ", à l'heure") : ""}${f.departedAt ? `, départ à ${hhmm(f.departedAt)}` : ""}.`);
  if (a.metrics.realHours != null) parts.push(`Durée sur place : ${Math.floor(a.metrics.realHours)} h ${String(Math.round((a.metrics.realHours % 1) * 60)).padStart(2, "0")}${a.metrics.plannedHours ? ` pour ${a.metrics.plannedHours} h prévues` : ""}.`);
  if (a.metrics.checklistTotal) parts.push(`Check-list : ${a.metrics.checklistDone} point(s) sur ${a.metrics.checklistTotal} validé(s).`);
  parts.push(`Photos : ${a.metrics.photosBefore} avant, ${a.metrics.photosAfter} après.`);
  if (alerts.length || warns.length) parts.push(`Points d'attention : ${[...alerts, ...warns].map((i) => i.title.toLowerCase()).join(" ; ")}.`);
  else parts.push("Aucun point de non-conformité relevé.");
  return { verdict, verdictLabel: verdict === "conforme" ? "Conforme" : verdict === "a_verifier" ? "À vérifier" : "Non conforme", text: parts.join(" ") };
}
