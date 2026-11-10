import { describe, expect, it } from "vitest";
import { clientsFor, costOf, evaluate, seasonOpen, type Prospect } from "../src/lib/prix";

describe("prix et marges", () => {
  it("coût = temps × coût horaire + produits ; inconnu sans temps", () => {
    expect(costOf(2, 22, 5)).toBe(49);
    expect(costOf(1.5, 22, 0)).toBe(33);
    expect(costOf(null, 22, 5)).toBeNull();
  });
  it("marge, statut et prix conseillé", () => {
    const ok = evaluate(100, 49, 40);
    expect(ok).toMatchObject({ margin: 51, pct: 51, status: "ok", floor: 49 });
    expect(ok.suggested).toBe(82);                       // 49 / 0,6 = 81,67 → 82
    expect(evaluate(35, 33, 40)).toMatchObject({ margin: 2, status: "sous_cible" });
    expect(evaluate(30, 33, 40)).toMatchObject({ margin: -3, status: "perte" });
    expect(evaluate(35, null, 40)).toMatchObject({ status: "inconnu", suggested: null });
    expect(evaluate(0, 20, 40)).toMatchObject({ status: "inconnu", floor: 20, suggested: 34 });
  });
  it("la saison s'ouvre un mois à l'avance", () => {
    expect(seasonOpen([11, 12], 10)).toBe(true);
    expect(seasonOpen([11, 12], 12)).toBe(true);
    expect(seasonOpen([11, 12], 9)).toBe(false);
    expect(seasonOpen([1], 12)).toBe(true);              // décembre → janvier
    expect(seasonOpen(null, 11)).toBe(false);
  });
  it("clients à qui proposer : activité visée, pas de retard, pas déjà acheté, ancienneté hors saison", () => {
    const c = (o: Partial<Prospect>): Prospect => ({ id: "x", name: "C", activities: ["nettoyage_pro"], sinceDays: 100, late: false, bought: "", ...o });
    const deco = { name: "Décoration de Noël — pose et dépose", complements: ["nettoyage_pro"], season_months: [11, 12] };
    expect(clientsFor(deco, 11, [c({ id: "a", sinceDays: 5 }), c({ id: "b", late: true }), c({ id: "c", bought: "décoration de noël 2025" }), c({ id: "d", activities: ["nettoyage_airbnb"] })]).map((x) => x.id)).toEqual(["a"]);
    const vitres = { name: "Nettoyage des vitres", complements: ["nettoyage_pro"], season_months: null };
    expect(clientsFor(vitres, 11, [c({ id: "a", sinceDays: 30 }), c({ id: "b", sinceDays: 90 })]).map((x) => x.id)).toEqual(["b"]);
    expect(clientsFor({ name: "x", complements: null, season_months: null }, 11, [c({})])).toEqual([]);
  });
});
