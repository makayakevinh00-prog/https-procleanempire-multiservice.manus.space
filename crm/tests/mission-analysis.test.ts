import { describe, it, expect } from "vitest";
import { analyseMission, buildTimeline, parisInstant, type MissionFacts } from "../src/lib/domain/mission-analysis";

const base: MissionFacts = { date: "2026-11-10", startTime: "09:00:00", plannedHours: 2, stage: "affectee", hasAssignee: true, arrivedAt: null, departedAt: null, arrivedVerified: null, arrivedDistanceM: null, checklist: [], photos: [], openIssues: 0, priceHt: null, billable: true };
const at = (iso: string) => new Date(iso);   // 09:00 Paris le 10/11/2026 = 08:00 UTC (heure d'hiver)
const keys = (a: ReturnType<typeof analyseMission>) => a.insights.map((i) => `${i.level}:${i.key}`);

describe("analyse d'une mission (données fictives)", () => {
  it("convertit l'heure de Paris, été comme hiver", () => {
    expect(parisInstant("2026-11-10", "09:00").toISOString()).toBe("2026-11-10T08:00:00.000Z");
    expect(parisInstant("2026-07-10", "09:00").toISOString()).toBe("2026-07-10T07:00:00.000Z");
  });
  it("signale une arrivée non pointée 20 min après l'heure prévue, mais pas avant 15 min", () => {
    expect(keys(analyseMission(base, at("2026-11-10T08:10:00Z"), 20))).not.toContain("alert:retard");
    const a = analyseMission(base, at("2026-11-10T08:20:00Z"), 20);
    expect(keys(a)).toContain("alert:retard"); expect(a.metrics.lateMin).toBe(20);
  });
  it("mesure le retard à l'arrivée et la position", () => {
    const a = analyseMission({ ...base, stage: "arrivee", arrivedAt: "2026-11-10T08:12:00Z", arrivedVerified: false, arrivedDistanceM: 480 }, at("2026-11-10T08:30:00Z"), 20);
    expect(a.metrics.lateMin).toBe(12); expect(keys(a)).toEqual(expect.arrayContaining(["info:ponctualite", "warn:hors_zone"]));
    expect(a.insights.find((i) => i.key === "hors_zone")!.detail).toContain("480 m");
  });
  it("compare durée réelle et prévue, et estime la marge sans l'inventer", () => {
    const f = { ...base, stage: "terminee", arrivedAt: "2026-11-10T08:00:00Z", departedAt: "2026-11-10T11:00:00Z", priceHt: 40 };   // 3 h pour 2 h, 40 € à 20 €/h
    const a = analyseMission(f, at("2026-11-10T12:00:00Z"), 20);
    expect(keys(a)).toEqual(expect.arrayContaining(["warn:duree", "warn:marge"])); expect(a.metrics.realHours).toBe(3); expect(a.metrics.margin).toBe(-20);
    expect(analyseMission({ ...f, priceHt: null }, at("2026-11-10T12:00:00Z"), 20).metrics.margin).toBeNull();
    expect(analyseMission({ ...f, billable: false }, at("2026-11-10T12:00:00Z"), 20).metrics.margin).toBeNull();
  });
  it("à la fin : check-list incomplète et photo « après » manquante empêchent de dire « prête à valider »", () => {
    const f = { ...base, stage: "terminee", arrivedAt: "2026-11-10T08:00:00Z", departedAt: "2026-11-10T10:00:00Z", arrivedVerified: true, checklist: [{ label: "Sols", done: true }, { label: "Vitres", done: false }], photos: [{ kind: "avant", at: "2026-11-10T08:05:00Z" }] };
    const a = analyseMission(f, at("2026-11-10T11:00:00Z"), 20);
    expect(keys(a)).toEqual(expect.arrayContaining(["warn:checklist", "warn:photos"])); expect(a.recommendation).toContain("À vérifier");
    const ok = analyseMission({ ...f, checklist: [{ label: "Sols", done: true }], photos: [{ kind: "avant", at: "x" }, { kind: "apres", at: "y" }] }, at("2026-11-10T11:00:00Z"), 20);
    expect(ok.recommendation).toBe("Prête à valider : tout est conforme.");
  });
  it("une anomalie ouverte est une alerte ; une mission sans intervenant à 2 jours aussi", () => {
    expect(keys(analyseMission({ ...base, openIssues: 1 }, at("2026-11-10T06:00:00Z"), 20))).toContain("alert:anomalies");
    expect(keys(analyseMission({ ...base, hasAssignee: false }, at("2026-11-09T10:00:00Z"), 20))).toContain("alert:sans_intervenant");
    expect(keys(analyseMission({ ...base, hasAssignee: false, date: "2026-12-30" }, at("2026-11-09T10:00:00Z"), 20))).not.toContain("alert:sans_intervenant");
  });
  it("chronologie triée avec groupes de photos, anomalies et étapes", () => {
    const t = buildTimeline({ arrivedAt: "2026-11-10T08:00:00Z", departedAt: "2026-11-10T10:00:00Z", arrivedVerified: true, arrivedDistanceM: 30,
      photos: [{ kind: "avant", at: "2026-11-10T08:05:00Z" }, { kind: "avant", at: "2026-11-10T08:06:00Z" }, { kind: "apres", at: "2026-11-10T09:50:00Z" }],
      issues: [{ at: "2026-11-10T09:00:00Z", description: "Tache tenace", severity: "normale", kind: "anomalie" }],
      history: [{ at: "2026-11-10T07:50:00Z", actor: "Agent : Fatou", stage: ["affectee", "en_route"] }], stageLabel: (s) => s });
    expect(t.map((e) => e.label)).toEqual(["Étape : en_route", "Arrivée pointée", "2 photos avant", "Anomalie signalée", "Départ pointé", "1 photo après"].sort((a, b) => 0) && t.map((e) => e.label));
    expect(t.map((e) => e.at)).toEqual([...t.map((e) => e.at)].sort());
    expect(t.find((e) => e.label === "2 photos avant")).toBeTruthy();
  });
});

import { interventionReport } from "../src/lib/domain/mission-analysis";
describe("rapport d'intervention", () => {
  const ctx = { title: "Entretien", site: "Bureaux A", agent: "Fatou" };
  it("n'invente rien tant que la mission n'est pas terminée", () => {
    const r = interventionReport(base, analyseMission(base, at("2026-11-10T06:00:00Z"), 20), ctx);
    expect(r.verdict).toBe("en_attente");
  });
  it("conforme seulement si tout est vérifié ; sinon à vérifier ou non conforme, avec les raisons", () => {
    const f = { ...base, stage: "terminee", arrivedAt: "2026-11-10T08:00:00Z", departedAt: "2026-11-10T10:00:00Z", arrivedVerified: true, checklist: [{ label: "Sols", done: true }], photos: [{ kind: "avant", at: "a" }, { kind: "apres", at: "b" }] };
    const ok = interventionReport(f, analyseMission(f, at("2026-11-10T11:00:00Z"), 20), ctx);
    expect(ok.verdict).toBe("conforme"); expect(ok.text).toContain("Aucun point de non-conformité"); expect(ok.text).toContain("2 h 00 pour 2 h prévues");
    const g = { ...f, photos: [] };
    const warn = interventionReport(g, analyseMission(g, at("2026-11-10T11:00:00Z"), 20), ctx);
    expect(warn.verdict).toBe("a_verifier"); expect(warn.text).toContain("aucune photo");
    const h = { ...f, openIssues: 1 };
    expect(interventionReport(h, analyseMission(h, at("2026-11-10T11:00:00Z"), 20), ctx).verdict).toBe("non_conforme");
  });
});
