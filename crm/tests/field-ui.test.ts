import { describe, expect, it } from "vitest";
import { ROW, dict, initials, isoDate, layoutDay, shiftDay, toneOf } from "@/lib/field-ui";

describe("frise de la journée d'un agent", () => {
  it("affiche au moins 7 h–20 h et place une mission à sa vraie heure", () => {
    const l = layoutDay([{ id: "a", time: "09:30:00", hours: 2 }]);
    expect(l.hours[0]).toBe(7); expect(l.hours.at(-1)).toBe(20);
    expect(l.blocks[0]).toMatchObject({ id: "a", top: Math.round(2.5 * ROW), height: 2 * ROW, start: "09:30", end: "11:30", col: 0, cols: 1 });
  });
  it("étend la frise pour une mission très tôt ou très tard", () => {
    const l = layoutDay([{ id: "a", time: "05:00", hours: 1 }, { id: "b", time: "21:00", hours: 2 }]);
    expect(l.hours[0]).toBe(5); expect(l.hours.at(-1)).toBeGreaterThanOrEqual(23);
  });
  it("sans durée connue, compte 2 h ; hauteur minimale pour rester lisible", () => {
    expect(layoutDay([{ id: "a", time: "10:00", hours: null }]).blocks[0].end).toBe("12:00");
    expect(layoutDay([{ id: "a", time: "10:00", hours: 0.25 }]).blocks[0].height).toBe(56);
  });
  it("les missions qui se chevauchent sont côte à côte, les autres restent seules", () => {
    const l = layoutDay([{ id: "a", time: "09:00", hours: 3 }, { id: "b", time: "10:00", hours: 1 }, { id: "c", time: "14:00", hours: 1 }]);
    const by = Object.fromEntries(l.blocks.map((b) => [b.id, b]));
    expect(by.a.cols).toBe(2); expect(by.b.cols).toBe(2); expect(by.a.col).not.toBe(by.b.col);
    expect(by.c).toMatchObject({ col: 0, cols: 1 });
  });
  it("les missions sans horaire sont listées à part", () => {
    const l = layoutDay([{ id: "a", time: null, hours: 2 }, { id: "b", time: "08:00", hours: 1 }]);
    expect(l.loose).toEqual(["a"]); expect(l.blocks.map((b) => b.id)).toEqual(["b"]);
  });
  it("jour vide : frise vide mais valide", () => {
    const l = layoutDay([]); expect(l.blocks).toEqual([]); expect(l.hours.length).toBe(14);
  });
});

describe("dates, étapes et textes", () => {
  it("valide les dates et se déplace d'un jour", () => {
    expect(isoDate("2026-11-11")).toBe("2026-11-11");
    for (const x of ["2026-13-01", "2026-02-30x", "demain", "", undefined, "2026-11-11; drop"]) expect(isoDate(x)).toBeNull();
    expect(shiftDay("2026-11-30", 1)).toBe("2026-12-01"); expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("regroupe les étapes en familles", () => {
    expect(toneOf("planifiee")).toBe("todo"); expect(toneOf("en_cours")).toBe("doing"); expect(toneOf("terminee")).toBe("done");
    expect(toneOf("validee")).toBe("checked"); expect(toneOf("facturee")).toBe("checked"); expect(toneOf("annulee")).toBe("cancelled");
  });
  it("initiales sûres", () => { expect(initials("Fatou Diallo")).toBe("FD"); expect(initials("  ")).toBe("?"); expect(initials("karim")).toBe("K"); });
  it("français et anglais ont exactement les mêmes textes", () => {
    const keys = (o: any): string[] => Object.keys(o).flatMap((k) => (typeof o[k] === "object" && o[k] ? keys(o[k]).map((x) => `${k}.${x}`) : [k])).sort();
    expect(keys(dict("en"))).toEqual(keys(dict("fr")));
    expect(dict("fr").validatedOn(2, 3)).toBe("2 validée(s) sur 3"); expect(dict("en").validatedOn(2, 3)).toContain("2 validated");
  });
});
