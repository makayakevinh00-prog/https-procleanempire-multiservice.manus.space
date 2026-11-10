import { describe, expect, it } from "vitest";
import { gapOrder, headcountLabel, latestRevenue, mapRival } from "../src/lib/veille";

describe("veille concurrentielle", () => {
  it("traduit les tranches d'effectif de l'annuaire", () => {
    expect(headcountLabel("11")).toBe("10 à 19 salariés");
    expect(headcountLabel("53")).toBe("10 000 salariés et plus");
    expect(headcountLabel("ZZ")).toBeNull();
    expect(headcountLabel(undefined)).toBeNull();
  });
  it("prend le dernier chiffre d'affaires publié, sans rien inventer", () => {
    expect(latestRevenue({ "2024": { ca: 100 }, "2025": { ca: 250 } })).toEqual({ revenue_eur: 250, revenue_year: 2025 });
    expect(latestRevenue({ "2025": { resultat_net: 5 }, "2024": { ca: 90 } })).toEqual({ revenue_eur: 90, revenue_year: 2024 });
    expect(latestRevenue(null)).toEqual({ revenue_eur: null, revenue_year: null });
  });
  it("transforme un résultat de l'annuaire et repère l'établissement local", () => {
    const r = mapRival({
      siren: "067800425", nom_raison_sociale: "ONET SERVICES", activite_principale: "81.21Z", nature_juridique: "5710", date_creation: "1967-01-01", etat_administratif: "A",
      tranche_effectif_salarie: "53", finances: { "2025": { ca: 738643957 } },
      siege: { siret: "06780042503681", libelle_commune: "MARSEILLE", code_postal: "13009", etat_administratif: "A", est_siege: true },
      matching_etablissements: [{ etat_administratif: "F", libelle_commune: "ANCIENNE" }, { etat_administratif: "A", libelle_commune: "SAINT-OUEN-L'AUMONE", code_postal: "95310" }]
    })!;
    expect(r).toMatchObject({ name: "ONET SERVICES", city: "Marseille", headcount: "10 000 salariés et plus", revenue_eur: 738643957, revenue_year: 2025, legal_form: "SAS", local_place: "Saint-Ouen-L'Aumone (95310)" });
    expect(mapRival({ siren: "x" })).toBeNull();
  });
  it("classe l'écart : d'abord ce que des concurrents ont et que nous n'avons pas", () => {
    const certs = [{ id: "a", status: "obtenu" }, { id: "b", status: "a_envisager" }, { id: "c", status: "a_envisager" }, { id: "d", status: "ecarte" }];
    const order = gapOrder(certs, new Map([["a", 5], ["b", 0], ["c", 2], ["d", 3]])).map((x) => x.id);
    expect(order).toEqual(["c", "b", "a", "d"]);
  });
});
