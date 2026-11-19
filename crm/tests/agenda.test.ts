import { describe, expect, it } from "vitest";
import { coveredHours, weekBalance, type AgendaEvent } from "@/lib/domain/agenda";

const ev = (kind: AgendaEvent["kind"], start: string, end: string, allDay = false): AgendaEvent => ({ id: `${kind}${start}`, title: "x", start: `2026-11-${start}`, end: `2026-11-${end}`, allDay, kind, source: "test" });

describe("équilibre de la semaine", () => {
  it("fusionne les créneaux qui se chevauchent (une mission en double ne compte pas deux fois)", () => {
    expect(coveredHours([ev("operationnel", "16T09:00", "16T11:00"), ev("operationnel", "16T09:00", "16T11:00"), ev("operationnel", "16T10:00", "16T12:00"), ev("operationnel", "17T14:00", "17T15:30")])).toBe(4.5);
  });
  it("ignore les journées entières", () => {
    expect(coveredHours([ev("commercial", "16T00:00", "17T00:00", true)])).toBe(0);
  });
  it("alerte quand il n'y a aucun créneau commercial", () => {
    const b = weekBalance([ev("operationnel", "16T08:00", "16T16:00")]);
    expect(b.level).toBe("alerte");
    expect(b.operationnelH).toBe(8);
  });
  it("prévient quand le commercial est trop faible", () => {
    const b = weekBalance([ev("operationnel", "16T08:00", "16T18:00"), ev("operationnel", "17T08:00", "17T18:00"), ev("commercial", "18T10:00", "18T11:00")]);
    expect(b.level).toBe("attention");
    expect(b.message).toContain("3 h");
  });
  it("valide une semaine équilibrée, et ne compte pas le personnel", () => {
    const b = weekBalance([ev("operationnel", "16T08:00", "16T18:00"), ev("commercial", "17T09:00", "17T13:00"), ev("personnel", "18T09:00", "18T19:00")]);
    expect(b.level).toBe("ok");
    expect(b.commercialH).toBe(4);
    expect(weekBalance([ev("personnel", "18T09:00", "18T19:00")]).level).toBe("vide");
  });
});
