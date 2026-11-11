import { describe, it, expect } from "vitest";
import { haversineKm, inFrance } from "@/lib/zone";
import { siretValid } from "@/lib/siret";

describe("zone", () => {
  it("distance à vol d'oiseau", () => {
    expect(haversineKm({ lat: 49.05, lng: 2.1 }, { lat: 48.8566, lng: 2.3522 })).toBeCloseTo(28.3, 0);
    expect(haversineKm({ lat: 48, lng: 2 }, { lat: 48, lng: 2 })).toBe(0);
  });
  it("garde-fou France métropolitaine", () => {
    expect(inFrance({ lat: 48.85, lng: 2.35 })).toBe(true);
    expect(inFrance({ lat: 0, lng: 0 })).toBe(false);
    expect(inFrance({ lat: 40.7, lng: -74 })).toBe(false);
  });
});

describe("siretValid", () => {
  it("accepte un SIRET à clé de Luhn correcte, avec espaces", () => {
    expect(siretValid("73282932000074")).toBe(true);
    expect(siretValid("732 829 320 00074")).toBe(true);
  });
  it("refuse mauvaise clé, longueur ou lettres", () => {
    expect(siretValid("73282932000075")).toBe(false);
    expect(siretValid("1234")).toBe(false);
    expect(siretValid("7328293200007A")).toBe(false);
    expect(siretValid("")).toBe(false);
  });
});
