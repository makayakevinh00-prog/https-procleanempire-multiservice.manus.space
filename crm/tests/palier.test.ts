import { describe, expect, it } from "vitest";
import { PALIERS, hourlyRate, palierState } from "@/lib/domain/palier";

describe("paliers de croissance", () => {
  it("aujourd'hui : 1 370 € sur le palier de 5 000 €, soit 27 %, il manque 3 630 €", () => {
    const s = palierState(1370);
    expect(s.cible.seuil).toBe(5000);
    expect(s).toMatchObject({ rang: 1, pct: 27, reste: 3630, termine: false });
    expect(s.atteints).toEqual([]);
  });
  it("le palier change tout seul dès qu'il est atteint", () => {
    expect(palierState(4999.99)).toMatchObject({ rang: 1, pct: 99, reste: 1 });
    const s = palierState(5000);
    expect(s.cible.seuil).toBe(10000);
    expect(s).toMatchObject({ rang: 2, pct: 50, reste: 5000 });
    expect(s.atteints.map((p) => p.seuil)).toEqual([5000]);
    expect(palierState(12000).cible.seuil).toBe(50000);
    expect(palierState(12000)).toMatchObject({ rang: 3, pct: 24, reste: 38000 });
  });
  it("n'affiche jamais 100 % avant d'y être vraiment", () => {
    expect(palierState(4990).pct).toBe(99);
    expect(palierState(49999).pct).toBe(99);
  });
  it("tous les paliers atteints : 100 %, plus rien à signer", () => {
    const s = palierState(60000);
    expect(s).toMatchObject({ termine: true, pct: 100, reste: 0, rang: PALIERS.length });
    expect(s.cible.seuil).toBe(50000);
  });
  it("si un contrat est perdu, on revient au palier précédent", () => {
    expect(palierState(5200).cible.seuil).toBe(10000);
    expect(palierState(4700).cible.seuil).toBe(5000);
  });
  it("valeurs absurdes : traitées comme zéro", () => {
    expect(palierState(Number.NaN)).toMatchObject({ pct: 0, reste: 5000 });
    expect(palierState(-50)).toMatchObject({ pct: 0, reste: 5000 });
  });
});

describe("taux horaire des contrats", () => {
  it("SARB (470 €, 4 h), SEA (600 €, 3 h) et IDF (300 €, 3 h) : 1 370 € pour 43 h, soit 31,6 € de l'heure", () => {
    const r = hourlyRate([{ monthly: 470, weeklyHours: 4 }, { monthly: 600, weeklyHours: 3 }, { monthly: 300, weeklyHours: 3 }]);
    expect(r.rate).toBe(31.6); expect(r.contracts).toBe(3); expect(Math.round(r.monthlyHours)).toBe(43);
  });
  it("un contrat sans heures ou sans montant ne fausse pas le taux", () => {
    const r = hourlyRate([{ monthly: 470, weeklyHours: 4 }, { monthly: 130, weeklyHours: null }, { monthly: null, weeklyHours: 2 }]);
    expect(r.contracts).toBe(1); expect(r.rate).toBe(27.1);
  });
  it("aucune heure connue : pas de taux", () => {
    expect(hourlyRate([{ monthly: 600, weeklyHours: null }])).toEqual({ rate: null, contracts: 0, monthlyHours: 0 });
  });
});
