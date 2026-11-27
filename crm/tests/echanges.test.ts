import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { buildTodoLines, shortName, TODO_MAX_LINES, type TodoInput } from "@/lib/todo";
import { formalNoticeEligibility } from "@/lib/domain/reminders";
import { buildExchangeTimeline } from "@/lib/domain/exchanges";
import { buildContext, generateReply, parseDraft } from "@/lib/ai-reply";
import { formalNoticeEmail } from "@/lib/mail-templates";

const NOW = new Date("2026-11-27T10:00:00Z");
const S = { reminder_max_count: 3, reminder_interval_days: 14, quote_followup_days: 5 };
const base = (o: Partial<TodoInput> = {}): TodoInput => ({ mails: [], quotes: [], drafts: [], late: [], settings: S, now: NOW, ...o });

describe("accueil : À faire maintenant", () => {
  it("une ligne courte par mail, avec le prénom d'un particulier et le nom d'une entreprise", () => {
    const r = buildTodoLines(base({ mails: [
      { id: "1", client_id: "c1", from_email: "a@x.fr", client_name: "Ahmed El Youssfi", client_kind: "particulier", draftReady: false },
      { id: "2", client_id: "c2", from_email: "s@x.fr", client_name: "SEA", client_kind: "entreprise", draftReady: true }
    ] }));
    expect(r.lines.map((l) => l.text)).toEqual(["Ahmed vous a envoyé un mail", "SEA vous a envoyé un mail — réponse prête à valider"]);
    expect(r.lines[0].href).toBe("/clients/c1?onglet=echanges");
  });
  it("regroupe plusieurs mails d'un même client et signale l'expéditeur sans fiche", () => {
    const m = (id: string) => ({ id, client_id: "c1", from_email: "a@x.fr", client_name: "Ahmed El Youssfi", client_kind: "particulier", draftReady: false });
    const r = buildTodoLines(base({ mails: [m("1"), m("2"), { id: "3", client_id: null, from_email: "inconnu@x.fr", client_name: null, client_kind: null, draftReady: false }] }));
    expect(r.lines.map((l) => l.text)).toEqual(["Ahmed vous a envoyé un mail (2 mails)", "inconnu@x.fr vous a écrit (aucune fiche client)"]);
  });
  it("devis sans réponse : seulement au-delà de 5 jours", () => {
    const q = (id: string, sent: string) => ({ id, number: `DEV-${id}`, sent_at: sent, client_name: "Tawer", is_reserved: false });
    const r = buildTodoLines(base({ quotes: [q("1", "2026-11-22T10:00:00Z"), q("2", "2026-11-26T10:00:00Z"), q("3", "2026-11-10T10:00:00Z")] }));
    expect(r.lines.map((l) => l.text)).toEqual(["Devis DEV-3 (Tawer) sans réponse depuis 17 j"]);
  });
  it("factures brouillon et en retard, avec 🔒 pour un contact réservé", () => {
    const r = buildTodoLines(base({
      drafts: [{ id: "d1", total_ht: 450, client_name: "Easy Stay", is_reserved: false }],
      late: [{ id: "f1", number: "F2610-000056", due_date: "2026-11-23", reminder_count: 0, last_reminder_at: null, status: "en_retard", client_name: "El Youssfi", is_reserved: true }]
    }));
    expect(r.lines.map((l) => l.text.replace(/[\u00a0\u202f]/g, " "))).toEqual(["🔒 Facture F2610-000056 (El Youssfi) en retard de 3 j", "Facture brouillon de Easy Stay (450,00 € HT) à valider"]);
  });
  it("coupe la liste et compte le reste", () => {
    const late = Array.from({ length: 20 }, (_, i) => ({ id: `f${i}`, number: `F${i}`, due_date: "2026-11-01", reminder_count: 0, last_reminder_at: null, status: "en_retard", client_name: "X", is_reserved: false }));
    const r = buildTodoLines(base({ late }));
    expect(r.lines).toHaveLength(TODO_MAX_LINES);
    expect(r.hidden).toBe(20 - TODO_MAX_LINES);
  });
  it("rien à faire = liste vide", () => expect(buildTodoLines(base())).toEqual({ lines: [], hidden: 0 }));
  it("shortName", () => { expect(shortName("Jean Dupont", "particulier")).toBe("Jean"); expect(shortName("Conciergair SAS", "entreprise")).toBe("Conciergair SAS"); });
});

describe("mise en demeure : le bouton n'apparaît qu'après toutes les relances", () => {
  const inv = (o: any = {}) => ({ status: "en_retard", due_date: "2026-09-01", reminder_count: 3, last_reminder_at: "2026-10-01T10:00:00Z", ...o });
  it("éligible : 3 relances sur 3, dernier délai écoulé, toujours impayée", () => expect(formalNoticeEligibility(inv(), S, NOW).eligible).toBe(true));
  it("refusée tant que des relances restent à faire", () => expect(formalNoticeEligibility(inv({ reminder_count: 2 }), S, NOW)).toEqual({ eligible: false, reason: "relances en cours (2/3)" }));
  it("refusée si la dernière relance est trop récente", () => expect(formalNoticeEligibility(inv({ last_reminder_at: "2026-11-20T10:00:00Z" }), S, NOW).eligible).toBe(false));
  it("refusée si payée, annulée ou pas encore échue", () => {
    expect(formalNoticeEligibility(inv({ status: "payee" }), S, NOW).eligible).toBe(false);
    expect(formalNoticeEligibility(inv({ status: "annule" }), S, NOW).eligible).toBe(false);
    expect(formalNoticeEligibility(inv({ due_date: "2026-12-10" }), S, NOW).eligible).toBe(false);
  });
  it("le courrier n'invoque l'indemnité de 40 € que pour un professionnel", () => {
    const a = { company: "ProClean Empire", clientName: "X", invoiceNumber: "F-1", totalTtc: "100 €", remaining: "100 €", dueDate: "01/09/2026", daysLate: 87, reminders: { count: 3, lastDate: "01/10/2026" }, deadline: "05/12/2026" };
    expect(formalNoticeEmail({ ...a, professional: true }).text).toMatch(/40 €/);
    expect(formalNoticeEmail({ ...a, professional: false }).text).not.toMatch(/40 €/);
    expect(formalNoticeEmail({ ...a, professional: false }).text).toMatch(/au plus tard le 05\/12\/2026/);
  });
});

describe("fil des échanges", () => {
  it("fusionne mails, relances et e-mails du CRM sans doublon de relance, du plus récent au plus ancien", () => {
    const t = buildExchangeTimeline({
      messages: [{ id: "m1", direction: "entrant", kind: "mail", status: "recu", subject: "Question", body: "Bonjour", created_at: "2026-11-25T09:00:00Z", received_at: "2026-11-25T08:59:00Z", sent_at: null }],
      reminders: [{ id: "r1", invoice_id: "i1", sent_at: "2026-11-20T10:00:00Z", level: 1, channel: "email", origin: "manuel", note: null, invoice_number: "F-1" }],
      emails: [
        { id: "e1", sent_at: "2026-11-20T10:00:20Z", kind: "relance_facture", subject: "Relance — facture F-1", ok: true, error: null, entity: "invoice", entity_id: "i1" },
        { id: "e2", sent_at: "2026-11-10T10:00:00Z", kind: "devis", subject: "Devis DEV-1", ok: false, error: "refusé", entity: "quote", entity_id: "q1" }
      ]
    });
    expect(t.map((x) => [x.id, x.kind])).toEqual([["m_m1", "recu"], ["r_r1", "relance"], ["e_e2", "envoye"]]);
    expect(t[2].body).toMatch(/Non envoyé : refusé/);
  });
});

describe("réponse préparée par l'IA", () => {
  it("le contexte contient tout ce que l'on sait du client et le mail à traiter", () => {
    const c = buildContext({
      client: { name: "Ahmed El Youssfi", kind: "particulier", email: "a@x.fr", phone: null, notes: "Préfère le matin", is_reserved: true, pipeline: null },
      contracts: [{ label: "Ménage Airbnb", status: "actif", monthly_amount_ht: null, per_visit_amount_ht: 45, start_date: null, end_date: "2026-12-01" }],
      quotes: [], invoices: [{ number: "F-1", status: "en_retard", total_ttc: 255, paid_amount: 0, due_date: "2026-11-23", reminder_count: 1 }],
      interactions: [{ kind: "appel", summary: "Appelé pour jeudi", occurred_at: "2026-11-20T10:00:00Z" }], messages: [],
      replyTo: { subject: "Passage de jeudi", body: "Pouvez-vous décaler ?", at: "2026-11-26T10:00:00Z" }
    });
    for (const s of ["Ahmed El Youssfi", "Préfère le matin", "Ménage Airbnb", "F-1", "Appelé pour jeudi", "Pouvez-vous décaler ?"]) expect(c).toContain(s);
  });
  it("lit la réponse JSON du modèle et refuse un texte vide ou illisible", () => {
    expect(parseDraft('Voici : {"subject":"Re : x","body":"Bonjour","a_verifier":["créneau"]}')).toEqual({ subject: "Re : x", body: "Bonjour", aVerifier: ["créneau"] });
    expect(() => parseDraft("pas de json")).toThrow(/illisible/);
    expect(() => parseDraft('{"subject":"a","body":"  "}')).toThrow(/aucun texte/);
  });
  it("sans clé API : aucune réponse inventée", async () => {
    const old = process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_API_KEY;
    const r = await generateReply("x");
    process.env.ANTHROPIC_API_KEY = old; if (old === undefined) delete process.env.ANTHROPIC_API_KEY;
    expect(r).toEqual({ ok: false, reason: expect.stringMatching(/ANTHROPIC_API_KEY/) });
  });
  it("avec clé : appelle l'API et renvoie le brouillon", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key-fictive";
    let sent: any;
    const fake = (async (_u: string, init: any) => { sent = JSON.parse(init.body); return new Response(JSON.stringify({ content: [{ type: "text", text: '{"subject":"Re : a","body":"Bonjour Ahmed","a_verifier":[]}' }] }), { status: 200 }); }) as unknown as typeof fetch;
    const r = await generateReply("CLIENT : X", fake);
    delete process.env.ANTHROPIC_API_KEY;
    expect(r).toEqual({ ok: true, draft: { subject: "Re : a", body: "Bonjour Ahmed", aVerifier: [] } });
    expect(sent.messages[0].content).toBe("CLIENT : X");
  });
});

// ── Base : migration 0020 + totaux de devis ──
const read = (p: string) => readFileSync(path.join(__dirname, "..", p), "utf8");
describe("base de données", () => {
  let db: PGlite; let secret: string;
  const q = async (sql: string, params: any[] = []) => (await db.query<any>(sql, params)).rows;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;`);
    await db.exec(read("supabase/migrations/0001_schema.sql"));
    await db.exec(read("supabase/seed.sql"));
    for (const f of readdirSync(path.join(__dirname, "..", "supabase/migrations")).filter((n) => n.endsWith(".sql")).sort().slice(1)) await db.exec(read(`supabase/migrations/${f}`));
    secret = (await q("select automation_secret s from app_settings"))[0].s;
  });
  it("mail reçu : rattaché à la fiche par e-mail, rejouable, et refusé sans le secret", async () => {
    const [c] = await q("insert into clients(name, email) values ('Ahmed Test','ahmed.test@x.fr') returning id");
    const [a] = await q("select automation_log_inbound_email($1, $2::jsonb) r", [secret, JSON.stringify({ from_email: "Ahmed.Test@X.fr", subject: "Bonjour", body: "Un message", external_id: "m-1" })]);
    expect(a.r).toMatchObject({ client_id: c.id, matched: true, duplicate: false });
    const [b] = await q("select automation_log_inbound_email($1, $2::jsonb) r", [secret, JSON.stringify({ from_email: "ahmed.test@x.fr", body: "Un message", external_id: "m-1" })]);
    expect(b.r).toMatchObject({ duplicate: true });
    expect((await q("select count(*)::int n from client_messages where client_id=$1", [c.id]))[0].n).toBe(1);
    expect((await q("select count(*)::int n from interactions where client_id=$1 and kind='email'", [c.id]))[0].n).toBe(1);
    await expect(db.query("select automation_log_inbound_email('mauvais', '{}'::jsonb)")).rejects.toThrow(/ACCES_REFUSE/);
  });
  it("expéditeur inconnu : conservé sans fiche, visible sur l'accueil", async () => {
    const [a] = await q("select automation_log_inbound_email($1, $2::jsonb) r", [secret, JSON.stringify({ from_email: "inconnu@y.fr", body: "Bonjour" })]);
    expect(a.r).toMatchObject({ matched: false });
    expect((await q("select count(*)::int n from client_messages where client_id is null and status='recu'"))[0].n).toBe(1);
  });
  it("un mail reçu ne peut pas être un brouillon IA ; un message « envoyé » exige une date", async () => {
    const [c] = await q("insert into clients(name) values ('Z') returning id");
    await expect(db.query("insert into client_messages(client_id,direction,kind,status,body) values ($1,'entrant','reponse_ia','recu','x')", [c.id])).rejects.toThrow();
    await expect(db.query("insert into client_messages(client_id,direction,kind,status,body) values ($1,'sortant','mail','envoye','x')", [c.id])).rejects.toThrow();
  });
  it("totaux de devis : suivent l'ajout, la modification, la suppression et le remplacement des lignes (insérer avant retirer)", async () => {
    const [c] = await q("insert into clients(name) values ('Totaux') returning id");
    const [dv] = await q("insert into quotes(client_id) values ($1) returning id", [c.id]);
    const tot = async () => (await q("select total_ht::float h, total_vat::float v, total_ttc::float t from quotes where id=$1", [dv.id]))[0];
    await q("insert into quote_lines(quote_id,description,quantity,unit_price_ht,vat_rate) values ($1,'A',2,1200.5,20)", [dv.id]);
    expect(await tot()).toEqual({ h: 2401, v: 480.2, t: 2881.2 });
    const old = (await q("select id from quote_lines where quote_id=$1", [dv.id])).map((r: any) => r.id);
    await q("insert into quote_lines(quote_id,description,quantity,unit_price_ht,vat_rate) values ($1,'B',3,33.33,20)", [dv.id]);
    await q("delete from quote_lines where id = any($1::uuid[])", [old]);
    expect(await tot()).toEqual({ h: 99.99, v: 20, t: 119.99 });
    await q("update quote_lines set quantity = 1 where quote_id=$1", [dv.id]);
    expect(await tot()).toEqual({ h: 33.33, v: 6.67, t: 40 });
    await q("delete from quote_lines where quote_id=$1", [dv.id]);
    expect(await tot()).toEqual({ h: 0, v: 0, t: 0 });
  });
});
