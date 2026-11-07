import { describe, it, expect } from "vitest";
import { analyseFinance, diffDays, type FinanceContract, type FinanceInvoice, type FinanceSnapshot } from "@/lib/jarvis/agents/finance";

const TODAY = "2026-11-10";
const inv = (o: Partial<FinanceInvoice> & { id: string }): FinanceInvoice => ({
  number: `F-${o.id}`, client_id: "c1", client_name: "Client Un", client_reserved: false, status: "envoye",
  issue_date: "2026-10-01", due_date: "2026-10-16", total_ttc: 240, paid_amount: 0, paid_at: null, sent_at: "2026-10-01T09:00:00Z", reminder_count: 0, created_at: "2026-10-01T08:00:00Z", ...o
});
const ctr = (o: Partial<FinanceContract> & { id: string }): FinanceContract => ({
  client_id: "c1", client_name: "Client Un", label: "Entretien", status: "actif", billing_mode: "mensuel", monthly_amount_ht: 500, per_visit_amount_ht: null, terms: null,
  weekdays: [1, 3], visits_per_week: 2, hours_per_visit: 2, site_address: "1 rue A", assignee: "Esma", start_date: "2026-09-01", ...o
});
const snap = (o: Partial<FinanceSnapshot> = {}): FinanceSnapshot => ({
  today: TODAY, settings: { payment_terms_days: 15, reminder_max_count: 3, reminder_manual_days: 30, quote_terms: "Règlement à 15 jours." },
  invoices: [], contracts: [], paymentsCount: 5, ...o
});
const keys = (r: ReturnType<typeof analyseFinance>) => r.alerts.map((a) => a.dedupe_key);

describe("agent Finance — factures en retard", () => {
  it("compte les jours de retard et distingue attention / urgent", () => {
    const r = analyseFinance(snap({ invoices: [inv({ id: "a", due_date: "2026-11-05" }), inv({ id: "b", due_date: "2026-10-20" })] }));
    expect(r.alerts.find((a) => a.dedupe_key === "late:a")).toMatchObject({ severity: "attention" });
    expect(r.alerts.find((a) => a.dedupe_key === "late:a")!.title).toContain("en retard de 5 j");
    expect(r.alerts.find((a) => a.dedupe_key === "late:b")).toMatchObject({ severity: "urgent" });
  });
  it("une facture non échue ou payée ne déclenche rien", () => {
    const r = analyseFinance(snap({ invoices: [inv({ id: "a", due_date: "2026-11-20", issue_date: "2026-11-05" }), inv({ id: "b", status: "paye", paid_amount: 240, paid_at: "2026-10-10" })] }));
    expect(keys(r).filter((k) => k.startsWith("late:"))).toEqual([]);
  });
  it("propose un message (L2) seulement après toutes les relances ET 7 jours de retard", () => {
    const peu = analyseFinance(snap({ invoices: [inv({ id: "a", due_date: "2026-11-01", reminder_count: 2 })] }));
    expect(peu.actions).toEqual([]);
    const assez = analyseFinance(snap({ invoices: [inv({ id: "a", due_date: "2026-11-01", reminder_count: 3 })] }));
    expect(assez.actions.map((a) => a.kind)).toEqual(["contact_client"]);
    expect((assez.actions[0].payload as any).brouillon).toContain("F-a");
  });
  it("propose une mise en demeure (L3) seulement au-delà du délai manuel", () => {
    const r = analyseFinance(snap({ invoices: [inv({ id: "a", due_date: "2026-10-05", reminder_count: 3 })] }));
    expect(r.actions.map((a) => a.kind).sort()).toEqual(["contact_client", "legal_notice"]);
  });
  it("contact réservé : alerte oui, aucune proposition ni action", () => {
    const r = analyseFinance(snap({ invoices: [inv({ id: "a", due_date: "2026-10-01", reminder_count: 3, client_reserved: true })] }));
    expect(keys(r)).toContain("late:a");
    expect(r.alerts.find((a) => a.dedupe_key === "late:a")!.detail).toContain("Contact réservé");
    expect(r.actions).toEqual([]);
  });
  it("le montant affiché est le reste à payer, pas le total", () => {
    const r = analyseFinance(snap({ invoices: [inv({ id: "a", due_date: "2026-11-05", total_ttc: 300, paid_amount: 100 })] }));
    expect(r.alerts[0].title.replace(/\s/g, " ")).toContain("200,00");
  });
});

describe("agent Finance — délais, annulations, contrats, brouillons, cohérence", () => {
  it("regroupe les échéances au-delà de 15 jours en UNE alerte, sans toucher les factures", () => {
    const r = analyseFinance(snap({ invoices: [
      inv({ id: "a", issue_date: "2026-10-29", due_date: "2026-12-13" }), inv({ id: "b", issue_date: "2026-10-31", due_date: "2026-11-30" }),
      inv({ id: "c", issue_date: "2026-11-06", due_date: "2026-11-21" }), inv({ id: "d", status: "paye", paid_at: "2026-11-02", issue_date: "2026-09-01", due_date: "2026-10-30", paid_amount: 240 })] }));
    const a = r.alerts.filter((x) => x.dedupe_key.startsWith("terms"));
    expect(a).toHaveLength(1);
    expect(a[0].title).toContain("2 facture(s) ouverte(s)");
    expect(a[0].detail).toContain("45 j");
    expect(a[0].severity).toBe("info");
    expect(r.actions).toEqual([]);
  });
  it("signale un règlement antérieur à l'émission et une facture « envoyée » sans trace d'envoi", () => {
    const r = analyseFinance(snap({ invoices: [
      inv({ id: "p", status: "paye", paid_amount: 240, issue_date: "2026-10-29", due_date: "2026-11-13", paid_at: "2026-10-09" }),
      inv({ id: "n", sent_at: null, issue_date: "2026-11-05", due_date: "2026-11-20" }), inv({ id: "ok", issue_date: "2026-11-05", due_date: "2026-11-20" })] }));
    expect(r.alerts.find((a) => a.dedupe_key === "paid_before_issue")!.severity).toBe("attention");
    const t = r.alerts.find((a) => a.dedupe_key === "never_sent")!;
    expect(t.title).toContain("1 facture(s)");
  });
  it("facture annulée après envoi : alerte urgente, avoir proposé en L3, demande au Juridique", () => {
    const r = analyseFinance(snap({ invoices: [inv({ id: "x", status: "annule" })] }));
    expect(r.alerts.find((a) => a.dedupe_key === "cancelled:x")!.severity).toBe("urgent");
    expect(r.actions.map((a) => a.kind)).toEqual(["issue_credit_note"]);
    expect(r.events).toEqual([expect.objectContaining({ type: "invoice.cancelled_after_sent", target_agent: "juridique" })]);
  });
  it("une facture annulée AVANT envoi n'est pas une anomalie", () => {
    expect(analyseFinance(snap({ invoices: [inv({ id: "x", status: "annule", sent_at: null })] })).alerts).toEqual([]);
  });
  it("contrat actif incomplet : alerte, tâche et demande aux Opérations ; complet : rien", () => {
    const r = analyseFinance(snap({ contracts: [ctr({ id: "k1", billing_mode: "passage", per_visit_amount_ht: 60, weekdays: null, visits_per_week: 2 }), ctr({ id: "k2" }), ctr({ id: "k3", status: "resilie", weekdays: null, billing_mode: "passage" })] }));
    expect(keys(r)).toEqual(["contract:k1"]);
    expect(r.tasks).toHaveLength(1);
    expect(r.events).toEqual([expect.objectContaining({ type: "contract.incomplete", target_agent: "operations" })]);
  });
  it("contrat mensuel sans montant : bloquant", () => {
    const r = analyseFinance(snap({ contracts: [ctr({ id: "k", monthly_amount_ht: null })] }));
    expect(r.alerts[0].title).toContain("montant mensuel");
  });
  it("brouillon de plus de 7 jours : tâche, pas d'alerte", () => {
    const r = analyseFinance(snap({ invoices: [inv({ id: "d", status: "brouillon", number: null, created_at: "2026-10-20T10:00:00Z", sent_at: null }), inv({ id: "e", status: "brouillon", number: null, created_at: "2026-11-08T10:00:00Z", sent_at: null })] }));
    expect(r.tasks.map((t) => t.dedupe_key)).toEqual(["draft:d"]);
    expect(r.alerts).toEqual([]);
  });
  it("aucun paiement Qonto importé alors que des factures sont émises : alerte", () => {
    expect(keys(analyseFinance(snap({ paymentsCount: 0, invoices: [inv({ id: "a", due_date: "2026-11-30", issue_date: "2026-11-05" })] })))).toContain("qonto_empty");
    expect(keys(analyseFinance(snap({ paymentsCount: 0 })))).not.toContain("qonto_empty");
    expect(keys(analyseFinance(snap({ paymentsCount: 3, invoices: [inv({ id: "a", due_date: "2026-11-30", issue_date: "2026-11-05" })] })))).not.toContain("qonto_empty");
  });
  it("conditions des devis contradictoires avec le délai de paiement", () => {
    const r = analyseFinance(snap({ settings: { payment_terms_days: 15, reminder_max_count: 3, reminder_manual_days: 30, quote_terms: "Règlement à 30 jours par virement." } }));
    expect(keys(r)).toContain("quote_terms");
    expect(keys(analyseFinance(snap()))).not.toContain("quote_terms");
  });
});

describe("agent Finance — mémoire et briefing", () => {
  const paid = (id: string, due: string, paidAt: string) => inv({ id, status: "paye", issue_date: "2026-08-01", due_date: due, paid_at: paidAt, paid_amount: 240 });
  it("retard moyen de paiement : au moins 2 factures payées, sinon rien", () => {
    const un = analyseFinance(snap({ invoices: [paid("a", "2026-09-15", "2026-09-20")] }));
    expect(un.memory).toEqual([]);
    const deux = analyseFinance(snap({ invoices: [paid("a", "2026-09-15", "2026-09-20"), paid("b", "2026-10-15", "2026-10-13")] }));
    expect(deux.memory).toEqual([{ key: "client.delai_paiement_moyen_jours", subject_type: "client", subject_id: "c1", value: { moyenne: 1.5, n: 2, calcule_le: TODAY } }]);
  });
  it("dates de règlement saisies en bloc : aucune mémoire écrite, et on le dit", () => {
    const bloc = ["a", "b", "c", "d", "e", "f"].map((id, n) => inv({ id, client_id: n < 3 ? "c1" : "c2", status: "paye", paid_amount: 240, issue_date: "2026-08-28", due_date: "2026-09-12", paid_at: "2026-10-09" }));
    const r = analyseFinance(snap({ paymentsCount: 0, invoices: bloc }));
    expect(r.memory).toEqual([]);
    expect(keys(r)).toContain("memory_unreliable");
    // avec des virements rapprochés, les mêmes dates redeviennent exploitables
    expect(analyseFinance(snap({ paymentsCount: 6, invoices: bloc })).memory).toHaveLength(2);
  });
  it("un règlement antérieur à l'émission ne fausse pas le retard moyen", () => {
    const r = analyseFinance(snap({ invoices: [paid("a", "2026-09-15", "2026-09-20"), paid("b", "2026-10-15", "2026-10-13"), inv({ id: "z", status: "paye", paid_amount: 240, issue_date: "2026-10-29", due_date: "2026-11-13", paid_at: "2026-10-01" })] }));
    expect(r.memory[0].value).toMatchObject({ moyenne: 1.5, n: 2 });
  });
  it("briefing chiffré : facturé, encaissé, à encaisser, retard", () => {
    const r = analyseFinance(snap({ invoices: [
      inv({ id: "a", issue_date: "2026-11-02", due_date: "2026-11-17", total_ttc: 100 }),
      inv({ id: "b", issue_date: "2026-10-01", due_date: "2026-10-16", total_ttc: 200, paid_amount: 50 }),
      inv({ id: "c", status: "paye", issue_date: "2026-11-03", due_date: "2026-11-18", total_ttc: 400, paid_amount: 400, paid_at: "2026-11-05" }),
      inv({ id: "d", status: "brouillon", number: null, total_ttc: 999, issue_date: "2026-11-04" })
    ] }));
    expect(r.stats).toMatchObject({ facture_mois_ttc: 500, factures_mois: 2, encaisse_mois_ttc: 400, a_encaisser_ttc: 250, factures_ouvertes: 2, en_retard_ttc: 150, factures_en_retard: 1 });
    expect(r.summary).toContain("Briefing financier du 10/11/2026");
  });
  it("données vides : briefing sans erreur", () => {
    const r = analyseFinance(snap());
    expect(r.summary).toContain("Rien d'anormal détecté.");
    expect(r.alerts).toEqual([]);
  });
  it("déterministe et ordonné : mêmes données, même résultat, urgent avant le reste", () => {
    const s = snap({ invoices: [inv({ id: "a", due_date: "2026-11-05" }), inv({ id: "b", due_date: "2026-10-01" }), inv({ id: "c", status: "annule" })] });
    expect(analyseFinance(s)).toEqual(analyseFinance(s));
    const sev = analyseFinance(s).alerts.map((a) => a.severity);
    expect(sev).toEqual([...sev].sort((x, y) => ["urgent", "attention", "info"].indexOf(x) - ["urgent", "attention", "info"].indexOf(y)));
  });
  it("diffDays ignore l'heure et le fuseau", () => {
    expect(diffDays("2026-10-31", "2026-11-01")).toBe(1);
    expect(diffDays("2026-10-25", "2026-10-26T23:30:00Z")).toBe(1);
    expect(diffDays("2026-03-28", "2026-03-30")).toBe(2); // changement d'heure
  });
});
