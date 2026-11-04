import { describe, it, expect } from "vitest";
import { planMonthlyInvoices, type PlanInput } from "@/lib/domain/billing-plan";
import { overdueSequence } from "@/lib/domain/reminders";

const settings = { default_vat_rate: 20, large_amount_threshold_ht: 1500, auto_invoicing_enabled: true, auto_invoicing_start_month: "2026-11", count_planned_as_done: true, billing_requires_validation: true };
const client = (o: any = {}) => ({ id: "c1", name: "SEA", email: "a@b.fr", is_reserved: false, auto_send_invoices: true, status: "actif", ...o });
const contract = (o: any = {}) => ({ id: "k1", client_id: "c1", label: "Entretien SEA", billing_mode: "mensuel", monthly_amount_ht: 600, start_date: "2026-08-01", end_date: "2027-07-31", status: "actif", ...o });
const mission = (o: any = {}) => ({ id: "m1", client_id: "c1", contract_id: null, title: "Ménage studio", scheduled_date: "2026-11-05", status: "realise", stage: "validee", billable: true, quantity: 1, unit_price_ht: 35, vat_rate: 20, invoice_id: null, ...o });
const input = (o: Partial<PlanInput> = {}): PlanInput => ({ month: "2026-11", today: "2026-11-30", settings, clients: [client()], contracts: [], interventions: [], invoicedClientIds: [], ...o } as PlanInput);

describe("facturation depuis les missions validées", () => {
  it("facture les missions validées et facturables, pas les autres", () => {
    const ivs = [mission({ id: "ok1" }), mission({ id: "ok2", stage: "facturable", scheduled_date: "2026-11-12" }),
      mission({ id: "t", stage: "terminee", status: "realise" }), mission({ id: "v", stage: "a_verifier" }), mission({ id: "p", stage: "affectee", status: "planifie", scheduled_date: "2026-11-20" })];
    const [p] = planMonthlyInvoices(input({ interventions: ivs }));
    expect(p.interventionIds).toEqual(["ok1", "ok2"]);
    expect(p.totals.ht).toBe(70);
  });
  it("des missions terminées non validées ne partent jamais en envoi automatique", () => {
    const [p] = planMonthlyInvoices(input({ contracts: [contract()], interventions: [mission({ id: "t", stage: "terminee" })] }));
    expect(p.lines).toHaveLength(1); // forfait seul
    expect(p.autoSend).toBe(false);
    expect(p.blockedReasons.join(" ")).toMatch(/1 mission\(s\) terminée\(s\) ou passée\(s\) pas encore validée\(s\)/);
  });
  it("un passage passé jamais confirmé n'est pas facturé (même si « planifié passé = réalisé » était coché)", () => {
    const [p] = planMonthlyInvoices(input({ contracts: [contract()], interventions: [mission({ id: "x", stage: "affectee", status: "planifie", scheduled_date: "2026-11-03" })] }));
    expect(p.interventionIds).toEqual([]);
    expect(p.autoSend).toBe(false);
  });
  it("seulement des missions non validées : aucune facture créée", () => {
    expect(planMonthlyInvoices(input({ interventions: [mission({ stage: "terminee" })] }))).toEqual([]);
  });
  it("réglage désactivé ou ancien format sans étape : règle historique inchangée", () => {
    const [a] = planMonthlyInvoices(input({ settings: { ...settings, billing_requires_validation: false }, interventions: [mission({ stage: "terminee" })] }));
    expect(a.interventionIds).toEqual(["m1"]);
    const { stage, ...legacy } = mission();
    const [b] = planMonthlyInvoices(input({ interventions: [legacy as any] }));
    expect(b.interventionIds).toEqual(["m1"]);
  });
  it("contact réservé : validée ou non, jamais d'envoi automatique", () => {
    const [p] = planMonthlyInvoices(input({ clients: [client({ is_reserved: true })], interventions: [mission()] }));
    expect(p.autoSend).toBe(false);
    expect(p.blockedReasons).toContain("contact réservé");
  });
});

describe("séquence d'impayés", () => {
  const s = { reminder_first_after_days: 1, reminder_interval_days: 6, reminder_max_count: 2, unpaid_alert_days: 15, reminder_manual_days: 30 };
  it("J+1, J+7 relances automatiques, J+15 alerte, J+30 action manuelle, dans l'ordre", () => {
    const steps = overdueSequence(0, 0, s);
    expect(steps.map((x) => [x.day, x.kind])).toEqual([[1, "auto"], [7, "auto"], [15, "alerte"], [30, "manuel"]]);
    expect(steps.every((x) => x.state === "a_venir")).toBe(true);
  });
  it("marque fait / dû / à venir selon le retard et les relances envoyées", () => {
    const st = (d: number, n: number) => overdueSequence(d, n, s).map((x) => x.state);
    expect(st(2, 0)).toEqual(["du", "a_venir", "a_venir", "a_venir"]);
    expect(st(8, 1)).toEqual(["fait", "du", "a_venir", "a_venir"]);
    expect(st(16, 2)).toEqual(["fait", "fait", "du", "a_venir"]);
    expect(st(31, 2)).toEqual(["fait", "fait", "du", "du"]);
  });
  it("les jours sont réglables", () => {
    const steps = overdueSequence(0, 0, { ...s, reminder_first_after_days: 3, reminder_interval_days: 5, unpaid_alert_days: 20, reminder_manual_days: 45 });
    expect(steps.map((x) => x.day)).toEqual([3, 8, 20, 45]);
  });
});
