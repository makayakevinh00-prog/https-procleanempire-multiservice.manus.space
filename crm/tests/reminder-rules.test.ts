import { describe, expect, it } from "vitest";
import { feeApplies, frenchHolidays, isBusinessDay, paymentHold, reminderRecipients, type BankCredit } from "@/lib/domain/reminders";

describe("quand relancer : jours ouvrés seulement", () => {
  it("ni samedi, ni dimanche", () => {
    expect(isBusinessDay("2026-11-13")).toBe(true);    // vendredi
    expect(isBusinessDay("2026-11-14")).toBe(false);   // samedi
    expect(isBusinessDay("2026-11-15")).toBe(false);   // dimanche
    expect(isBusinessDay("2026-11-16")).toBe(true);    // lundi
  });
  it("ni jour férié (fixes et mobiles)", () => {
    expect(isBusinessDay("2026-11-11")).toBe(false);   // armistice, un mercredi
    expect(isBusinessDay("2026-12-25")).toBe(false);
    expect(isBusinessDay("2027-01-01")).toBe(false);
    expect(frenchHolidays(2026)).toEqual(expect.arrayContaining(["2026-04-06", "2026-05-14", "2026-05-25"]));   // lundi de Pâques, Ascension, lundi de Pentecôte
    expect(frenchHolidays(2027)).toEqual(expect.arrayContaining(["2027-03-29", "2027-05-06", "2027-05-17"]));
    expect(isBusinessDay("2026-04-06")).toBe(false);
    expect(isBusinessDay("2026-04-07")).toBe(true);
  });
});

describe("à qui : là où la facture est partie", () => {
  it("adresse du client, adresses d'envoi de la facture, adresses « reçoit les factures », sans doublon ni adresse invalide", () => {
    expect(reminderRecipients("compta@client.fr", "Compta@Client.fr, direction@client.fr ; pas-une-adresse", ["direction@client.fr", "achats@client.fr", null])).toEqual(["compta@client.fr", "direction@client.fr", "achats@client.fr"]);
    expect(reminderRecipients(null, "seule@client.fr")).toEqual(["seule@client.fr"]);
    expect(reminderRecipients(null, null, [])).toEqual([]);
  });
});

describe("frais de recouvrement : professionnels seulement", () => {
  it("entreprise oui ; particulier ou nature inconnue non", () => {
    expect(feeApplies("entreprise")).toBe(true);
    expect(feeApplies("particulier")).toBe(false);
    expect(feeApplies(undefined)).toBe(false);
    expect(feeApplies(null)).toBe(false);
  });
});

describe("avant de relancer : un virement paie-t-il déjà la facture ?", () => {
  const inv = { number: "F2610-000056", issue_date: "2026-10-31", total_ttc: 255, paid_amount: 0 };
  const credit = (o: Partial<BankCredit>): BankCredit => ({ id: "t1", amount: 255, date: "2026-11-18", label: "M AHMED EL YOUSSFI", reference: "virement", ...o });
  const today = "2026-11-20";
  it("aucun virement : la relance peut partir", () => {
    expect(paymentHold(inv, "Ahmed El Youssfi", [], today)).toBeNull();
    expect(paymentHold(inv, "Ahmed El Youssfi", [credit({ amount: 90, label: "AUTRE CLIENT", reference: "x" })], today)).toBeNull();
  });
  it("le virement cite le numéro de la facture : retenue, même si le montant diffère ou s'il est ancien", () => {
    const h = paymentHold(inv, "Ahmed El Youssfi", [credit({ amount: 100, date: "2026-11-02", label: "SCI DU PARC", reference: "Facture F2610 000056" })], today);
    expect(h).toMatchObject({ amount: 100, date: "2026-11-02", reason: "il cite le numéro de la facture" });
  });
  it("même montant que le reste dû + payeur proche du client + moins de 10 jours : retenue", () => {
    expect(paymentHold(inv, "Ahmed El Youssfi", [credit({})], today)).toMatchObject({ amount: 255, payer: "M AHMED EL YOUSSFI" });
    expect(paymentHold(inv, "Ahmed El Youssfi", [credit({ date: "2026-11-05" })], today)).toBeNull();                 // trop ancien
    expect(paymentHold(inv, "Ahmed El Youssfi", [credit({ label: "SOCIETE DUPONT" })], today)).toBeNull();            // autre payeur
    expect(paymentHold(inv, "Ahmed El Youssfi", [credit({ amount: 254 })], today)).toBeNull();                        // autre montant
  });
  it("un virement reçu avant l'émission de la facture ne compte pas", () => {
    expect(paymentHold(inv, "Ahmed El Youssfi", [credit({ date: "2026-10-20", reference: "F2610-000056" })], today)).toBeNull();
  });
  it("un virement déjà rattaché ou écarté dans le CRM ne retient jamais la relance", () => {
    expect(paymentHold(inv, "Ahmed El Youssfi", [credit({})], today, new Set(["t1"]))).toBeNull();
    expect(paymentHold(inv, "Ahmed El Youssfi", [credit({ id: "t2" })], today, new Set(["t1"]))).not.toBeNull();
  });
  it("paiement partiel déjà compté : le même virement ne retient pas la relance du reste ; un nouveau virement du reste dû, si", () => {
    const partial = { ...inv, paid_amount: 100 };
    expect(paymentHold(partial, "Ahmed El Youssfi", [credit({ amount: 100, reference: "F2610-000056" })], today)).toBeNull();
    expect(paymentHold(partial, "Ahmed El Youssfi", [credit({ amount: 155 })], today)).toMatchObject({ amount: 155 });
  });
  it("facture soldée : rien à retenir", () => {
    expect(paymentHold({ ...inv, paid_amount: 255 }, "Ahmed El Youssfi", [credit({})], today)).toBeNull();
  });
});
