import { describe, expect, it } from "vitest";
import { classifyQuery, mapResult, titleCase, tvaFromSiren } from "../src/lib/entreprises";

describe("recherche d'entreprise", () => {
  it("reconnaît SIRET, SIREN, n° de TVA et nom", () => {
    expect(classifyQuery("106 602 659 00018")).toEqual({ kind: "siret", q: "10660265900018" });
    expect(classifyQuery("106602659")).toEqual({ kind: "siren", q: "106602659" });
    expect(classifyQuery("FR56 106602659")).toEqual({ kind: "siren", q: "106602659" });
    expect(classifyQuery("Proclean Empire").kind).toBe("name");
    expect(classifyQuery("ab").kind).toBe("short");
    expect(classifyQuery("1066").kind).toBe("short");
  });
  it("calcule le n° de TVA français (clé officielle)", () => {
    expect(tvaFromSiren("106602659")).toBe("FR56106602659");
  });
  it("met les noms de rues en majuscules/minuscules lisibles", () => {
    expect(titleCase("3 RUE STEPHANE CHARBONNIER")).toBe("3 Rue Stephane Charbonnier");
    expect(titleCase("SAINT-OUEN-L'AUMONE")).toBe("Saint-Ouen-L'Aumone");
    expect(titleCase(null)).toBeNull();
  });
  it("transforme une réponse de l'annuaire en fiche client, sans rien inventer", () => {
    const c = mapResult({
      siren: "106602659", nom_complet: "PROCLEAN EMPIRE (PCE)", nom_raison_sociale: "PROCLEAN EMPIRE", activite_principale: "81.21Z", nature_juridique: "5710",
      date_creation: "2026-06-20", etat_administratif: "A", tva: ["FR56106602659"],
      siege: { siret: "10660265900018", numero_voie: "3", type_voie: "RUE", libelle_voie: "STEPHANE CHARBONNIER", code_postal: "95300", libelle_commune: "PONTOISE", etat_administratif: "A", est_siege: true },
      dirigeants: [{ type_dirigeant: "personne physique", nom: "MAKAYA MATEVE", prenoms: "KEVINH DASILVAH FABRITTO" }]
    })!;
    expect(c).toMatchObject({ siren: "106602659", siret: "10660265900018", name: "PROCLEAN EMPIRE", address: "3 Rue Stephane Charbonnier", postal_code: "95300", city: "Pontoise", naf_code: "81.21Z", legal_form: "SAS", vat_number: "FR56106602659", active: true, manager: "Kevinh Makaya Mateve" });
    expect(mapResult({ siren: "abc" })).toBeNull();
    expect(mapResult({ siren: "123456789", etat_administratif: "C", siege: {} })!.active).toBe(false);
    expect(mapResult({ siren: "123456789", siege: {} })!.address).toBeNull();
  });
});
