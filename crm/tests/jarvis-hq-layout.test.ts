import { describe, it, expect } from "vitest";
import { ROOMS, ROOM_BY_ID, AGENT_ROOM, WORLD, MEET_SEATS, seatOf, viewOf, poseOf, collaborators, OWNER_SEAT } from "@/lib/jarvis/hq/layout";
import { AGENTS } from "@/lib/jarvis/registry";
import type { Activity } from "@/lib/jarvis/openspace";

describe("plan des locaux", () => {
  it("toutes les pièces demandées existent", () => {
    for (const id of ["direction", "finance", "commercial", "operations", "relation", "marketing", "studio", "rh", "juridique", "collab", "hub", "reception"]) expect(ROOM_BY_ID[id as keyof typeof ROOM_BY_ID], id).toBeTruthy();
  });
  it("chaque agent a une pièce, un poste dans cette pièce, et aucune pièce ne dépasse le monde ni n'en chevauche une autre", () => {
    for (const a of AGENTS) {
      const r = ROOM_BY_ID[AGENT_ROOM[a.key]], [x, y] = seatOf(a.key);
      expect(x).toBeGreaterThan(r.x); expect(x).toBeLessThan(r.x + r.w); expect(y).toBeGreaterThan(r.y); expect(y).toBeLessThan(r.y + r.h);
    }
    for (const r of ROOMS) { expect(r.x + r.w).toBeLessThanOrEqual(WORLD.w); expect(r.y + r.h).toBeLessThanOrEqual(WORLD.h); }
    for (let i = 0; i < ROOMS.length; i++) for (let j = i + 1; j < ROOMS.length; j++) {
      const a = ROOMS[i], b = ROOMS[j];
      expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.id} chevauche ${b.id}`).toBe(true);
    }
  });
  it("les places de réunion sont dans l'espace de collaboration, et le dirigeant a son bureau", () => {
    const c = ROOM_BY_ID.collab;
    for (const [x, y] of MEET_SEATS) { expect(x).toBeGreaterThan(c.x); expect(x).toBeLessThan(c.x + c.w); expect(y).toBeGreaterThan(c.y); expect(y).toBeLessThan(c.y + c.h); }
    expect(MEET_SEATS.length).toBeGreaterThanOrEqual(8);
    const d = ROOM_BY_ID.direction; expect(OWNER_SEAT[0]).toBeGreaterThan(d.x); expect(OWNER_SEAT[0]).toBeLessThan(d.x + d.w);
  });
  it("caméra : vue générale = tout le monde ; vue d'une pièce = la pièce, jamais hors du monde", () => {
    expect(viewOf("all")).toEqual({ x: 0, y: 0, w: WORLD.w, h: WORLD.h });
    for (const r of ROOMS) { const v = viewOf(r.id); expect(v.x).toBeGreaterThanOrEqual(0); expect(v.x + v.w).toBeLessThanOrEqual(WORLD.w); expect(v.y + v.h).toBeLessThanOrEqual(WORLD.h); expect(v.w).toBeGreaterThanOrEqual(r.w); }
  });
});

describe("attitudes : jamais de fausse activité", () => {
  const all: Activity[] = ["absent", "repos", "travaille", "attend_validation", "alerte"];
  it("« travaille » seulement pour une activité enregistrée « travaille »", () => {
    for (const a of all) for (const m of [false, true]) expect(poseOf(a, m) === "working", `${a}/${m}`).toBe(a === "travaille" && !m);
  });
  it("un agent au repos est immobile (idle), un agent absent n'est jamais animé ni réuni", () => {
    expect(poseOf("repos", false)).toBe("idle");
    expect(poseOf("absent", true)).toBe("absent");
    expect(poseOf("absent", false)).toBe("absent");
  });
  it("correspondances : validation = documents, alerte = difficulté, réunion = réunion", () => {
    expect(poseOf("attend_validation", false)).toBe("reading");
    expect(poseOf("alerte", false)).toBe("struggling");
    expect(poseOf("repos", true)).toBe("meeting");
  });
  it("réunion : seulement quand une demande entre agents est EN COURS et que les DEUX agents existent", () => {
    const act = { finance: "repos", operations: "absent", juridique: "repos" } as Partial<Record<"finance" | "operations" | "juridique", Activity>>;
    expect(collaborators([{ from: "finance", to: "operations", status: "pending" }], act).size).toBe(0);
    const m = collaborators([{ from: "finance", to: "juridique", status: "pending" }], act);
    expect([...m.keys()].sort()).toEqual(["finance", "juridique"]);
    expect(collaborators([{ from: "finance", to: "juridique", status: "handled" }], act).size).toBe(0);
    expect(collaborators([], act).size).toBe(0);
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
describe("scène : aucune animation sans attitude enregistrée, aucune donnée fictive", () => {
  const css = readFileSync(path.join(__dirname, "../src/components/crm/hq/parts.tsx"), "utf8");
  it("toute animation en boucle est conditionnée par une classe d'attitude ou un état de bureau allumé", () => {
    const rules = css.split("\n").filter((l) => /animation:[^;]*infinite/.test(l));
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) expect(r, r).toMatch(/\.pose-(working|reading|meeting)|\.hq-office\.on/);
  });
  it("« travaille » n'allume les écrans que si l'attitude est « working »", () => {
    const scene = readFileSync(path.join(__dirname, "../src/components/crm/hq/scene.tsx"), "utf8");
    expect(scene).toMatch(/pose === "working"/);
    expect(scene).not.toMatch(/Math\.random|setInterval/);
  });
  it("les animations respectent « réduire les animations »", () => { expect(css).toMatch(/prefers-reduced-motion:reduce/); });
  it("l'enveloppe du mode réel ne reçoit jamais de scénario : demoNext n'est utilisé qu'en démonstration", () => {
    const o = readFileSync(path.join(__dirname, "../src/components/crm/hq/office.tsx"), "utf8");
    expect(o).toMatch(/if \(demo\) \{\s*if \(!demoNext\) return;/);
  });
});
