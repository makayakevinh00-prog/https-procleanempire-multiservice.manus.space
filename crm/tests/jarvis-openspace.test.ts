import { describe, it, expect } from "vitest";
import { buildOpenSpaceState, demoState, relTime, RECENT_MS, type Rows } from "@/lib/jarvis/openspace";
import { AGENTS } from "@/lib/jarvis/registry";

const NOW = new Date("2026-11-07T12:00:00Z");
const ago = (s: number) => new Date(NOW.getTime() - s * 1000).toISOString();
const rows = (o: Partial<Rows> = {}): Rows => ({ agents: [{ key: "finance", status: "actif", enabled: true, last_run_at: null }, { key: "core", status: "actif", enabled: true, last_run_at: null }], alerts: [], actions: [], tasks: [], events: [], runs: [], instructions: [], ...o });
const desk = (s: ReturnType<typeof buildOpenSpaceState>, k: string) => s.desks.find((d) => d.key === k)!;

describe("open space — état réel", () => {
  it("9 postes ; les agents prévus sont « absents », jamais montrés en activité", () => {
    const s = buildOpenSpaceState(rows(), NOW);
    expect(s.desks).toHaveLength(9);
    for (const a of AGENTS.filter((x) => x.status === "prevu")) expect(desk(s, a.key)).toMatchObject({ activity: "absent", label: "Pas encore construit" });
  });
  it("« travaille » seulement après un passage terminé il y a moins de 2 minutes, sinon repos : aucune activité sans trace", () => {
    const run = (sec: number) => ({ id: "r", agent_key: "finance", started_at: ago(sec + 1), finished_at: ago(sec), ok: true, summary: "x", trigger: "manuel" });
    expect(desk(buildOpenSpaceState(rows({ runs: [run(30)] }), NOW), "finance").activity).toBe("travaille");
    expect(desk(buildOpenSpaceState(rows({ runs: [run(RECENT_MS / 1000 + 60)] }), NOW), "finance").activity).toBe("repos");
    expect(desk(buildOpenSpaceState(rows(), NOW), "finance")).toMatchObject({ activity: "repos", label: "Aucun passage encore" });
  });
  it("priorité d'affichage : propositions à valider, puis alerte urgente", () => {
    const action = { id: "a", agent_key: "finance", kind: "contact_client", level: "L2", status: "proposed", title: "t", created_at: ago(900), decided_at: null };
    const urgent = { id: "u", agent_key: "finance", severity: "urgent", title: "u", status: "open", first_seen_at: ago(900) };
    expect(desk(buildOpenSpaceState(rows({ actions: [action], alerts: [urgent] }), NOW), "finance").activity).toBe("attend_validation");
    expect(desk(buildOpenSpaceState(rows({ alerts: [urgent] }), NOW), "finance").activity).toBe("alerte");
  });
  it("un agent désactivé par le patron est signalé comme tel", () => {
    const s = buildOpenSpaceState(rows({ agents: [{ key: "finance", status: "actif", enabled: false, last_run_at: null }] }), NOW);
    expect(desk(s, "finance").label).toBe("Désactivé par vous");
  });
  it("les alertes résolues ne comptent pas ; les actions bloquées L3 sont comptées à part", () => {
    const s = buildOpenSpaceState(rows({
      alerts: [{ id: "1", agent_key: "finance", severity: "info", title: "a", status: "resolved", first_seen_at: ago(5000) }, { id: "2", agent_key: "finance", severity: "info", title: "b", status: "open", first_seen_at: ago(50) }],
      actions: [{ id: "x", agent_key: "finance", kind: "issue_credit_note", level: "L3", status: "blocked", title: "Avoir", created_at: ago(50), decided_at: null }]
    }), NOW);
    expect(desk(s, "finance")).toMatchObject({ alerts: 1, pending: 0, blocked: 1 });
    expect(s.totals).toMatchObject({ alerts: 1, pending: 0 });
  });
  it("collaborations : demandes en attente + traitées récemment ; pas les anciennes ni celles d'agents inconnus", () => {
    const ev = (id: string, status: string, handled: string | null, to = "operations") => ({ id, type: "contract.incomplete", source_agent: "finance", target_agent: to, status, payload: { label: "L" }, created_at: ago(7200), handled_at: handled });
    const s = buildOpenSpaceState(rows({ events: [ev("1", "pending", null), ev("2", "handled", ago(600)), ev("3", "handled", ago(7200)), ev("4", "pending", null, "inconnu")] }), NOW);
    expect(s.links.map((l) => [l.id, l.status])).toEqual([["1", "pending"], ["2", "handled"]]);
    expect(s.totals.links).toBe(1);
  });
  it("fil d'activité : du plus récent au plus ancien, limité à 40, avec vos décisions", () => {
    const actions = Array.from({ length: 30 }, (_, i) => ({ id: `a${i}`, agent_key: "finance", kind: "contact_client", level: "L2", status: i === 0 ? "executed" : "proposed", title: `T${i}`, created_at: ago(1000 + i * 10), decided_at: i === 0 ? ago(5) : null }));
    const s = buildOpenSpaceState(rows({ actions, tasks: Array.from({ length: 30 }, (_, i) => ({ id: `t${i}`, agent_key: "finance", title: `K${i}`, status: "todo", created_at: ago(2000 + i), done_at: null })) }), NOW);
    expect(s.feed).toHaveLength(40);
    expect(s.feed[0].kind).toBe("decision");
    expect(s.feed[0].text).toContain("Vous avez validé");
    const times = s.feed.map((f) => f.at);
    expect([...times].sort().reverse()).toEqual(times);
  });
  it("les instructions s'affichent sur le poste concerné ; le texte libre est dit « en attente »", () => {
    const s = buildOpenSpaceState(rows({ instructions: [{ id: "i1", agent_key: "finance", kind: "libre", command: null, body: "surveille SWYFO", status: "en_attente", result: null, created_at: ago(60) }] as any }), NOW);
    expect(desk(s, "finance").instructions).toHaveLength(1);
    expect(s.feed[0].text).toContain("en attente");
  });
  it("socle non installé : état vide signalé, pas de plantage", () => {
    const s = buildOpenSpaceState(rows({ agents: [] }), NOW, false);
    expect(s.installed).toBe(false);
    expect(s.desks).toHaveLength(9);
  });
});

describe("open space — démonstration", () => {
  it("toujours étiquetée « demo », 9 postes, aucune donnée réelle", () => {
    for (const tick of [0, 3, 7, 20]) {
      const s = demoState(tick, NOW);
      expect(s.mode).toBe("demo");
      expect(s.desks).toHaveLength(9);
      for (const d of s.desks) expect(d.lastSummary).toContain("Démonstration");
      expect(s.feed.every((f) => f.text.length > 0)).toBe(true);
    }
  });
  it("déterministe (même étape, même scénario) et cyclique", () => {
    const strip = (s: ReturnType<typeof demoState>) => JSON.stringify({ d: s.desks.map((d) => [d.key, d.activity]), l: s.links.map((l) => [l.from, l.to, l.status]), f: s.feed.map((f) => f.text) });
    expect(strip(demoState(5, NOW))).toBe(strip(demoState(5, new Date(NOW.getTime() + 99999))));
    expect(strip(demoState(0, NOW))).toBe(strip(demoState(15, NOW)));
  });
  it("le scénario fait réellement évoluer l'écran", () => {
    const seen = new Set(Array.from({ length: 15 }, (_, t) => JSON.stringify(demoState(t, NOW).desks.map((d) => d.activity))));
    expect(seen.size).toBeGreaterThan(6);
  });
});

describe("relTime", () => {
  it("formate en français, sans dériver", () => {
    const t = NOW.getTime();
    expect(relTime(ago(2), t)).toBe("à l'instant");
    expect(relTime(ago(41), t)).toBe("il y a 41 s");
    expect(relTime(ago(200), t)).toBe("il y a 3 min");
    expect(relTime(ago(7300), t)).toBe("il y a 2 h");
    expect(relTime(ago(200000), t)).toBe("il y a 2 j");
    expect(relTime(ago(-50), t)).toBe("à l'instant");
  });
});
