import { describe, it, expect } from "vitest";
import { baseGoal, agentVisits, jarvisRounds, freshInstructions } from "@/lib/jarvis/habbo/brain";
import { DESK_OF, HUB } from "@/lib/jarvis/habbo/map";
import { AGENTS } from "@/lib/jarvis/registry";
import type { Activity, Desk, OpenSpaceState } from "@/lib/jarvis/openspace";

const desk = (key: any, activity: Activity, over: Partial<Desk> = {}): Desk => ({ key, name: key, status: activity === "absent" ? "prevu" : "actif", activity, label: "", alerts: 0, urgent: 0, pending: 0, blocked: 0, tasks: 0, lastRunAt: null, lastSummary: null, topAlerts: [], openTasks: [], instructions: [], ...over });
const state = (desks: Desk[], links: OpenSpaceState["links"] = []): OpenSpaceState => ({ mode: "reel", generatedAt: new Date().toISOString(), installed: true, desks, links, feed: [], totals: { alerts: 0, pending: 0, tasks: 0, links: links.length } });

describe("comportement des personnages (jamais de fausse activité)", () => {
  it("il ne tape que si l'activité enregistrée est « travaille »", () => {
    for (const a of ["absent", "repos", "travaille", "attend_validation", "alerte"] as Activity[]) {
      const g = baseGoal(desk("finance", a));
      expect(g?.pose === "sit_work", a).toBe(a === "travaille");
    }
  });
  it("un agent pas construit n'est pas dans la pièce ; JARVIS n'a pas de bureau", () => {
    expect(baseGoal(desk("commercial", "absent"))).toBeNull();
    expect(baseGoal(desk("core", "repos"))).toBeNull();
  });
  it("chaque agent construit s'assoit à sa chaise", () => {
    for (const a of AGENTS.filter((x) => x.key !== "core")) expect(baseGoal(desk(a.key, "repos"))!.tile).toEqual(DESK_OF[a.key as keyof typeof DESK_OF].chair);
  });
  it("une demande en attente envoie le demandeur chez le destinataire, ou chez JARVIS", () => {
    const s = state([desk("finance", "repos"), desk("operations", "repos")], [
      { id: "1", from: "finance", to: "operations", type: "x", label: "contrat incomplet", status: "pending", at: "" },
      { id: "2", from: "operations", to: "core", type: "y", label: "y", status: "pending", at: "" },
      { id: "3", from: "finance", to: "operations", type: "z", label: "traitée", status: "handled", at: "" }
    ]);
    const v = agentVisits(s);
    expect(v).toHaveLength(2);
    expect(v[0]).toMatchObject({ who: "finance", for: "operations", tile: DESK_OF.operations.visit2 });
    expect(v[1]).toMatchObject({ who: "operations", for: "core" });
    expect(v[1].tile[1]).toBe(HUB[1]);
  });
  it("une demande venant d'un agent absent n'envoie personne", () => {
    expect(agentVisits(state([desk("commercial", "absent"), desk("finance", "repos")], [{ id: "1", from: "commercial", to: "finance", type: "x", label: "", status: "pending", at: "" }]))).toEqual([]);
  });
  it("JARVIS va d'abord voir les alertes urgentes, puis les validations ; jamais un poste absent", () => {
    const r = jarvisRounds(state([desk("finance", "attend_validation", { pending: 2 }), desk("operations", "alerte", { urgent: 1, alerts: 1 }), desk("rh", "absent", { urgent: 3 })]));
    expect(r.map((x) => [x.to, x.reason])).toEqual([["operations", "alerte"], ["finance", "validation"]]);
  });
  it("JARVIS apporte seulement les consignes récentes", () => {
    const now = Date.parse("2026-11-08T10:00:00Z");
    const ins = (id: string, ago: number) => ({ id, body: "x", kind: "libre" as const, command: null, status: "en_attente" as const, result: null, created_at: new Date(now - ago).toISOString() });
    const s = state([desk("finance", "repos", { instructions: [ins("a", 10_000), ins("b", 600_000)] })]);
    expect(freshInstructions(s, now)).toEqual([{ id: "a", agent: "finance" }]);
  });
});
