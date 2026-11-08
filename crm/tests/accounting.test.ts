import { describe, it, expect } from "vitest";
import { vatByRate, numberingGaps, toCsv } from "@/lib/domain/accounting";

describe("comptabilité", () => {
  it("TVA par taux", () => {
    expect(vatByRate([
      { invoice_id: "a", quantity: 2, unit_price_ht: 50, vat_rate: 20 }, { invoice_id: "b", quantity: 1, unit_price_ht: 100, vat_rate: 20 }, { invoice_id: "b", quantity: 1, unit_price_ht: 80, vat_rate: 10 }
    ])).toEqual([{ rate: 10, base: 80, vat: 8 }, { rate: 20, base: 200, vat: 40 }]);
  });
  it("détecte les trous de numérotation par année", () => {
    expect(numberingGaps(["F-2026-001", "F-2026-002", "F-2026-005", "F-2025-001", null])).toEqual(["F-2026-003", "F-2026-004"]);
    expect(numberingGaps(["F-2026-001", "F-2026-002"])).toEqual([]);
  });
  it("CSV : virgule décimale, guillemets, neutralisation des formules", () => {
    const csv = toCsv(["N°", "Libellé", "HT"], [["F-2026-001", '=SOMME(A1) ; "x"', 12.5], ["F-2026-002", null, 3]]);
    expect(csv).toBe("﻿N°;Libellé;HT\r\nF-2026-001;\"'=SOMME(A1) ; \"\"x\"\"\";12,5\r\nF-2026-002;;3\r\n");
  });
});
