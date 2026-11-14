import { describe, it, expect } from "vitest";
import { byCity, coverage, headcountLabel, pointOf, targetsOf } from "@/lib/territoire";

const etab = (o: object = {}) => ({ siret: "78436348301113", code_postal: "95680", libelle_commune: "MONTLIGNON", adresse: "165 RUE DE PARIS 95680 MONTLIGNON", etat_administratif: "A", latitude: "49.02", longitude: "2.29", activite_principale: "88.99B", ...o });
const company = (o: object = {}) => ({ siren: "784363483", nom_complet: "UNAFAM", etat_administratif: "A", tranche_effectif_salarie: "21", activite_principale: "88.99B", siege: etab({ siret: "78436348302145", code_postal: "92300", libelle_commune: "LEVALLOIS-PERRET" }), matching_etablissements: [etab()], ...o });

describe("lecture de l'annuaire pour le territoire", () => {
  it("garde les établissements ouverts du département, pas le siège situé ailleurs ni les établissements fermés", () => {
    const r = targetsOf(company({ matching_etablissements: [etab(), etab({ siret: "78436348300001", etat_administratif: "F" }), etab({ siret: "78436348300002", code_postal: "75001" })] }), "95", "sante");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ siret: "78436348301113", siren: "784363483", name: "Unafam", city: "Montlignon", postal_code: "95680", dept: "95", lat: 49.02, lng: 2.29, headcount: "21", sector: "sante" });
  });
  it("le siège compte s'il est dans le département ; jamais de doublon", () => {
    const r = targetsOf(company({ siege: etab(), matching_etablissements: [etab()] }), "95", "sante");
    expect(r).toHaveLength(1);
  });
  it("entreprise fermée, SIREN invalide ou sans nom : rien ; position absurde : gardée sans position", () => {
    expect(targetsOf(company({ etat_administratif: "C" }), "95", "sante")).toEqual([]);
    expect(targetsOf(company({ siren: "12" }), "95", "sante")).toEqual([]);
    expect(targetsOf(company({ nom_complet: "" }), "95", "sante")).toEqual([]);
    expect(targetsOf(company({ matching_etablissements: [etab({ latitude: "0", longitude: "abc" })] }), "95", "sante")[0]).toMatchObject({ lat: null, lng: null });
  });
  it("filtre fin : automobile ne garde que les codes 45, commerces les 46 et 47", () => {
    const c = company({ matching_etablissements: [etab({ activite_principale: "45.11Z" }), etab({ siret: "78436348300009", activite_principale: "47.11F" })] });
    expect(targetsOf(c, "95", "auto").map((t) => t.naf_code)).toEqual(["45.11Z"]);
    expect(targetsOf(c, "95", "commerce").map((t) => t.naf_code)).toEqual(["47.11F"]);
  });
});

describe("avancement du territoire", () => {
  const p = (city: string, state: string, lat: number | null = 49) => pointOf(["1", "X", city, lat, lat == null ? null : 2, "11", "bureaux", state, null, null, null, null]);
  it("pourcentage de couverture, sans division par zéro", () => {
    expect(coverage(0, 0)).toBe(0); expect(coverage(1, 3)).toBe(33.3); expect(coverage(8, 10)).toBe(80);
  });
  it("par commune : totaux, clients, en cours, position moyenne ; les plus grosses d'abord", () => {
    const r = byCity([p("Pontoise", "client"), p("Pontoise", "cible"), p("Pontoise", "en_cours"), p("Cergy", "cible", null)]);
    expect(r[0]).toMatchObject({ city: "Pontoise", total: 3, clients: 1, enCours: 1, pct: 33.3, lat: 49, lng: 2 });
    expect(r[1]).toMatchObject({ city: "Cergy", total: 1, lat: null });
  });
  it("libellé d'effectif", () => {
    expect(headcountLabel("12")).toBe("20 à 49 salariés"); expect(headcountLabel(null)).toBe("effectif non communiqué"); expect(headcountLabel("NN")).toBe("effectif non communiqué");
  });
});
