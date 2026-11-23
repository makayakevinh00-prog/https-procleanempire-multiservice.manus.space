import { describe, expect, it } from "vitest";
import { batchEmail, remainingOf, sendable } from "@/lib/invoice-batch";

const inv = (o: Partial<Parameters<typeof remainingOf>[0]> = {}) => ({ id: "1", number: "F2610-000056", total_ttc: 255, paid_amount: 0, due_date: "2026-11-07", status: "en_retard", ...o });

describe("envoi groupé des factures d'un client", () => {
  it("ne propose que les factures émises : ni brouillon, ni annulée", () => {
    expect(sendable({ number: null, status: "brouillon" })).toBe(false);
    expect(sendable({ number: "F1", status: "annule" })).toBe(false);
    expect(sendable({ number: "F1", status: "envoye" })).toBe(true);
    expect(sendable({ number: "F1", status: "paye" })).toBe(true);
  });
  it("calcule le reste dû, acompte déduit ; zéro si acquittée", () => {
    expect(remainingOf(inv())).toBe(255);
    expect(remainingOf(inv({ total_ttc: 1232.08, paid_amount: 232.08 }))).toBe(1000);
    expect(remainingOf(inv({ status: "paye" }))).toBe(0);
  });
  it("une facture : même objet que l'envoi habituel", () => {
    const m = batchEmail([inv()], "Le service facturation");
    expect(m.subject).toBe("Facture F2610-000056 — ProClean Empire");
    expect(m.text).toContain("votre facture");
    expect(m.text.endsWith("Le service facturation")).toBe(true);
  });
  it("plusieurs factures : une ligne chacune et le total restant, sans vocabulaire de relance", () => {
    const m = batchEmail([inv(), inv({ id: "2", number: "F2610-000055", total_ttc: 465.01, due_date: "2026-11-15" }), inv({ id: "3", number: "F2610-000050", total_ttc: 100, status: "paye" })], "Le service facturation");
    expect(m.subject).toBe("Vos 3 factures — ProClean Empire");
    expect(m.text).toContain("- Facture F2610-000056");
    expect(m.text).toContain("- Facture F2610-000055");
    expect(m.text).toMatch(/F2610-000050 : .* acquittée/);
    expect(m.text).toMatch(/Total restant à régler : 720,01\s€ TTC/);
    expect(m.text).not.toMatch(/retard|relance|rappel/i);
  });
  it("tout est payé : aucun règlement demandé", () => {
    expect(batchEmail([inv({ status: "paye" })], "S").text).toContain("Aucun règlement n'est à effectuer");
  });
});
