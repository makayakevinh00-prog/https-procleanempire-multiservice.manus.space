import { describe, it, expect } from "vitest";
import { forecast, leftLabel, nextDue } from "@/lib/domain/stock";
import { parseStock } from "@/lib/ai-inspect";

const seen = (name: string, left: number, o: Partial<{ unit: string; low: boolean; guess_days: number | null }> = {}) => ({ name, left, unit: o.unit ?? "bouteille", low: o.low ?? false, guess_days: o.guess_days ?? null });

describe("stock de produits : prévision", () => {
  it("premier comptage : seule l'estimation de l'IA donne une durée", () => {
    const [a, b] = forecast([seen("Nettoyant sol", 2, { guess_days: 40 }), seen("Javel", 1)], null, "2026-11-24T10:00:00Z");
    expect([a!.days_left, a!.basis, a!.buy]).toEqual([40, "estimation", false]);
    expect([b!.days_left, b!.basis, b!.buy]).toEqual([null, null, false]);
  });
  it("deuxième comptage : la consommation est mesurée, même si le nom change de casse ou d'accent", () => {
    const prev = { counted_at: "2026-11-14T10:00:00Z", items: forecast([seen("Dégraissant", 3)], null, "2026-11-14T10:00:00Z") };
    const [x] = forecast([seen("degraissant", 2, { guess_days: 90 })], prev, "2026-11-24T10:00:00Z");
    expect([x!.rate, x!.days_left, x!.basis]).toEqual([0.1, 20, "mesure"]);
  });
  it("après un réassort, l'ancienne mesure est gardée ; à racheter sous 10 jours, s'il reste très peu ou si c'est épuisé", () => {
    const prev = { counted_at: "2026-11-14T10:00:00Z", items: [{ name: "Sacs poubelle", left: 1, unit: "rouleau", low: false, rate: 0.2, days_left: 5, basis: "mesure" as const, buy: true }] };
    const [x, y, z] = forecast([seen("Sacs poubelle", 4), seen("Éponges", 3, { low: true }), seen("Javel", 0)], prev, "2026-11-24T10:00:00Z");
    expect([x!.rate, x!.days_left, x!.buy]).toEqual([0.2, 20, false]);
    expect([y!.buy, z!.buy]).toEqual([true, true]);
    expect(forecast([seen("Sacs poubelle", 1.9)], { ...prev, items: [{ ...prev.items[0]!, left: 2 }] }, "2026-11-24T10:00:00Z")[0]!.buy).toBe(false);
  });
  it("prochain comptage à mi-chemin de la première rupture, entre 7 et 30 jours", () => {
    const it = (d: number | null) => ({ name: "x", left: 1, unit: "u", low: false, rate: null, days_left: d, basis: null, buy: false });
    expect(nextDue([it(40), it(100)], "2026-11-24T10:00:00Z")).toBe("2026-12-14");
    expect(nextDue([it(4)], "2026-11-24T10:00:00Z")).toBe("2026-12-01");
    expect(nextDue([it(300)], "2026-11-24T10:00:00Z")).toBe("2026-12-24");
    expect(nextDue([it(null)], "2026-11-24T10:00:00Z")).toBe("2026-12-08");
  });
  it("libellés lisibles", () => {
    expect(leftLabel({ left: 0, days_left: 3, basis: "mesure" })).toBe("épuisé");
    expect(leftLabel({ left: 1, days_left: 9, basis: "mesure" })).toBe("9 jours");
    expect(leftLabel({ left: 1, days_left: 28, basis: "estimation" })).toBe("environ 4 semaines");
    expect(leftLabel({ left: 1, days_left: null, basis: null })).toBe("durée inconnue");
  });
  it("lecture de la réponse de l'IA : valeurs bornées, produits sans nom écartés", () => {
    const r = parseStock(JSON.stringify({ items: [{ name: "Javel", unit: "bidon", left: "1.5", low: true, guess_days: 12.4 }, { name: "", left: 3 }, { name: "Gants", left: -2, guess_days: null }], unclear: ["bidon blanc"], summary: "Stock correct." }));
    expect(r?.items).toEqual([{ name: "Javel", unit: "bidon", left: 1.5, low: true, guess_days: 12 }, { name: "Gants", unit: "unité", left: 0, low: false, guess_days: null }]);
    expect(r?.unclear).toEqual(["bidon blanc"]);
    expect(parseStock("pas du json")).toBeNull();
  });
});
