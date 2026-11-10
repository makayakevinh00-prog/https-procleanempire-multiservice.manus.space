import { describe, expect, it } from "vitest";
import { averageComplete, groupSmall, monthsBack, scenario, sumByMonth, toPeriod } from "../src/lib/analyses";

describe("analyses", () => {
  it("liste les n derniers mois jusqu'au mois en cours", () => {
    expect(monthsBack("2026-11", 3)).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(monthsBack("2026-02", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
  it("période : 3, 6 ou 12 mois, 6 par défaut", () => {
    expect(toPeriod("12")).toBe(12); expect(toPeriod("5")).toBe(6); expect(toPeriod(undefined)).toBe(6);
  });
  it("somme par mois, hors période ignorée", () => {
    const rows = [{ d: "2026-10-03", v: 100 }, { d: "2026-10-28", v: 50.5 }, { d: "2026-11-02", v: 20 }, { d: "2025-01-01", v: 999 }, { d: null, v: 5 }];
    expect(sumByMonth(rows, (r) => r.d, (r) => r.v, ["2026-09", "2026-10", "2026-11"])).toEqual([0, 150.5, 20]);
  });
  it("camembert : 4 parts au plus, le reste regroupé, parts nulles écartées", () => {
    const g = groupSmall([{ label: "a", value: 50 }, { label: "b", value: 30 }, { label: "c", value: 10 }, { label: "d", value: 6 }, { label: "e", value: 4 }, { label: "z", value: 0 }]);
    expect(g.map((p) => p.label)).toEqual(["a", "b", "c", "Autres"]);
    expect(g[3].value).toBe(10);
    expect(groupSmall([{ label: "a", value: 1 }])).toHaveLength(1);
  });
  it("scénario : CA et dépenses ajustés, résultat et marge", () => {
    expect(scenario({ revenue: 1000, costs: 600 }, 10, 5)).toEqual({ revenue: 1100, costs: 630, result: 470, marginPct: 42.7 });
    expect(scenario({ revenue: 0, costs: 100 }, 10, 0).marginPct).toBeNull();
  });
  it("moyenne sur les mois complets, le mois en cours exclu", () => {
    expect(averageComplete([100, 200, 999])).toBe(150); expect(averageComplete([5])).toBe(0);
  });
});
