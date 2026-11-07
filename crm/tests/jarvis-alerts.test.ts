import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { superviseAlerts, summarizeAlerts, FAMILY, type AlertsSnapshot, type Tracked } from "@/lib/jarvis/alerts";

const TODAY = "2026-11-07";
const base = (o: Partial<AlertsSnapshot> = {}): AlertsSnapshot => ({
  today: TODAY, nowMinutes: 10 * 60, settings: { unpaid_alert_days: 7, reminder_manual_days: 30, quote_followup_days: 7, large_amount_threshold_ht: 1000 },
  mailFailures: [], notArrived: [], claims: [], anomalies: [], requests: [], prospects: [], quotesAccepted: [], quotesSent: [], invoices: [], payments: [],
  missionsToCheck: [], missionsToValidate: [], missionsToConfirm: [], upcoming: [], missionsUnbilled: [], contracts: [], clientsNoEmail: [], ...o
});
const up = (o: object) => ({ id: "i", contract_id: "k1", scheduled_date: "2026-11-12", staff_id: null, assignee: null, title: "Entretien SEA", client_name: "SEA", contract_label: "Entretien SEA", ...o });
const codes = (a: ReturnType<typeof superviseAlerts>) => a.map((x) => x.code);

describe("supervision de « À faire maintenant » — les cinq familles demandées", () => {
  it("1. mission terminée à valider pour facturation → Finance, avec lien et action proposée", () => {
    const [a] = superviseAlerts(base({ missionsToValidate: [{ id: "m1", title: "Entretien SEA", client_name: "SEA", scheduled_date: "2026-11-04" }] }));
    expect(a).toMatchObject({ code: "mission_to_validate", agent: "finance", entity_type: "intervention", entity_id: "m1", href: expect.stringContaining("/missions") });
    expect(a.reason).toContain("non facturable");
    expect(a.proposal.length).toBeGreaterThan(10);
  });
  it("2. mission sans intervenant : seulement la vraie anomalie (imminente, sans règle) → Opérations, prioritaire", () => {
    const s = base({ upcoming: [up({ id: "x", scheduled_date: "2026-11-08" }), up({ id: "y", scheduled_date: "2026-11-09" })] });
    // le 08 et le 09 sont couverts par l'organisation du dirigeant : aucune alerte
    expect(superviseAlerts(s)).toEqual([]);
    const late = superviseAlerts(base({ today: "2026-11-12", upcoming: [up({ id: "z", scheduled_date: "2026-11-13" })] }));
    expect(late[0]).toMatchObject({ code: "mission_unassigned", agent: "operations", severity: "urgent", entity_id: "z" });
  });
  it("3. contrat incomplet (jours, durée, intervenant…) → Finance & Administration, manques listés", () => {
    const k = { id: "k", label: "Entretien SEA", client_name: "SEA", billing_mode: "passage" as const, monthly_amount_ht: null, per_visit_amount_ht: 120, terms: null, weekdays: null, visits_per_week: 2, hours_per_visit: null, site_address: null, assignee: null, start_date: null };
    const [a] = superviseAlerts(base({ contracts: [k] }));
    expect(a).toMatchObject({ code: "contract_incomplete", agent: "finance", dedupe_key: "contract:k", severity: "attention" });
    for (const m of ["jours de passage", "durée par passage", "intervenant"]) expect(a.reason).toContain(m);
    expect(superviseAlerts(base({ contracts: [{ ...k, weekdays: [1, 4], hours_per_visit: 2, site_address: "1 rue A", assignee: "Esma", start_date: "2026-10-01" }] }))).toEqual([]);
  });
  it("4. client actif sans e-mail → Commercial, priorité basse", () => {
    const [a] = superviseAlerts(base({ clientsNoEmail: [{ id: "c1", name: "Client A" }] }));
    expect(a).toMatchObject({ code: "client_no_email", agent: "commercial", severity: "info", href: "/clients?filtre=sans_email" });
  });
  it("5. les autres alertes du CRM : factures, devis, demandes, paiements, e-mails, réclamations, anomalies…", () => {
    const a = superviseAlerts(base({
      mailFailures: [{ id: "e1", to_email: "x@y.fr", subject: "Facture", error: "550 rejected", sent_at: "2026-11-06T10:00:00Z" }],
      notArrived: [{ id: "n1", title: "Entretien", client_name: "SEA", start_time: "08:00:00", staff_name: "Esma Nouali" }],
      claims: [{ id: "r1", severity: "haute", description: "Vitres sales", client_name: "SEA" }],
      anomalies: [{ id: "a1", severity: "normale", description: "Clé manquante", client_name: "SARB" }],
      requests: [{ id: "q1", name: "Syndic X", received_at: "2026-11-05T09:00:00Z" }, { id: "q2", name: "Jean", received_at: "2026-11-07T08:00:00Z" }],
      prospects: [{ id: "p1", name: "Prospect Y" }],
      quotesAccepted: [{ id: "d1", number: "D-1", total_ht: 1500, client_name: "A", reserved: false, invoice_id: null, invoice_status: null }, { id: "d2", number: "D-2", total_ht: 200, client_name: "B", reserved: false, invoice_id: "f", invoice_status: "paye" }],
      quotesSent: [{ id: "d3", number: "D-3", client_name: "C", sent_at: "2026-10-20T09:00:00Z" }],
      invoices: [
        { id: "f1", number: null, status: "brouillon", due_date: null, total_ht: 300, total_ttc: 360, client_name: "A", reserved: false, billing_month: null, sent_at: null },
        { id: "f2", number: "F-2", status: "en_retard", due_date: "2026-10-01", total_ht: 100, total_ttc: 120, client_name: "B", reserved: false, billing_month: null, sent_at: "2026-09-16T00:00:00Z" },
        { id: "f3", number: "F-3", status: "envoye", due_date: "2026-11-30", total_ht: 100, total_ttc: 120, client_name: "C", reserved: false, billing_month: "2026-10", sent_at: null }
      ],
      payments: [{ id: "pay1", amount: 50, counterparty: "Dupont", label: "Virement" }],
      missionsToCheck: [{ id: "c1", title: "t", client_name: "A", scheduled_date: "2026-11-01" }],
      missionsToConfirm: [{ id: "c2", title: "t", client_name: "A", scheduled_date: "2026-11-02" }],
      missionsUnbilled: [{ id: "c3", title: "t", client_name: "A", scheduled_date: "2026-09-02" }]
    }));
    expect(new Set(codes(a))).toEqual(new Set(["mail_fail", "not_arrived", "claim", "issue_anomaly", "request_late", "request_new", "prospect_to_contact", "quote_accepted", "quote_noanswer", "invoice_draft", "invoice_late", "invoice_unsent", "payment_unmatched", "mission_to_check", "mission_to_confirm", "mission_unbilled"]));
    expect(a.filter((x) => x.code === "quote_accepted")).toHaveLength(1); // le devis déjà facturé n'est pas une alerte
  });
});

describe("règles d'affectation dans les alertes (organisation du dirigeant)", () => {
  it("la photo réelle : les passages à confirmer sont regroupés par contrat, en information, sans fausse anomalie", () => {
    const rows = [
      up({ id: "a", scheduled_date: "2026-11-08", assignee: "Kevinh", contract_id: null, title: "Nettoyage Airbnb", client_name: "Geetha", contract_label: null }),
      up({ id: "b", scheduled_date: "2026-11-10", client_name: "SARB", contract_id: "k2", contract_label: "Entretien SARB OPTIQUE" }),
      up({ id: "c", scheduled_date: "2026-11-11" }), up({ id: "d", scheduled_date: "2026-11-14" }),
      up({ id: "e", scheduled_date: "2026-11-11", contract_id: "k3", contract_label: "Entretien IDF Recyclage", client_name: "IDF" })
    ];
    const a = superviseAlerts(base({ upcoming: rows }));
    expect(codes(a)).toEqual(["mission_assign_confirm", "mission_assign_confirm"]);
    expect(a.every((x) => x.severity === "info" && x.agent === "operations")).toBe(true);
    expect(a.find((x) => x.entity_id === "k1")).toMatchObject({ count: 2, title: expect.stringContaining("Entretien SEA (2 passages") });
    expect(a.some((x) => x.code === "mission_unassigned")).toBe(false);
  });
  it("une prestation Airbnb après le 11/11 est attribuée à Esma par règle : aucune alerte", () => {
    expect(superviseAlerts(base({ upcoming: [up({ id: "q", scheduled_date: "2026-11-12", title: "Nettoyage Airbnb", contract_id: null, contract_label: null })] }))).toEqual([]);
  });
});

describe("garanties : pas de doublon, pas de fausse anomalie, lecture seule", () => {
  const dup = base({ invoices: [{ id: "f", number: "F-1", status: "en_retard", due_date: "2026-10-01", total_ht: 1, total_ttc: 1, client_name: "A", reserved: false, billing_month: null, sent_at: null }, { id: "f", number: "F-1", status: "en_retard", due_date: "2026-10-01", total_ht: 1, total_ttc: 1, client_name: "A", reserved: false, billing_month: null, sent_at: null }] });
  it("la même situation n'est jamais comptée deux fois dans le tableau de bord", () => {
    const live = superviseAlerts(dup);
    expect(summarizeAlerts(live, null).open).toBe(1);
  });
  it("la clé d'une facture en retard et d'un contrat incomplet est celle de l'agent Finance : un seul suivi", () => {
    const [a] = superviseAlerts(dup);
    expect(a.dedupe_key).toBe("late:f");
    expect(FAMILY.contract_incomplete.agent).toBe("finance");
  });
  it("toute alerte a un agent connu, une raison, une action proposée et un lien direct", () => {
    const all = superviseAlerts(base({ clientsNoEmail: [{ id: "c", name: "A" }], missionsToValidate: [{ id: "m", title: "t", client_name: "A", scheduled_date: "2026-11-01" }], invoices: dup.invoices }));
    for (const a of all) { expect(a.agent).toBeTruthy(); expect(a.reason.length).toBeGreaterThan(5); expect(a.proposal.length).toBeGreaterThan(5); expect(a.href).toMatch(/^\//); }
  });
  it("le module est en lecture seule : aucune écriture ni appel de fonction", () => {
    const src = readFileSync(path.join(__dirname, "../src/lib/jarvis/alerts.ts"), "utf8");
    expect(src).not.toMatch(/\.(insert|update|upsert|delete|rpc)\(|supabase|createAdmin/);
  });
});

describe("tableau de bord global", () => {
  const live = superviseAlerts(base({
    claims: [{ id: "r1", severity: "haute", description: "x", client_name: "A" }],
    clientsNoEmail: [{ id: "c1", name: "A" }, { id: "c2", name: "B" }],
    missionsToValidate: [{ id: "m1", title: "t", client_name: "A", scheduled_date: "2026-11-01" }]
  }));
  it("sans suivi installé : ouvertes et prioritaires connues, « en cours » et « résolues » signalées comme non disponibles", () => {
    const s = summarizeAlerts(live, null);
    expect(s).toMatchObject({ open: 4, priority: 1, inProgress: 0, resolved: 0, tracking: false });
    expect(s.byAgent.relation).toMatchObject({ open: 1, priority: 1 });
    expect(s.byAgent.commercial.open).toBe(2);
    expect(s.byAgent.finance.open).toBe(1);
  });
  it("avec le suivi : en cours (acknowledged) et résolues viennent des lignes enregistrées", () => {
    const tracked = new Map<string, Tracked>([
      ["relation:claim:r1", { status: "acknowledged", first_seen_at: "2026-11-06T00:00:00Z", resolved_at: null, resolved_reason: null }],
      ["finance:validate:old", { status: "resolved", first_seen_at: "2026-11-01T00:00:00Z", resolved_at: "2026-11-05T00:00:00Z", resolved_reason: "Plus constaté" }]
    ]);
    const s = summarizeAlerts(live, tracked);
    expect(s).toMatchObject({ open: 3, inProgress: 1, resolved: 1, priority: 1, tracking: true });
    expect(s.byAgent.finance.resolved).toBe(1);
    expect(s.open + s.inProgress).toBe(live.length);
  });
});
