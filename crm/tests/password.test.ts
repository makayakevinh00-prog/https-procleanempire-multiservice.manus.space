import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, passwordOk } from "@/lib/password";

describe("mot de passe de la connexion unique", () => {
  it("l'empreinte ne contient pas le mot de passe et change à chaque fois", () => {
    const a = hashPassword("Menage-2026!"), b = hashPassword("Menage-2026!");
    expect(a).not.toContain("Menage"); expect(a).not.toBe(b);
  });
  it("bon mot de passe accepté, mauvais refusé, empreinte abîmée refusée", () => {
    const h = hashPassword("Menage-2026!");
    expect(verifyPassword("Menage-2026!", h)).toBe(true);
    expect(verifyPassword("menage-2026!", h)).toBe(false);
    expect(verifyPassword("Menage-2026!", "n'importe quoi")).toBe(false);
    expect(verifyPassword("Menage-2026!", null)).toBe(false);
  });
  it("8 caractères au moins", () => { expect(passwordOk("1234567")).toBe(false); expect(passwordOk("12345678")).toBe(true); });
});
