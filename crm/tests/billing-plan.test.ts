import { describe, it, expect } from "vitest";
import { planMonthlyInvoices, type PlanInput } from "@/lib/domain/billing-plan";
import { addDays, isLastDayOfMonth, isoWeekday, monthBounds, monthLabel, parisToday } from "@/lib/domain/dates";

const settings = { default_vat_rate: 20, large_amount_threshold_ht: 1500, auto_invoicing_enabled: true, auto_invoicing_start_month: "2026-11", count_planned_as_done: true };
const client = (o: any = {}) => ({ id: "c1", name: "SEA", email: "a@b.fr", is_reserved: false, auto_send_invoices: true, status: "actif", ...o });
const contract = (o: any = {}) => ({ id: "k1", client_id: "c1", label: "Entretien SEA", billing_mode: "mensuel", monthly_amount_ht: 600, start_date: "2026-08-01", end_date: "2027-07-31", status: "actif", ...o });
const iv = (o: any = {}) => ({ id: "i1", client_id: "c1", contract_id: null, title: "Ménage studio", scheduled_date: "2026-11-05", status: "realise", billable: true, quantity: 1, unit_price_ht: 35, vat_rate: 20, invoice_id: null, ...o });
const input = (o: Partial<PlanInput> = {}): PlanInput => ({ month: "2026-11", today: "2026-11-30", settings, clients: [client()], contracts: [], interventions: [], invoicedClientIds: [], ...o } as PlanInput);

describe("dates", () => {
  it("bornes et fin de mois", () => {
    expect(monthBounds("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(monthBounds("2028-02").end).toBe("2028-02-29");
    expect(isLastDayOfMonth("2026-11-30")).toBe(true);
    expect(isLastDayOfMonth("2026-11-29")).toBe(false);
  });
  it("jours ISO et libellés", () => {
    expect(isoWeekday("2026-11-02")).toBe(1); // lundi
    expect(isoWeekday("2026-11-08")).toBe(7); // dimanche
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(monthLabel("2026-11")).toBe("novembre 2026");
  });
  it("date du jour à Paris (minuit passé en France)", () => {
    expect(parisToday(new Date("2026-11-30T23:30:00Z"))).toBe("2026-12-01");
  });
});

describe("facturation mensuelle", () => {
  it("forfait mensuel actif → une facture complète, envoi auto autorisé", () => {
    const [p] = planMonthlyInvoices(input({ contracts: [contract()] }));
    expect(p.totals).toEqual({ ht: 600, vat: 120, ttc: 720 });
    expect(p.lines[0].description).toBe("Entretien SEA — novembre 2026");
    expect(p.autoSend).toBe(true);
  });
  it("regroupe les passages identiques avec leurs dates", () => {
    const [p] = planMonthlyInvoices(input({ interventions: [iv({ id: "a", scheduled_date: "2026-11-05" }), iv({ id: "b", scheduled_date: "2026-11-12" }), iv({ id: "c", scheduled_date: "2026-11-19", title: "Linge", unit_price_ht: 20 })] }));
    expect(p.lines).toHaveLength(2);
    const m = p.lines.find((l) => l.description.startsWith("Ménage studio"))!;
    expect(m.quantity).toBe(2);
    expect(m.description).toContain("05/11, 12/11");
    expect(p.interventionIds).toEqual(["a", "b", "c"]);
    expect(p.totals.ht).toBe(90);
  });
  it("ignore annulées, non facturables, déjà facturées, à venir et hors mois", () => {
    const ivs = [iv({ id: "1", status: "annule" }), iv({ id: "2", billable: false }), iv({ id: "3", invoice_id: "x" }),
      iv({ id: "4", status: "planifie", scheduled_date: "2026-12-02" }), iv({ id: "5", scheduled_date: "2026-10-31" }), iv({ id: "6" })];
    const [p] = planMonthlyInvoices(input({ interventions: ivs }));
    expect(p.interventionIds).toEqual(["6"]);
  });
  it("planifié passé = réalisé seulement si le réglage est actif", () => {
    const i = iv({ status: "planifie", scheduled_date: "2026-11-10" });
    expect(planMonthlyInvoices(input({ interventions: [i] }))).toHaveLength(1);
    expect(planMonthlyInvoices(input({ interventions: [i], settings: { ...settings, count_planned_as_done: false } }))).toHaveLength(0);
  });
  it("jamais de doublon : client déjà facturé pour le mois ignoré", () => {
    expect(planMonthlyInvoices(input({ contracts: [contract()], invoicedClientIds: ["c1"] }))).toHaveLength(0);
  });
  it("rien avant le mois de démarrage", () => {
    expect(planMonthlyInvoices(input({ month: "2026-10", contracts: [contract()] }))).toHaveLength(0);
  });
  it("contrat commencé en cours de mois → à vérifier, jamais envoyé automatiquement", () => {
    const [p] = planMonthlyInvoices(input({ contracts: [contract({ start_date: "2026-11-15" })] }));
    expect(p.autoSend).toBe(false);
    expect(p.reasons[0]).toMatch(/proratisation/);
  });
  it("contrat résilié ou terminé avant le mois : pas de ligne", () => {
    expect(planMonthlyInvoices(input({ contracts: [contract({ status: "resilie" })] }))).toHaveLength(0);
    expect(planMonthlyInvoices(input({ contracts: [contract({ end_date: "2026-10-31" })] }))).toHaveLength(0);
  });
  it("intervention sans prix : exclue et signalée", () => {
    const [p] = planMonthlyInvoices(input({ contracts: [contract()], interventions: [iv({ unit_price_ht: null })] }));
    expect(p.interventionIds).toEqual([]);
    expect(p.autoSend).toBe(false);
  });
  describe("garde-fous d'envoi automatique", () => {
    const base = { contracts: [contract()] };
    it("contact réservé : brouillon seulement", () => {
      const [p] = planMonthlyInvoices(input({ ...base, clients: [client({ is_reserved: true })] }));
      expect(p.autoSend).toBe(false); expect(p.blockedReasons).toContain("contact réservé");
    });
    it("montant > seuil (strict) : brouillon", () => {
      expect(planMonthlyInvoices(input({ contracts: [contract({ monthly_amount_ht: 1500 })] }))[0].autoSend).toBe(true);
      expect(planMonthlyInvoices(input({ contracts: [contract({ monthly_amount_ht: 1500.01 })] }))[0].autoSend).toBe(false);
    });
    it("client sans e-mail, sans case « envoi auto », ou réglage global coupé", () => {
      expect(planMonthlyInvoices(input({ ...base, clients: [client({ email: null })] }))[0].autoSend).toBe(false);
      expect(planMonthlyInvoices(input({ ...base, clients: [client({ auto_send_invoices: false })] }))[0].autoSend).toBe(false);
      expect(planMonthlyInvoices(input({ ...base, settings: { ...settings, auto_invoicing_enabled: false } }))[0].autoSend).toBe(false);
    });
  });
});

import { contractVisits } from "@/lib/domain/schedule";
describe("planning généré depuis les contrats", () => {
  const k = (o: any = {}) => ({ id: "k1", client_id: "c1", label: "SEA", billing_mode: "mensuel", per_visit_amount_ht: null, status: "actif", start_date: null, end_date: null, weekdays: [3, 6], start_time: "08:00", hours_per_visit: 2, site_address: null, ...o });
  it("mercredis et samedis de novembre 2026", () => {
    const v = contractVisits([k()], "2026-11");
    expect(v.map((x) => x.scheduled_date)).toEqual(["2026-11-04", "2026-11-07", "2026-11-11", "2026-11-14", "2026-11-18", "2026-11-21", "2026-11-25", "2026-11-28"]);
    expect(v[0]).toMatchObject({ billable: false, unit_price_ht: null, source_key: "contract:k1:2026-11-04", duration_hours: 2 });
  });
  it("contrat au passage : facturable au tarif du passage", () => {
    const [v] = contractVisits([k({ billing_mode: "passage", per_visit_amount_ht: 120, weekdays: [2] })], "2026-11");
    expect(v).toMatchObject({ billable: true, unit_price_ht: 120 });
  });
  it("respecte dates de début et de fin, statut et absence de jours", () => {
    expect(contractVisits([k({ start_date: "2026-11-20" })], "2026-11").map((x) => x.scheduled_date)).toEqual(["2026-11-21", "2026-11-25", "2026-11-28"]);
    expect(contractVisits([k({ end_date: "2026-11-10" })], "2026-11").map((x) => x.scheduled_date)).toEqual(["2026-11-04", "2026-11-07"]);
    expect(contractVisits([k({ status: "resilie" })], "2026-11")).toEqual([]);
    expect(contractVisits([k({ weekdays: null })], "2026-11")).toEqual([]);
    expect(contractVisits([k({ end_date: "2026-10-31" })], "2026-11")).toEqual([]);
  });
});
