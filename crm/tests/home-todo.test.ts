import { describe, it, expect } from "vitest";
import { buildHomeTodo } from "@/lib/domain/home-todo";
import { formalNoticeEligibility } from "@/lib/domain/reminders";
import { buildFormalNotice } from "@/lib/domain/formal-notice";
import { formatClientContext } from "@/lib/domain/client-context";

const now = new Date("2026-11-27T10:00:00Z");
const base = { mails: [], quotes: [], drafts: [], open: [], now };

describe("accueil — À faire maintenant", () => {
  it("une ligne courte par événement, lien vers la fiche client pour un mail", () => {
    const r = buildHomeTodo({ ...base, mails: [{ id: "m1", client_id: "c1", client_name: "Ahmed El Youssfi" }] });
    expect(r.lines).toEqual([{ key: "mail_c1", tone: "red", label: "Ahmed El Youssfi vous a envoyé un mail", href: "/clients/c1?onglet=historique" }]);
  });
  it("plusieurs mails du même client = une seule ligne", () => {
    const r = buildHomeTodo({ ...base, mails: [{ id: "a", client_id: "c1", client_name: "SWYFO" }, { id: "b", client_id: "c1", client_name: "SWYFO" }] });
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].label).toBe("SWYFO vous a envoyé 2 mails");
  });
  it("devis sans réponse : seulement au-delà de 5 jours", () => {
    const q = (id: string, sent: string) => ({ id, number: `DEV-${id}`, client_name: "Tawer", sent_at: sent });
    const r = buildHomeTodo({ ...base, quotes: [q("1", "2026-11-22T10:00:00Z"), q("2", "2026-11-21T10:00:00Z")] });
    expect(r.lines.map((l) => l.key)).toEqual(["quote_2"]); // 6 jours oui, 5 jours non
    expect(r.lines[0].label).toBe("Devis DEV-2 (Tawer) sans réponse depuis 6 jours");
  });
  it("facture en retard : calculée sur l'échéance réelle — une échéance repoussée n'est pas affichée", () => {
    const r = buildHomeTodo({ ...base, open: [
      { id: "f1", number: "F-2026-003", client_name: "SWYFO", due_date: "2026-12-20" },
      { id: "f2", number: "F-2026-009", client_name: "SARB", due_date: "2026-11-12" }
    ] });
    expect(r.lines.map((l) => l.key)).toEqual(["late_f2"]);
    expect(r.lines[0].label).toBe("F-2026-009 (SARB) en retard de 15 jours");
  });
  it("brouillons à valider, et plafond de lignes avec le reste signalé", () => {
    const drafts = Array.from({ length: 15 }, (_, k) => ({ id: `d${k}`, client_name: "X", total_ht: 100 }));
    const r = buildHomeTodo({ ...base, drafts });
    expect(r.lines).toHaveLength(12);
    expect(r.hidden).toBe(3);
  });
  it("rien à faire = liste vide", () => {
    expect(buildHomeTodo(base)).toEqual({ lines: [], hidden: 0 });
  });
});

describe("mise en demeure — visible seulement après toutes les relances", () => {
  const s = { reminder_interval_days: 7, reminder_max_count: 2 };
  const inv = (o: any = {}) => ({ status: "en_retard", due_date: "2026-10-01", reminder_count: 2, last_reminder_at: "2026-11-10T10:00:00Z", ...o });
  it("éligible : relances épuisées et délai écoulé", () => expect(formalNoticeEligibility(inv(), s, now).eligible).toBe(true));
  it("jamais avant la dernière relance", () => {
    expect(formalNoticeEligibility(inv({ reminder_count: 1 }), s, now).eligible).toBe(false);
    expect(formalNoticeEligibility(inv({ reminder_count: 0, last_reminder_at: null }), s, now).eligible).toBe(false);
  });
  it("pas avant la fin du délai qui suit la dernière relance", () => {
    expect(formalNoticeEligibility(inv({ last_reminder_at: "2026-11-24T10:00:00Z" }), s, now).eligible).toBe(false);
  });
  it("pas si la facture n'est pas en retard ou si l'échéance est repoussée", () => {
    expect(formalNoticeEligibility(inv({ status: "envoye" }), s, now).eligible).toBe(false);
    expect(formalNoticeEligibility(inv({ due_date: "2026-12-20" }), s, now).eligible).toBe(false);
  });
});

describe("courrier de mise en demeure", () => {
  const input = { company: { name: "ProClean Empire", legalForm: "SASU", address: "Pontoise", siret: "123" }, today: "27/11/2026",
    invoices: [{ number: "F-1", issueDate: "01/09/2026", dueDate: "16/09/2026", remainingTtc: 100 }, { number: "F-2", issueDate: "01/10/2026", dueDate: "16/10/2026", remainingTtc: 50.5 }] };
  it("total exact, délai, signature de service — jamais le nom du patron", () => {
    const n = buildFormalNotice({ ...input, client: { name: "SARB", kind: "entreprise" } });
    expect(n.subject).toBe("Mise en demeure de payer — factures F-1, F-2");
    expect(n.body).toContain("150,50");
    expect(n.body).toContain("8 jours");
    expect(n.body).toContain("Service Facturation & Recouvrement");
    expect(n.body).not.toContain("Kevinh");
    expect(n.body).toContain("40 €");
  });
  it("l'indemnité de 40 € ne s'applique pas à un particulier", () => {
    const n = buildFormalNotice({ ...input, client: { name: "Mme X", kind: "particulier" } });
    expect(n.body).not.toContain("40 €");
  });
});

describe("contexte client donné à l'IA", () => {
  it("contient les faits utiles et signale un contact réservé", () => {
    const t = formatClientContext({ client: { name: "Ahmed", kind: "particulier", status: "actif", email: "a@b.fr", phone: null, address: null, notes: "9 % de commission", is_reserved: true },
      invoices: [{ number: "F-1", status: "en_retard", subject: null, total_ttc: 656.05, paid_amount: 0, due_date: "2026-11-01", reminder_count: 2 }], quotes: [], contracts: [],
      mails: [{ direction: "recu", kind: "mail", subject: "Facture", body: "Bonjour,\n  quand ?", occurred_at: "2026-11-26T10:00:00Z" }], interactions: [] });
    expect(t).toContain("CONTACT RÉSERVÉ");
    expect(t).toContain("F-1 (en_retard)");
    expect(t).toContain("REÇU « Facture » : Bonjour, quand ?");
  });
});
