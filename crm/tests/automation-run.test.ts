import { describe, it, expect } from "vitest";
import { runDaily, type Deps } from "@/lib/automation/run";

const settings = {
  company_name: "ProClean Empire", company_phone: "06", company_iban: "FR76", company_email: "contact@procleanempire.com", notify_email: "patron@x.fr",
  default_vat_rate: 20, large_amount_threshold_ht: 1500, auto_invoicing_enabled: true, auto_invoicing_start_month: "2026-11",
  count_planned_as_done: true, month_end_send_next_day: true, payment_terms_days: 30, auto_planning_enabled: true,
  company_address: null, company_siret: null, company_vat_number: null, company_legal_form: null, company_capital: null, company_rcs: null, company_footer: null, quote_terms: null
};
const client = (o: any = {}) => ({ id: "c1", name: "SEA", email: "sea@x.fr", is_reserved: false, auto_send_invoices: true, status: "actif", ...o });
const contract = (o: any = {}) => ({ id: "k1", client_id: "c1", label: "Entretien", billing_mode: "mensuel", monthly_amount_ht: 600, start_date: "2026-01-01", end_date: null, status: "actif", ...o });

function fake(overrides: { settings?: any; clients?: any[]; contracts?: any[]; interventions?: any[]; pending?: any[]; quotes?: any[]; mailOk?: boolean; mailConfigured?: boolean; validateFails?: boolean; due?: any[]; registerFails?: boolean; expired?: number; alerts?: any; drafts?: string[] } = {}) {
  const calls: { name: string; args: any }[] = [];
  const mails: any[] = [];
  const st = { ...settings, ...(overrides.settings ?? {}) };
  const deps: Deps = {
    secret: "S",
    now: new Date("2026-11-30T18:00:00Z"), // dernier jour de novembre, 19 h à Paris
    mailConfigured: () => overrides.mailConfigured ?? true,
    sendMail: async (m) => { mails.push({ ...m, to: Array.isArray(m.to) ? m.to.join(", ") : m.to }); return overrides.mailOk === false ? { sent: false, reason: "refusé" } : { sent: true }; },
    rpc: async (name, args) => {
      calls.push({ name, args });
      switch (name) {
        case "automation_month_data": return { data: { settings: st, clients: overrides.clients ?? [client()], contracts: overrides.contracts ?? [contract()], interventions: overrides.interventions ?? [], invoiced_clients: overrides.drafts ?? [], draft_clients: overrides.drafts ?? [] }, error: null };
        case "automation_create_invoice": return { data: "inv-" + calls.filter((c) => c.name === name).length, error: null };
        case "automation_validate_invoice": return overrides.validateFails ? { data: null, error: { message: "CONTACT_RESERVE: x" } } : { data: "F-2026-001", error: null };
        case "automation_pending_send": return { data: { settings: st, items: overrides.pending ?? [] }, error: null };
        case "automation_refresh_overdue": return { data: 0, error: null };
        case "automation_insert_interventions": return { data: (args.p_rows as any[]).length, error: null };
        case "automation_expire_quotes": return { data: overrides.expired ?? 0, error: null };
        case "automation_alerts": return { data: overrides.alerts ?? { unassigned_next7: 0, to_confirm: 0, requests_late: 0, overdue_15: 0 }, error: null };
        case "automation_due_reminders": return { data: { settings: { ...st, auto_reminders_enabled: true }, items: overrides.due ?? [] }, error: null };
        case "automation_register_reminder": return overrides.registerFails ? { data: null, error: { message: "RELANCE_DEJA_ENVOYEE" } } : { data: { id: "r1", level: 1 }, error: null };
        case "automation_quotes_to_follow": return { data: overrides.quotes ?? [], error: null };
        default: return { data: null, error: null };
      }
    }
  };
  return { deps, calls, mails, names: () => calls.map((c) => c.name) };
}
const pendingItem = () => ({
  invoice: { id: "i1", number: "F-2026-001", status: "envoye", issue_date: "2026-11-30", due_date: "2026-12-30", total_ht: 600, total_vat: 120, total_ttc: 720, paid_amount: 0, billing_month: "2026-11", subject: "Prestations de novembre 2026", notes: null },
  lines: [{ position: 0, description: "Entretien — novembre 2026", quantity: 1, unit_price_ht: 600, vat_rate: 20 }],
  client: { id: "c1", name: "SEA", email: "sea@x.fr", address: null, postal_code: null, city: null, siret: null }
});

describe("automatisation quotidienne", () => {
  it("le dernier jour du mois : crée et valide la facture, N'ENVOIE PAS encore (relecture), prévient le patron", async () => {
    const f = fake();
    const r = await runDaily(f.deps);
    expect(r.generated).toEqual([expect.objectContaining({ client: "SEA", number: "F-2026-001", status: "validee", totalHt: 600 })]);
    expect(f.names()).toContain("automation_create_invoice");
    expect(f.names()).toContain("automation_validate_invoice");
    expect(f.names()).not.toContain("automation_pending_send");
    expect(f.mails.map((m) => m.to)).toEqual(["patron@x.fr"]);
  });
  it("sans délai de relecture : envoie tout de suite et marque envoyée", async () => {
    const f = fake({ settings: { month_end_send_next_day: false }, pending: [pendingItem()] });
    const r = await runDaily(f.deps);
    expect(r.sent).toEqual([{ number: "F-2026-001", to: "sea@x.fr" }]);
    const m = f.mails.find((x) => x.to === "sea@x.fr");
    expect(m.attachment.filename).toBe("F-2026-001.pdf");
    expect(Buffer.from(m.attachment.bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect(f.calls.find((c) => c.name === "automation_mark_sent")?.args).toMatchObject({ p_invoice_id: "i1", p_to: "sea@x.fr" });
  });
  it("le lendemain (1er du mois) : envoie les factures validées", async () => {
    const f = fake({ pending: [pendingItem()] });
    f.deps.now = new Date("2026-12-01T18:00:00Z");
    const r = await runDaily(f.deps);
    expect(r.sent).toHaveLength(1);
    expect(f.names()).not.toContain("automation_create_invoice"); // pas de génération hors fin de mois
  });
  it("jour ordinaire : aucune génération", async () => {
    const f = fake();
    f.deps.now = new Date("2026-11-15T18:00:00Z");
    const r = await runDaily(f.deps);
    expect(r.generated).toEqual([]);
    expect(f.names()).not.toContain("automation_create_invoice");
  });
  it("réglage coupé : rien du tout", async () => {
    const f = fake({ settings: { auto_invoicing_enabled: false } });
    const r = await runDaily(f.deps);
    expect(r.enabled).toBe(false);
    expect(f.names()).not.toContain("automation_create_invoice");
    expect(f.names()).not.toContain("automation_pending_send");
  });
  it("contact réservé ou gros montant : brouillon laissé au patron, jamais validé", async () => {
    const f = fake({ clients: [client({ is_reserved: true }), client({ id: "c2", name: "Gros" })], contracts: [contract(), contract({ id: "k2", client_id: "c2", monthly_amount_ht: 2000 })] });
    const r = await runDaily(f.deps);
    expect(r.generated.map((g) => g.status)).toEqual(["brouillon", "brouillon"]);
    expect(f.names()).not.toContain("automation_validate_invoice");
    expect(f.mails[0].text).toMatch(/à relire et valider/);
  });
  it("si la base refuse la validation, la facture reste en brouillon et c'est signalé", async () => {
    const f = fake({ validateFails: true });
    const r = await runDaily(f.deps);
    expect(r.generated[0].status).toBe("brouillon");
    expect(r.generated[0].reasons.join()).toMatch(/validation refusée/);
  });
  it("e-mail en échec : la facture n'est PAS marquée envoyée (nouvel essai le lendemain)", async () => {
    const f = fake({ settings: { month_end_send_next_day: false }, pending: [pendingItem()], mailOk: false });
    const r = await runDaily(f.deps);
    expect(r.sent).toEqual([]);
    expect(r.failed[0].reason).toBe("refusé");
    expect(f.names()).not.toContain("automation_mark_sent");
  });
  it("clé e-mail absente : signalé, rien n'est marqué envoyé", async () => {
    const f = fake({ settings: { month_end_send_next_day: false }, pending: [pendingItem()], mailConfigured: false });
    const r = await runDaily(f.deps);
    expect(r.failed[0].reason).toMatch(/RESEND_API_KEY/);
    expect(f.mails).toEqual([]);
    expect(f.names()).not.toContain("automation_mark_sent");
  });
  it("mode simulation : calcule sans rien écrire ni envoyer", async () => {
    const f = fake();
    const r = await runDaily(f.deps, { dryRun: true });
    expect(r.generated).toHaveLength(1);
    expect(f.names()).toEqual(["automation_month_data"]);
    expect(f.mails).toEqual([]);
  });
  it("relance les devis sans réponse puis les marque", async () => {
    const f = fake({ quotes: [{ id: "q1", number: "DEV-120", total_ttc: 300, valid_until: "2026-12-10", email: "x@y.fr", level: 1 }] });
    f.deps.now = new Date("2026-11-15T18:00:00Z");
    const r = await runDaily(f.deps);
    expect(r.followups).toEqual([{ number: "DEV-120", to: "x@y.fr", level: 1 }]);
    expect(f.names()).toContain("automation_quote_followup_done");
  });

  describe("relances de factures impayées", () => {
    const due = (o: any = {}, c: any = {}) => ({ invoice: { id: "i9", number: "F-2026-009", status: "en_retard", due_date: "2026-10-01", total_ht: 100, total_ttc: 120, reminder_count: 0, last_reminder_at: null, ...o }, client: { name: "X", email: "x@y.fr", is_reserved: false, ...c } });
    const on = { auto_reminders_enabled: true, reminder_first_after_days: 7, reminder_interval_days: 14, reminder_max_count: 3 };
    it("relance une facture en retard puis le signale", async () => {
      const f = fake({ settings: on, due: [due()] });
      f.deps.now = new Date("2026-11-15T18:00:00Z");
      const r = await runDaily(f.deps);
      expect(r.reminders).toEqual([{ number: "F-2026-009", to: "x@y.fr", level: 1 }]);
    });
    it("jamais pour un contact réservé", async () => {
      const f = fake({ settings: on, due: [due({}, { is_reserved: true })] });
      f.deps.now = new Date("2026-11-15T18:00:00Z");
      const r = await runDaily(f.deps);
      expect(r.reminders).toEqual([]);
      expect(f.names()).not.toContain("automation_register_reminder");
    });
    it("si la base refuse (relance récente), aucun e-mail", async () => {
      const f = fake({ settings: on, due: [due()], registerFails: true });
      f.deps.now = new Date("2026-11-15T18:00:00Z");
      const r = await runDaily(f.deps);
      expect(r.reminders).toEqual([]);
      expect(f.mails.filter((m) => m.to === "x@y.fr")).toEqual([]);
    });
    it("e-mail en échec : la relance est annulée", async () => {
      const f = fake({ settings: on, due: [due()], mailOk: false });
      f.deps.now = new Date("2026-11-15T18:00:00Z");
      await runDaily(f.deps);
      expect(f.names()).toContain("automation_undo_reminder");
    });
  });

  describe("planning, expiration, alertes, journal", () => {
    it("génère le planning du mois et du suivant depuis les contrats avec jours de passage (rejouable)", async () => {
      const k = contract({ id: "k2", weekdays: [3], assignee: "Agent A", start_time: "08:00" });
      const f = fake({ contracts: [k] });
      f.deps.now = new Date("2026-11-15T18:00:00Z");
      const r = await runDaily(f.deps);
      const call = f.calls.filter((c) => c.name === "automation_insert_interventions");
      expect(call).toHaveLength(2); // novembre + décembre
      expect(call[0].args.p_rows[0]).toMatchObject({ source_key: "contract:k2:2026-11-04", assignee: "Agent A", billable: false });
      expect(r.planning.created).toBeGreaterThan(5);
    });
    it("signale les contrats actifs sans jours de passage (planning impossible)", async () => {
      const f = fake({ contracts: [contract({ label: "SARB" })] });
      f.deps.now = new Date("2026-11-15T18:00:00Z");
      const r = await runDaily(f.deps);
      expect(r.planning.incompleteContracts).toEqual(["SARB"]);
      expect(f.mails.find((m) => m.to === "patron@x.fr").text).toMatch(/sans jours de passage/);
    });
    it("planning automatique désactivable", async () => {
      const f = fake({ settings: { auto_planning_enabled: false }, contracts: [contract({ weekdays: [3] })] });
      await runDaily(f.deps);
      expect(f.names()).not.toContain("automation_insert_interventions");
    });
    it("compte les devis expirés et remonte les alertes d'exception dans le récapitulatif", async () => {
      const f = fake({ expired: 2, alerts: { unassigned_next7: 3, to_confirm: 1, requests_late: 1, overdue_15: 2 } });
      f.deps.now = new Date("2026-11-15T18:00:00Z");
      const r = await runDaily(f.deps);
      expect(r.expiredQuotes).toBe(2);
      const body = f.mails.find((m) => m.to === "patron@x.fr").text;
      expect(body).toMatch(/3 passage\(s\) des 7 prochains jours sans intervenant/);
      expect(body).toMatch(/demande\(s\) de devis sans traitement/);
    });
    it("journalise l'exécution et chaque e-mail, mais pas en simulation", async () => {
      const f = fake({ quotes: [{ id: "q1", number: "DEV-1", total_ttc: 10, valid_until: null, email: "x@y.fr", level: 2 }] });
      f.deps.now = new Date("2026-11-15T18:00:00Z");
      await runDaily(f.deps);
      expect(f.names()).toContain("automation_log_run");
      expect(f.calls.find((c) => c.name === "automation_log_email")?.args).toMatchObject({ p_kind: "relance_devis", p_to: "x@y.fr", p_ok: true });
      expect(f.mails[0].subject).toMatch(/Dernier rappel/); // relance de niveau 2
      const d = fake();
      await runDaily(d.deps, { dryRun: true });
      expect(d.names()).not.toContain("automation_log_run");
    });
  });

  it("un brouillon déjà préparé n'est ni dupliqué ni écrasé : il est signalé au patron", async () => {
    const f = fake({ drafts: ["c1"] });
    const r = await runDaily(f.deps);
    expect(r.generated).toEqual([]);
    expect(r.skippedDrafts).toEqual(["SEA"]);
    expect(f.names()).not.toContain("automation_create_invoice");
    expect(f.mails.find((m) => m.to === "patron@x.fr").text).toMatch(/déjà préparée en brouillon pour SEA/);
  });
});
