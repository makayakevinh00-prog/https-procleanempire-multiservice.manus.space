import { describe, it, expect } from "vitest";
import { STAGES, nextStage, suggestAgents, MANUAL_STAGES, type StaffLite, type MissionLite } from "@/lib/domain/missions";

const staff = (id: string, extra: Partial<StaffLite> = {}): StaffLite => ({ id, full_name: id, zone: null, weekly_capacity_hours: null, active: true, ...extra });
const mission = (id: string, extra: Partial<MissionLite> = {}): MissionLite => ({ id, staff_id: null, site_id: "S1", scheduled_date: "2026-11-10", start_time: "09:00", duration_hours: 2, stage: "planifiee", city: "Paris", ...extra });

describe("étapes de mission", () => {
  it("12 étapes, « facturée » jamais choisie à la main", () => {
    expect(STAGES).toHaveLength(12);
    expect(MANUAL_STAGES).not.toContain("facturee");
  });
  it("propose l'étape suivante du cycle", () => {
    expect(nextStage("affectee")).toBe("en_route");
    expect(nextStage("en_cours")).toBe("terminee");
    expect(nextStage("facturee")).toBeNull();
    expect(nextStage("annulee")).toBeNull();
  });
});

describe("suggestion d'intervenant", () => {
  const m = mission("M");
  it("écarte l'agent déjà occupé sur le même créneau", () => {
    const r = suggestAgents(m, [staff("A"), staff("B")], [mission("X", { staff_id: "A", start_time: "10:00", site_id: "S2" })]);
    expect(r[0].staff.id).toBe("B");
    expect(r[1].blocking[0]).toMatch(/déjà en mission à 10:00/);
  });
  it("préfère celui qui connaît le site et le bon secteur", () => {
    const r = suggestAgents(m, [staff("A"), staff("B", { zone: "Paris" })], [mission("Y", { staff_id: "B", scheduled_date: "2026-11-11" })]);
    expect(r[0].staff.id).toBe("B");
    expect(r[0].reasons).toEqual(expect.arrayContaining(["connaît déjà ce site", "secteur Paris"]));
  });
  it("bloque si la capacité hebdo est dépassée, ignore les agents inactifs", () => {
    const r = suggestAgents(m, [staff("A", { weekly_capacity_hours: 3 }), staff("Z", { active: false })],
      [mission("W", { staff_id: "A", scheduled_date: "2026-11-09", duration_hours: 2 })]);
    expect(r).toHaveLength(1);
    expect(r[0].blocking[0]).toMatch(/capacité dépassée/);
  });
  it("une heure inconnue n'est jamais présentée comme un conflit", () => {
    const r = suggestAgents(mission("M", { start_time: null }), [staff("A")], [mission("X", { staff_id: "A", start_time: null })]);
    expect(r[0].blocking).toEqual([]);
  });
});
