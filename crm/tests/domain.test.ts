import { describe, it, expect } from "vitest";
import { recruitmentLevel, weeklyHours, weeklyRevenueHt, salarieLoadedHourly, summarize } from "@/lib/domain/recruitment";
import { documentTotals, isLargeAmount, parseDbError } from "@/lib/domain/billing";
import { autoReminderDecision } from "@/lib/domain/reminders";
import { matchPayment } from "@/lib/domain/matching";
import type { Contract, Settings } from "@/lib/domain/types";

const settings = {
  indep_hourly_cost: 22, salarie_gross_hourly: 12.02, salarie_employer_charges_pct: 42, salarie_paid_leave_pct: 10,
  recruit_green_max_hours: 30, recruit_orange_max_hours: 35, large_amount_threshold_ht: 1500,
  auto_reminders_enabled: true, reminder_first_after_days: 7, reminder_interval_days: 14, reminder_max_count: 3
} as Settings;

describe("indicateur de recrutement", () => {
  it.each([
    [0, "vert"], [29.99, "vert"], [30, "orange"], [35, "orange"], [35.01, "rouge"], [60, "rouge"]
  ])("%s h → %s", (h, level) => expect(recruitmentLevel(h)).toBe(level));
});

describe("heures et CA hebdo", () => {
  it("multiplie heures × fréquence, null si inconnu", () => {
    expect(weeklyHours({ hours_per_visit: 2.5, visits_per_week: 2 })).toBe(5);
    expect(weeklyHours({ hours_per_visit: null, visits_per_week: 2 })).toBeNull();
  });
  it("CA hebdo : mensuel×12/52, passage×fréquence", () => {
    expect(weeklyRevenueHt({ billing_mode: "mensuel", monthly_amount_ht: 470, per_visit_amount_ht: null, visits_per_week: null })).toBe(108.46);
    expect(weeklyRevenueHt({ billing_mode: "passage", monthly_amount_ht: null, per_visit_amount_ht: 120, visits_per_week: 2 })).toBe(240);
    expect(weeklyRevenueHt({ billing_mode: "autre", monthly_amount_ht: null, per_visit_amount_ht: null, visits_per_week: 1 })).toBeNull();
  });
  it("coût salarié chargé", () => expect(salarieLoadedHourly(settings)).toBe(18.78));
  it("compare indépendant / salarié et signale les sites sans heures", () => {
    const mk = (h: number | null, rev: number): any => ({ contract: {} as Contract, clientName: "x", weeklyHours: h, weeklyRevenue: rev });
    const r = summarize([mk(10, 100), mk(null, 50)], settings);
    expect(r.totalHours).toBe(10);
    expect(r.sitesMissingHours).toBe(1);
    expect(r.weeklyRevenue).toBe(100); // le site sans heures n'entre pas dans la marge
    expect(r.cheaper).toBe("salarie");
    expect(r.indep.weekly).toBe(220);
  });
});

describe("facturation", () => {
  it("totaux identiques au SQL (129,17 HT → 155,00 TTC)", () => {
    expect(documentTotals([{ description: "x", quantity: 1, unit_price_ht: 129.17, vat_rate: 20 }])).toEqual({ ht: 129.17, vat: 25.83, ttc: 155 });
  });
  it("alerte strictement au-dessus de 1500 € HT", () => {
    expect(isLargeAmount(1500, settings)).toBe(false);
    expect(isLargeAmount(1500.01, settings)).toBe(true);
  });
  it("décode les erreurs métier", () => {
    expect(parseDbError("CONTACT_RESERVE: Ahmed — confirmation")).toEqual({ code: "CONTACT_RESERVE", text: "Ahmed — confirmation" });
  });
});

describe("relances automatiques", () => {
  const base = { status: "en_retard", due_date: "2026-10-01", reminder_count: 0, last_reminder_at: null, client_is_reserved: false, total_ht: 100 };
  const now = new Date("2026-10-27T10:00:00Z");
  it("autorise une facture en retard sans relance", () => expect(autoReminderDecision(base, settings, now).allowed).toBe(true));
  it("bloque les contacts réservés", () => expect(autoReminderDecision({ ...base, client_is_reserved: true }, settings, now).allowed).toBe(false));
  it("bloque si relance récente", () =>
    expect(autoReminderDecision({ ...base, reminder_count: 1, last_reminder_at: "2026-10-20T10:00:00Z" }, settings, now).allowed).toBe(false));
  it("bloque au maximum de relances", () => expect(autoReminderDecision({ ...base, reminder_count: 3 }, settings, now).allowed).toBe(false));
  it("alerte patron au-dessus du seuil (pas d'action automatique)", () =>
    expect(autoReminderDecision({ ...base, total_ht: 1500.01 }, settings, now).allowed).toBe(false));
  it("bloque si désactivé", () => expect(autoReminderDecision(base, { ...settings, auto_reminders_enabled: false }, now).allowed).toBe(false));
  it("attend le délai avant première relance", () =>
    expect(autoReminderDecision({ ...base, due_date: "2026-10-24" }, settings, now).allowed).toBe(false));
});

describe("rapprochement bancaire", () => {
  const inv = (o: any = {}) => ({ id: "i1", number: "F-2026-001", total_ttc: 144, paid_amount: 0, client_name: "SWYFO", client_is_reserved: false, ...o });
  const pay = (o: any = {}) => ({ amount: 144, label: "VIR SWYFO F-2026-001", reference: null, counterparty: "SWYFO", ...o });
  it("certain : numéro + montant exact", () => expect(matchPayment(pay(), [inv()])?.confidence).toBe("certain"));
  it("probable : montant exact + nom, sans numéro", () =>
    expect(matchPayment(pay({ label: "Virement SWYFO" }), [inv()])?.confidence).toBe("probable"));
  it("jamais certain pour un contact réservé", () =>
    expect(matchPayment(pay(), [inv({ client_is_reserved: true })])?.confidence).toBe("probable"));
  it("rien si le montant et le numéro ne collent pas", () =>
    expect(matchPayment(pay({ amount: 10, label: "autre" }), [inv()])).toBeNull());
  it("ambiguïté → jamais automatique", () =>
    expect(matchPayment(pay(), [inv(), inv({ id: "i2" })])?.confidence).toBe("probable"));
});
