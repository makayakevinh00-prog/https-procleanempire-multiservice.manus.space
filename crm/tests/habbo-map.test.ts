import { describe, it, expect } from "vitest";
import { DESKS, HUB, MEET_SEATS, POIS, PROPS, walkable, findPath, inside, W, H } from "@/lib/jarvis/habbo/map";
import { AGENTS } from "@/lib/jarvis/registry";

describe("plan isométrique des locaux", () => {
  it("chaque agent (hors JARVIS) et le dirigeant ont un bureau", () => {
    for (const a of AGENTS.filter((x) => x.key !== "core")) expect(DESKS.some((d) => d.agent === a.key), a.key).toBe(true);
    expect(DESKS.some((d) => d.agent === "owner")).toBe(true);
  });
  it("tout est dans la salle ; aucun meuble ne se chevauche", () => {
    const seen = new Set<string>();
    for (const p of PROPS) for (let i = 0; i < p.w; i++) for (let j = 0; j < p.d; j++) {
      expect(inside(p.x + i, p.y + j), `${p.kind} ${p.x},${p.y}`).toBe(true);
      const k = `${p.x + i},${p.y + j}`; expect(seen.has(k), `chevauchement ${k}`).toBe(false); seen.add(k);
    }
    expect(W).toBeGreaterThan(0); expect(H).toBeGreaterThan(0);
  });
  it("chaises, places de visite, réunion et points d'intérêt sont praticables et atteignables depuis JARVIS", () => {
    const spots = [...DESKS.flatMap((d) => [d.chair, d.visit, d.visit2]), ...MEET_SEATS, ...Object.values(POIS), HUB];
    for (const s of spots) { expect(walkable(...s), `${s}`).toBe(true); expect(findPath(HUB, s), `chemin vers ${s}`).not.toBeNull(); }
  });
  it("le chemin ne traverse jamais un meuble et avance case par case", () => {
    const p = findPath(HUB, DESKS[0].chair)!;
    for (let i = 0; i < p.length; i++) { expect(walkable(...p[i])).toBe(true); if (i) expect(Math.abs(p[i][0] - p[i - 1][0]) + Math.abs(p[i][1] - p[i - 1][1])).toBe(1); }
    expect(findPath(HUB, [3, 0])).toBeNull(); // case bloquée (étagère)
  });
});
