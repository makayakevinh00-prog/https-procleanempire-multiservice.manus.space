import { describe, expect, it } from "vitest";
import { checkInvoicePrice, type PriceInput } from "@/lib/domain/price-check";

const base: PriceInput = { totalHt: 500, lines: [{ description: "Entretien mensuel", quantity: 1, unitPriceHt: 500 }], contracts: [], missions: [], previousTotalsHt: [], sameMonthSameTotal: 0 };
const mensuel = (monthlyHt: number, label = "Entretien") => ({ id: label, label, billingMode: "mensuel" as const, monthlyHt, perVisitHt: null });
const passage = (perVisitHt: number) => ({ id: "p", label: "Ménage", billingMode: "passage" as const, monthlyHt: null, perVisitHt });

describe("contrôle des prix avant facture", () => {
  it("conforme quand la facture égale le contrat mensuel", () => {
    const r = checkInvoicePrice({ ...base, contracts: [mensuel(500)] });
    expect(r.verdict).toBe("conforme");
    expect(r.expectedHt).toBe(500);
  });
  it("demande confirmation quand la facture s'écarte du contrat mensuel", () => {
    const r = checkInvoicePrice({ ...base, totalHt: 550, lines: [{ description: "x", quantity: 1, unitPriceHt: 550 }], contracts: [mensuel(500)] });
    expect(r.verdict).toBe("a_confirmer");
    expect(r.findings.map((f) => f.code)).toContain("ecart_contrat");
  });
  it("accepte une facture qui ne couvre qu'un des contrats mensuels du client", () => {
    const r = checkInvoicePrice({ ...base, contracts: [mensuel(500, "A"), mensuel(300, "B")] });
    expect(r.verdict).toBe("conforme");
  });
  it("tolère un écart d'arrondi inférieur à un euro", () => {
    const r = checkInvoicePrice({ ...base, totalHt: 500.4, lines: [{ description: "x", quantity: 1, unitPriceHt: 500.4 }], contracts: [mensuel(500)] });
    expect(r.verdict).toBe("conforme");
  });
  it("bloque une facture vide ou à zéro", () => {
    expect(checkInvoicePrice({ ...base, totalHt: 0, lines: [] }).verdict).toBe("bloquant");
    expect(checkInvoicePrice({ ...base, totalHt: 0, lines: [{ description: "x", quantity: 1, unitPriceHt: 0 }] }).verdict).toBe("bloquant");
  });
  it("bloque quand le total ne correspond pas aux lignes", () => {
    const r = checkInvoicePrice({ ...base, totalHt: 900 });
    expect(r.findings.map((f) => f.code)).toContain("total_incoherent");
    expect(r.verdict).toBe("bloquant");
  });
  it("compare d'abord aux missions rattachées", () => {
    const ok = checkInvoicePrice({ ...base, totalHt: 135, lines: [{ description: "Ménage", quantity: 3, unitPriceHt: 45 }], missions: [{ title: "a", unitPriceHt: 45, quantity: 1 }, { title: "b", unitPriceHt: 45, quantity: 1 }, { title: "c", unitPriceHt: 45, quantity: 1 }], contracts: [mensuel(999)] });
    expect(ok.verdict).toBe("conforme");
    const off = checkInvoicePrice({ ...base, totalHt: 180, lines: [{ description: "Ménage", quantity: 4, unitPriceHt: 45 }], missions: [{ title: "a", unitPriceHt: 45, quantity: 1 }, { title: "b", unitPriceHt: 45, quantity: 1 }, { title: "c", unitPriceHt: 45, quantity: 1 }] });
    expect(off.findings.map((f) => f.code)).toContain("ecart_missions");
  });
  it("signale une mission rattachée sans prix", () => {
    const r = checkInvoicePrice({ ...base, totalHt: 45, lines: [{ description: "Ménage", quantity: 1, unitPriceHt: 45 }], missions: [{ title: "a", unitPriceHt: 45, quantity: 1 }, { title: "b", unitPriceHt: null, quantity: 1 }] });
    expect(r.findings.map((f) => f.code)).toContain("mission_sans_prix");
  });
  it("signale un prix au passage différent du contrat", () => {
    const ok = checkInvoicePrice({ ...base, totalHt: 90, lines: [{ description: "Ménage", quantity: 2, unitPriceHt: 45 }], contracts: [passage(45)] });
    expect(ok.verdict).toBe("conforme");
    const off = checkInvoicePrice({ ...base, totalHt: 100, lines: [{ description: "Ménage", quantity: 2, unitPriceHt: 50 }], contracts: [passage(45)] });
    expect(off.findings.map((f) => f.code)).toContain("ecart_passage");
  });
  it("signale un montant inhabituel par rapport aux factures précédentes", () => {
    const r = checkInvoicePrice({ ...base, totalHt: 800, lines: [{ description: "x", quantity: 1, unitPriceHt: 800 }], previousTotalsHt: [500, 500, 510] });
    expect(r.findings.map((f) => f.code)).toContain("inhabituel");
    expect(checkInvoicePrice({ ...base, previousTotalsHt: [500, 480, 510] }).verdict).toBe("conforme");
  });
  it("signale un possible doublon et une ligne à 0 €", () => {
    expect(checkInvoicePrice({ ...base, sameMonthSameTotal: 1 }).findings.map((f) => f.code)).toContain("doublon");
    const r = checkInvoicePrice({ ...base, lines: [{ description: "x", quantity: 1, unitPriceHt: 500 }, { description: "offert", quantity: 1, unitPriceHt: 0 }] });
    expect(r.findings.map((f) => f.code)).toContain("ligne_gratuite");
  });
});
