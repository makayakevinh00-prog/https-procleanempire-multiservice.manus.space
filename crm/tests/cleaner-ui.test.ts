import { describe, expect, it } from "vitest";
import { eur, ibanValid, maskIban, parseDepartments, pctsValid, slot, splitPrice } from "@/lib/cleaner-ui";

describe("application nettoyeur", () => {
  it("départements : nettoyés, triés, sans doublon", () => {
    expect(parseDepartments("95, 78 ; 95 75")).toEqual(["75", "78", "95"]);
    expect(parseDepartments("2a, 971, abc, 1, 9999")).toEqual(["2A", "971"]);
  });
  it("IBAN : contrôle de clé", () => {
    expect(ibanValid("FR76 3000 6000 0112 3456 7890 189")).toBe(true);
    expect(ibanValid("FR76 3000 6000 0112 3456 7890 188")).toBe(false);
    expect(ibanValid("FR00")).toBe(false);
    expect(ibanValid("")).toBe(false);
    expect(maskIban("FR76 3000 6000 0112 3456 7890 189")).toBe("•••• 0189");
  });
  it("parts : le total est toujours exact au centime", () => {
    expect(splitPrice(100, 75, 10)).toEqual({ cleaner: 75, platform: 10, logistics: 15 });
    const s = splitPrice(33.33, 75, 10);
    expect(Math.round((s.cleaner + s.platform + s.logistics) * 100)).toBe(3333);
  });
  it("les parts doivent faire 100 % et le nettoyeur 50 à 90 %", () => {
    expect(pctsValid(75, 10, 15)).toBe(true);
    expect(pctsValid(70, 10, 10)).toBe(false);
    expect(pctsValid(95, 0, 5)).toBe(false);
    expect(pctsValid(40, 30, 30)).toBe(false);
  });
  it("montants lisibles", () => { expect(eur(63)).toBe("63 €"); expect(eur(52.5).replace(/\s/g, " ")).toBe("52,50 €"); expect(eur(null)).toBe("0 €"); });
  it("créneau lisible", () => { expect(slot("11:00:00", "14:00:00")).toBe("11h – 14h"); expect(slot("11:30", "16:00")).toBe("11h30 – 16h"); });
});
