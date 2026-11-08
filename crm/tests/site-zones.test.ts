import { describe, it, expect } from "vitest";
import { parseZones, zonesToText, parseSpecifics } from "@/lib/domain/site-zones";

describe("zones d'un site", () => {
  const txt = "Salon\n- Aspirer le sol\n- Dépoussiérer\n! Parquet fragile\n\nCuisine\n- Dégraisser les façades";
  it("lit pièces, tâches et points d'attention", () => {
    expect(parseZones(txt)).toEqual([
      { name: "Salon", tasks: ["Aspirer le sol", "Dépoussiérer"], attention: ["Parquet fragile"] },
      { name: "Cuisine", tasks: ["Dégraisser les façades"], attention: [] }
    ]);
  });
  it("aller-retour sans perte", () => { expect(parseZones(zonesToText(parseZones(txt)))).toEqual(parseZones(txt)); });
  it("tâche sans pièce → « Général » ; pièce vide ignorée", () => {
    expect(parseZones("- Vider les poubelles\nBalcon")).toEqual([{ name: "Général", tasks: ["Vider les poubelles"], attention: [] }]);
  });
  it("éléments spécifiques dédoublonnés", () => { expect(parseSpecifics("Parquet fragile, Plantes à arroser,\nParquet fragile")).toEqual(["Parquet fragile", "Plantes à arroser"]); });
});
