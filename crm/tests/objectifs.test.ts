import { describe, expect, it } from "vitest";
import { buildLevers, forecastStatus, isMonth, pace, paceStatus, shiftMonth } from "../src/lib/objectifs";
import { isMet, positiveMonths, progress, topShare, verdict } from "../src/lib/croissance";

describe("objectifs mensuels", () => {
  it("situe le jour dans le mois", () => {
    expect(pace("2026-11-10")).toMatchObject({ month: "2026-11", day: 10, days: 30 });
    expect(pace("2026-02-14").days).toBe(28);
    expect(pace("2026-11-15").elapsed).toBe(0.5);
  });
  it("valide et décale les mois", () => {
    expect(isMonth("2026-11")).toBe(true); expect(isMonth("2026-13")).toBe(false); expect(isMonth("x")).toBe(false);
    expect(shiftMonth("2026-01", -1)).toBe("2025-12"); expect(shiftMonth("2026-11", 2)).toBe("2027-01");
  });
  it("statut au rythme : atteint, rythme, à surveiller, en retard, et jamais d'alerte en tout début de mois", () => {
    expect(paceStatus(1000, 1000, 0.5)).toBe("atteint");
    expect(paceStatus(480, 1000, 0.5)).toBe("rythme");
    expect(paceStatus(350, 1000, 0.5)).toBe("surveiller");
    expect(paceStatus(100, 1000, 0.5)).toBe("retard");
    expect(paceStatus(0, 1000, 0.05)).toBe("rythme");
  });
  it("le CA est jugé sur la prévision (la facturation part en fin de mois)", () => {
    expect(forecastStatus(500, 5200, 5000)).toBe("rythme");
    expect(forecastStatus(5100, 5100, 5000)).toBe("atteint");
    expect(forecastStatus(500, 4200, 5000)).toBe("surveiller");
    expect(forecastStatus(500, 2000, 5000)).toBe("retard");
  });
  it("classe les leviers par montant et écarte les vides", () => {
    const l = buildLevers({ drafts: { n: 2, amount: 300 }, acceptedToInvoice: { n: 0, amount: 0 }, unbilledContracts: { n: 3, amount: 2670 }, sentQuotes: { n: 1, amount: 900 }, late: { n: 1, amount: 255 }, unmatched: 2, prospects: 0, requests: 1 });
    expect(l.map((x) => x.key)).toEqual(["contrats", "devis_envoyes", "brouillons", "retard", "paiements", "demandes"]);
  });
});

describe("croissance", () => {
  it("progression et critère rempli, dans les deux sens", () => {
    expect(progress({ label: "a", value: 50, threshold: 100, op: ">=", fmt: "n" })).toBe(0.5);
    expect(progress({ label: "a", value: 20, threshold: 35, op: "<=", fmt: "pct" })).toBe(1);
    expect(progress({ label: "a", value: 70, threshold: 35, op: "<=", fmt: "pct" })).toBe(0.5);
    expect(progress({ label: "a", value: 5, threshold: null, op: ">=", fmt: "n" })).toBeNull();
    expect(isMet({ label: "a", value: 20, threshold: 35, op: "<=", fmt: "pct" })).toBe(true);
    expect(isMet({ label: "a", value: 5, threshold: null, op: ">=", fmt: "n" })).toBeNull();
  });
  it("verdict : prêt, en approche, pas encore, à définir", () => {
    const c = (value: number, threshold: number | null) => ({ label: "x", value, threshold, op: ">=" as const, fmt: "n" as const });
    expect(verdict([c(10, 10), c(5, 3)])).toBe("pret");
    expect(verdict([c(8, 10), c(9, 10)])).toBe("approche");
    expect(verdict([c(1, 10)])).toBe("pas_encore");
    expect(verdict([c(1, null)])).toBe("a_definir");
  });
  it("part du plus gros client et mois positifs consécutifs", () => {
    expect(topShare([60, 30, 10])).toBe(60); expect(topShare([])).toBeNull();
    expect(positiveMonths([{ billed: 10, supplier: 20 }, { billed: 30, supplier: 10 }, { billed: 30, supplier: 10 }])).toBe(2);
    expect(positiveMonths([{ billed: 30, supplier: 10 }, { billed: 5, supplier: 10 }])).toBe(0);
  });
});
