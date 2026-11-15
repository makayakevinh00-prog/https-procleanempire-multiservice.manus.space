import { describe, expect, it } from "vitest";
import { reminderEmail } from "../src/lib/mail-templates";
import { dueInfo } from "../src/lib/utils";

const base = { company: "ProClean Empire", number: "F-1", totalTtc: "200,00 €", dueDate: "01/11/2026", fee: "40,00 €", feeLevel: 3, totalWithFee: "240,00 €" };
const pro = { ...base, professional: true };

describe("relances à 3 niveaux — client professionnel", () => {
  it("1re et 2e relance : avertissement, aucun frais ajouté", () => {
    for (const level of [1, 2]) {
      const m = reminderEmail({ ...pro, level });
      expect(m.text).toContain("40,00 €");
      expect(m.text).not.toContain("240,00 €");
      expect(m.subject).not.toContain("frais");
    }
  });
  it("3e relance : frais ajoutés et total à régler", () => {
    const m = reminderEmail({ ...pro, level: 3 });
    expect(m.subject).toContain("frais de recouvrement");
    expect(m.text).toContain("240,00 €");
  });
});

describe("relances écrites d'après la situation", () => {
  it("particulier ou nature inconnue : jamais de frais de recouvrement, à aucun niveau", () => {
    for (const professional of [false, undefined]) for (const level of [1, 2, 3, 4]) {
      const m = reminderEmail({ ...base, professional, level });
      expect(m.text).not.toMatch(/frais|40,00 €|240,00 €/);
      expect(m.subject).not.toMatch(/frais/);
    }
    const last = reminderEmail({ ...base, professional: false, level: 3 });
    expect(last.subject).toBe("Facture F-1 — dernier rappel");
    expect(last.text).toMatch(/nous chercherons ensemble une solution/);
  });
  it("le ton suit le niveau : courtois, puis ferme en citant le rappel précédent et le retard", () => {
    const one = reminderEmail({ ...base, level: 1, daysLate: 2 });
    expect(one.subject).toBe("Facture F-1 — rappel d'échéance");
    expect(one.text).toMatch(/Sauf erreur ou omission de notre part, la facture F-1 d'un montant de 200,00 € TTC, arrivée à échéance le 01\/11\/2026, n'a pas encore été réglée\./);
    expect(one.text).not.toMatch(/jours de retard/);
    const two = reminderEmail({ ...base, level: 2, previousDate: "08/11/2026", daysLate: 8 });
    expect(two.subject).toBe("Facture F-1 — 2e rappel");
    expect(two.text).toMatch(/Malgré notre rappel du 08\/11\/2026, la facture F-1 .*\(8 jours de retard\), reste impayée\./);
    expect(two.text).toMatch(/nous indiquer la date de paiement prévue/);
  });
  it("paiement partiel : seul le reste dû est demandé", () => {
    const m = reminderEmail({ ...base, level: 1, remaining: "80,00 €" });
    expect(m.text).toMatch(/dont il reste 80,00 € TTC à régler après votre règlement partiel/);
    expect(m.text).toMatch(/n'est pas encore soldée/);
    expect(reminderEmail({ ...base, level: 1, remaining: "200,00 €" }).text).not.toMatch(/partiel/);
  });
  it("la pièce jointe et l'IBAN ne sont annoncés que s'ils sont fournis ; la période ou l'intervention est rappelée", () => {
    const bare = reminderEmail({ ...base, level: 1 });
    expect(bare.text).not.toMatch(/pièce jointe|IBAN/);
    const full = reminderEmail({ ...base, level: 1, attached: true, iban: "FR76 1234", period: "octobre 2026" });
    expect(full.text).toMatch(/Vous trouverez la facture en pièce jointe\. Règlement par virement bancaire — IBAN : FR76 1234\. Merci d'indiquer le numéro F-1 en référence\./);
    expect(full.text).toMatch(/la facture F-1 \(prestations de octobre 2026\)/);
    expect(reminderEmail({ ...base, level: 1, interventionDate: "03/11/2026" }).text).toMatch(/la facture F-1 pour l'intervention du 03\/11\/2026/);
  });
  it("toujours : la phrase « déjà réglé », la signature du service facturation, aucun nom de personne", () => {
    for (const level of [1, 2, 3]) for (const professional of [true, false]) {
      const m = reminderEmail({ ...base, level, professional, phone: "06 17 21 22 30" });
      expect(m.text).toMatch(/Si votre règlement a été effectué entre-temps, merci de ne pas tenir compte de ce message\./);
      expect(m.text).toMatch(/Cordialement,\n\nLe service facturation\n\nProClean Empire\n\ncontact@procleanempire\.com\n\n06 17 21 22 30$/);
      expect(m.html).toContain("Le service facturation<br>ProClean Empire");
      expect(m.fromName).toBe("ProClean Empire - Service facturation");
      expect(m.text + m.html + m.subject).not.toMatch(/Kevinh|Makaya/i);
    }
  });
});

describe("jours restants avant échéance", () => {
  const now = new Date("2026-11-06T10:00:00");
  it("calcule retard / aujourd'hui / reste", () => {
    expect(dueInfo("2026-11-01", "envoye", now)?.label).toBe("en retard de 5 j");
    expect(dueInfo("2026-11-06", "envoye", now)?.tone).toBe("orange");
    expect(dueInfo("2026-11-16", "envoye", now)?.label).toBe("reste 10 j");
    expect(dueInfo("2026-11-16", "paye", now)).toBeNull();
  });
});
