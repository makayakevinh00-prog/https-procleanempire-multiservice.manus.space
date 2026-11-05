import { describe, it, expect } from "vitest";
import { parsePrices, pricesToText } from "@/lib/supplier-prices";

describe("prix des fournisseurs", () => {
  it("lit « libellé ; prix ; unité ; note » et ignore les lignes vides", () => {
    const p = parsePrices("Kit de linge ; 20 ; par livraison ; 1 drap, 1 housse\n\n2e kit ; 18,5 ; par kit");
    expect(p).toEqual([{ label: "Kit de linge", price_ht: 20, unit: "par livraison", note: "1 drap, 1 housse" }, { label: "2e kit", price_ht: 18.5, unit: "par kit", note: "" }]);
  });
  it("un prix absent ou illisible donne null (jamais 0)", () => {
    expect(parsePrices("Drap housse ; sur demande")[0].price_ht).toBeNull();
    expect(parsePrices("Lavage")[0].price_ht).toBeNull();
  });
  it("aller-retour texte → prix → texte stable", () => {
    const t = "Kit ; 20 ; par livraison ; ok";
    expect(pricesToText(parsePrices(t))).toBe(t);
  });
});
