import { describe, expect, it } from "vitest";
import { canAutoRun, parseLevel, touchesMoney } from "../src/lib/jarvis/autonomy";

describe("autonomie de Jarvis", () => {
  it("l'argent n'est jamais délégué, quel que soit le niveau", () => {
    for (const k of ["send_invoice", "relance_paiement", "issue_credit_note", "virement", "rembourser", "legal_notice", "changer le prix"]) {
      expect(touchesMoney(k), k).toBe(true);
      for (const l of [0, 1, 2] as const) expect(canAutoRun(l, k), `${k}/${l}`).toBe(false);
    }
  });
  it("niveaux : prudent ne fait rien seul, équilibré crée des tâches, délégué prépare aussi des brouillons", () => {
    expect(canAutoRun(0, "create_task")).toBe(false);
    expect(canAutoRun(1, "create_task")).toBe(true);
    expect(canAutoRun(1, "draft")).toBe(false);
    expect(canAutoRun(2, "draft")).toBe(true);
    expect(canAutoRun(2, "contact_client")).toBe(false);
  });
  it("lit le niveau enregistré, prudent par défaut", () => {
    expect(parseLevel("2")).toBe(2); expect(parseLevel(null)).toBe(0); expect(parseLevel("abc")).toBe(0);
  });
});
