import { describe, expect, it } from "vitest";
import { reminderEmail } from "../src/lib/mail-templates";
import { dueInfo } from "../src/lib/utils";

const base = { company: "ProClean Empire", number: "F-1", totalTtc: "200,00 €", dueDate: "01/11/2026", fee: "40,00 €", feeLevel: 3, totalWithFee: "240,00 €" };
describe("relances à 3 niveaux", () => {
  it("1re et 2e relance : avertissement, aucun frais ajouté", () => {
    for (const level of [1, 2]) {
      const m = reminderEmail({ ...base, level });
      expect(m.text).toContain("40,00 €");
      expect(m.text).not.toContain("240,00 €");
      expect(m.subject).not.toContain("frais");
    }
  });
  it("3e relance : frais ajoutés et total à régler", () => {
    const m = reminderEmail({ ...base, level: 3 });
    expect(m.subject).toContain("frais de recouvrement");
    expect(m.text).toContain("240,00 €");
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
