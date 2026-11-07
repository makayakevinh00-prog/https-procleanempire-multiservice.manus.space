import { describe, it, expect } from "vitest";
import { guessActivity, clientActivityMap, contractActivity, invoiceActivity, missionActivity, profitability, isActivity, type ActivityContract } from "../src/lib/domain/activity";

const c = (over: Partial<ActivityContract>): ActivityContract => ({ clientId: "k1", activity: null, label: "Entretien", terms: null, clientName: "Société Exemple", monthly: 100, ...over });

describe("familles d'activité", () => {
  it("déduit la gestion locative, le nettoyage Airbnb, les bureaux et le ponctuel (données fictives)", () => {
    expect(guessActivity({ label: "Gestion séjours Lyon", hasContract: true })).toBe("gestion_locative");
    expect(guessActivity({ label: "Gestion Abritel et Booking", hasContract: true })).toBe("gestion_locative");
    expect(guessActivity({ title: "Nettoyage Airbnb, sortie de clients", hasContract: false })).toBe("nettoyage_airbnb");
    expect(guessActivity({ label: "Entretien bureaux Exemple", hasContract: true })).toBe("nettoyage_pro");
    expect(guessActivity({ title: "Remise en état après travaux", hasContract: false })).toBe("ponctuel");
  });
  it("la famille enregistrée l'emporte toujours sur la déduction", () => {
    expect(contractActivity(c({ activity: "ponctuel", label: "Gestion séjours" }))).toBe("ponctuel");
    expect(missionActivity({ activity: "nettoyage_pro", contractId: "x", title: "Airbnb", clientName: null }, new Map([["x", "gestion_locative"]]))).toBe("nettoyage_pro");
  });
  it("une facture prend la famille dominante des contrats du client, sinon ponctuelle", () => {
    const m = clientActivityMap([c({ clientId: "a", label: "Entretien bureaux", monthly: 900 }), c({ clientId: "a", label: "Gestion séjours", monthly: 100 }), c({ clientId: "b", label: "Gestion séjours" })]);
    expect(invoiceActivity({ activity: null, clientId: "a" }, m)).toBe("nettoyage_pro");
    expect(invoiceActivity({ activity: null, clientId: "b" }, m)).toBe("gestion_locative");
    expect(invoiceActivity({ activity: null, clientId: "zzz" }, m)).toBe("ponctuel");
    expect(invoiceActivity({ activity: "nettoyage_airbnb", clientId: "a" }, m)).toBe("nettoyage_airbnb");
  });
  it("une mission suit son contrat, sinon les mots, sinon ponctuelle", () => {
    const by = new Map([["ct", "nettoyage_pro" as const]]);
    expect(missionActivity({ activity: null, contractId: "ct", title: "Passage", clientName: null }, by)).toBe("nettoyage_pro");
    expect(missionActivity({ activity: null, contractId: null, title: "Ménage Airbnb départ voyageurs", clientName: null }, by)).toBe("nettoyage_airbnb");
    expect(missionActivity({ activity: null, contractId: null, title: "Vitres", clientName: "Client X" }, by)).toBe("ponctuel");
  });
  it("rentabilité : chiffre par heure et marge ESTIMÉE ; rien d'inventé sans heures", () => {
    const p = profitability(600, 6, 20);   // 6 h/sem ≈ 26 h/mois ; coût 520 ; marge 80
    expect(Math.round(p.monthlyHours)).toBe(26); expect(Math.round(p.revenuePerHour!)).toBe(23); expect(Math.round(p.marginMonthly!)).toBe(80);
    const none = profitability(600, 0, 20);
    expect(none.revenuePerHour).toBeNull(); expect(none.marginMonthly).toBeNull();
  });
  it("valide les clés", () => { expect(isActivity("ponctuel")).toBe(true); expect(isActivity("nimporte")).toBe(false); });
});
