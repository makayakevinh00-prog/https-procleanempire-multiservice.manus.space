/**
 * Scénarios de bout en bout : vraie base (PGlite + toutes les migrations), vraies fonctions d'automatisation,
 * vrai planificateur du soir (runDaily) et vraie génération de PDF. Seul l'envoi d'e-mail est simulé.
 * Les dates se calent sur l'horloge de la base : le test reste valable quel que soit le jour d'exécution.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { runDaily, type Deps, type Report } from "@/lib/automation/run";
import { overdueSequence } from "@/lib/domain/reminders";
import { contractIssues } from "@/lib/domain/contract-check";

const read = (p: string) => readFileSync(path.join(__dirname, "..", p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const fails = async (sql: string, params: any[], re: RegExp) => { await expect(db.query(sql, params)).rejects.toThrow(re); };

let secret = "";
const mails: { to: string; subject: string; attachment?: { filename: string; bytes: Uint8Array } }[] = [];
const mailsTo = (to: string) => mails.filter((m) => m.to === to);

/** Pont vers la base : mêmes appels nommés que PostgREST. */
const rpc: Deps["rpc"] = async (name, args) => {
  const keys = Object.keys(args);
  const vals = keys.map((k) => {
    const v = args[k];
    return v !== null && typeof v === "object" && (!Array.isArray(v) || v.some((x) => typeof x === "object" && x !== null)) ? JSON.stringify(v) : v;
  });
  try {
    const r = await db.query<{ r: any }>(`select ${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, vals);
    return { data: r.rows[0]?.r ?? null, error: null };
  } catch (e) {
    return { data: null, error: { message: (e as Error).message } };
  }
};
const deps = (now: Date): Deps => ({
  secret, now, rpc, mailConfigured: () => true,
  sendMail: async (m: any) => { mails.push(m); return { sent: true }; }
});

// Calendrier relatif à l'horloge de la base
let today = "", month = "", first = "", last = "", nextFirst = "";
const iso = (d: Date) => d.toISOString().slice(0, 10);
const T = (dateStr: string, hhmm = "18:00") => new Date(`${dateStr}T${hhmm}:00Z`);

// Jeu de données
const ids: Record<string, string> = {};
let staffId = "", token = "", requestNumber = "", requestToken = "", siteId = "", c1Contract = "";
const TOKEN = "d".repeat(64);
let r1: Report, r2: Report, r3: Report;
let baseClients = 0;

async function mkClient(key: string, o: { name: string; email?: string | null; reserved?: boolean; auto?: boolean }) {
  const [c] = await q("insert into clients(name, email, is_reserved, auto_send_invoices, address, city) values ($1,$2,$3,$4,'1 rue du Test','Paris') returning id",
    [o.name, o.email === undefined ? `${key}@client.test` : o.email, !!o.reserved, o.auto ?? true]);
  ids[key] = c.id;
  return c.id as string;
}
async function mkContract(key: string, clientId: string, o: { amount: number; end?: string | null; weekdays?: number[] | null; staff?: string | null }) {
  const [k] = await q(`insert into contracts(client_id, label, billing_mode, monthly_amount_ht, start_date, end_date, status, weekdays, start_time, hours_per_visit, visits_per_week, staff_id)
    values ($1,$2,'mensuel',$3,'2026-01-01',$4,'actif',$5,$6,$7,$8,$9) returning id`,
    [clientId, `Contrat ${key}`, o.amount, o.end ?? null, o.weekdays ?? null, o.weekdays ? "09:00" : null, o.weekdays ? 2 : null, o.weekdays ? 1 : null, o.staff ?? null]);
  return k.id as string;
}
async function mkMission(clientId: string, o: { title?: string; date?: string; stage: string; price?: number | null; staff?: string | null; contract?: string | null; billable?: boolean }) {
  const [m] = await q(`insert into interventions(client_id, contract_id, title, scheduled_date, stage, billable, unit_price_ht, staff_id)
    values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
    [clientId, o.contract ?? null, o.title ?? "Ménage", o.date ?? first, o.stage, o.billable ?? true, o.price === undefined ? 35 : o.price, o.staff ?? null]);
  return m.id as string;
}
const invoiceOf = async (clientKey: string) => (await q("select * from invoices where client_id=$1 and billing_month=$2 and status <> 'annule'", [ids[clientKey], month]))[0];
const generated = (r: Report, name: string) => r.generated.find((g) => g.client === name);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;`);
  await db.exec(read("supabase/migrations/0001_schema.sql"));
  await db.exec(read("supabase/seed.sql"));
  for (const f of readdirSync(path.join(__dirname, "..", "supabase/migrations")).filter((n) => /^000[2-9]|^00[1-9]\d/.test(n)).sort()) {
    await db.exec(read(`supabase/migrations/${f}`));
    if (f.startsWith("0002")) await db.exec(read("supabase/seed_services.sql"));
  }
  secret = (await q("select automation_secret s from app_settings"))[0].s;
  baseClients = (await q("select count(*)::int n from clients"))[0].n;
  today = iso((await q("select (now() at time zone 'Europe/Paris')::date d"))[0].d);
  month = today.slice(0, 7);
  first = `${month}-01`;
  const lastDate = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0));
  last = iso(lastDate);
  nextFirst = iso(new Date(lastDate.getTime() + 86_400_000));
  await q(`update app_settings set auto_invoicing_enabled=true, auto_invoicing_start_month=$1, month_end_send_next_day=true, notify_email='patron@proclean.test',
           auto_planning_enabled=true, auto_reminders_enabled=true, company_email='contact@proclean.test'`, [month]);
});

describe("Scénario 1 — du site au paiement (cas nominal)", () => {
  it("1. une demande du site reçoit un numéro de suivi", async () => {
    const r = (await q("select submit_quote_request_v2($1,$2::jsonb) r", [secret, JSON.stringify({ reference: "WEB-1", name: "Nominal SA", email: "c1@client.test", service: "Entretien bureaux" })]))[0].r;
    requestNumber = r.request_number; requestToken = r.tracking_token;
    expect(requestNumber).toMatch(/^DEM-\d{4}-0001$/);
    // la demande a créé la fiche prospect toute seule
    expect(r).toMatchObject({ new_prospect: true });
    ids.c1 = r.client_id;
    expect((await q("select status, pipeline from clients where id=$1", [ids.c1]))[0]).toEqual({ status: "prospect", pipeline: "nouveau_prospect" });
    const s = (await q("select public_request_status($1,$2) r", [requestNumber, requestToken]))[0].r;
    expect(s.status).toBe("recue");
  });
  it("2. le patron crée client + devis ; le devis envoyé puis accepté apparaît côté client", async () => {
    const c1 = ids.c1;                                                    // le prospect créé par la demande du site (pas de doublon)
    await q("update clients set auto_send_invoices=true, address='1 rue du Test', city='Paris' where id=$1", [c1]);
    const [qt] = await q("insert into quotes(client_id, subject, status, number) values ($1,'Entretien bureaux','envoye','DEV-S1') returning id", [c1]);
    await q("insert into quote_lines(quote_id, position, description, quantity, unit_price_ht) values ($1,0,'Entretien mensuel',1,600)", [qt.id]);
    await q("update quote_requests set status='traitee', client_id=$1, quote_id=$2 where request_number=$3", [c1, qt.id, requestNumber]);
    expect((await q("select public_request_status($1,$2) r", [requestNumber, requestToken]))[0].r.status).toBe("devis_envoye");
    await q("update quotes set status='accepte' where id=$1", [qt.id]);
    expect((await q("select public_request_status($1,$2) r", [requestNumber, requestToken]))[0].r.status).toBe("devis_accepte");
    expect((await q("select pipeline from clients where id=$1", [c1]))[0].pipeline).toBe("devis_accepte");   // le pipeline a suivi le devis
    ids.quote = qt.id;
  });
  it("3. un contrat incomplet est refusé à l'activation avec le message exact, puis complété", () => {
    const issues = contractIssues({ label: "X", billing_mode: "mensuel", status: "actif", monthly_amount_ht: null, weekdays: null, start_time: null, hours_per_visit: null, visits_per_week: null, per_visit_amount_ht: null, start_date: null, end_date: null, assignee: null, site_address: null } as any);
    expect(issues.blocking.join(" ")).toMatch(/montant mensuel/);
    expect(issues.blocking.join(" ")).toMatch(/jours de passage|fréquence/);
  });
  it("4. le contrat actif crée son site ; l'agent est lié à sa fiche et reçoit un lien", async () => {
    [{ id: staffId }] = await q("insert into staff(full_name, agent_token_hash) values ('Fatou Diallo',$1) returning id", [createHash("sha256").update(TOKEN).digest("hex")]);
    token = TOKEN;
    // jour de passage : le jour de la semaine (ISO) d'aujourd'hui + 1, pour avoir au moins un passage futur dans le mois
    const dow = (new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7 + 1;
    c1Contract = await mkContract("C1", ids.c1, { amount: 600, weekdays: [dow], staff: staffId });
    await q("update quotes set contract_id=$1 where id=$2", [c1Contract, ids.quote]);
    const [k] = await q("select site_id, assignee from contracts where id=$1", [c1Contract]);
    siteId = k.site_id;
    expect((await q("select status, pipeline from clients where id=$1", [ids.c1]))[0]).toEqual({ status: "actif", pipeline: "client_actif" });   // contrat actif : le prospect devient client
    expect(siteId).toBeTruthy();                        // site créé automatiquement
    expect(k.assignee).toBe("Fatou Diallo");              // nom recopié depuis la fiche
    await q("update sites set checklist='[\"Vider les poubelles\",\"Aspirer\"]' where id=$1", [siteId]);
  });
});

describe("Scénario 2 — jeu de clients aux cas limites, puis fin de mois", () => {
  it("prépare 8 autres clients (réservé, sans e-mail, gros montant, mission non validée, annulée, fin de contrat, brouillon existant, anomalie)", async () => {
    const mid = `${month}-10`;
    // C1 : 2 missions validées facturables + 1 terminée non validée (non facturable) + 1 non facturable (forfait)
    await mkMission(ids.c1, { stage: "validee", price: 35, staff: staffId, date: first });
    await mkMission(ids.c1, { stage: "facturable", price: 35, staff: staffId, date: first });
    // C2 réservé
    await mkContract("C2", await mkClient("c2", { name: "Réservé SA", reserved: true }), { amount: 500 });
    await mkMission(ids.c2, { stage: "validee", price: 40 });
    // C3 sans e-mail
    await mkContract("C3", await mkClient("c3", { name: "Sans Email SA", email: null }), { amount: 400 });
    // C4 gros montant
    await mkContract("C4", await mkClient("c4", { name: "Gros Montant SA" }), { amount: 2000 });
    // C5 mission terminée mais non validée
    await mkContract("C5", await mkClient("c5", { name: "Non Validé SA" }), { amount: 300 });
    await mkMission(ids.c5, { stage: "terminee", price: 50 });
    // C6 mission validée puis annulée avant facturation
    await mkContract("C6", await mkClient("c6", { name: "Annulée SA" }), { amount: 200 });
    const m6 = await mkMission(ids.c6, { stage: "validee", price: 80 });
    await q("update interventions set stage='annulee' where id=$1", [m6]);
    // C7 contrat qui se termine en cours de mois
    await mkContract("C7", await mkClient("c7", { name: "Fin De Mois SA" }), { amount: 700, end: mid });
    // C8 brouillon déjà préparé pour le mois (corrigé à la main) : ne doit jamais être écrasé
    await mkContract("C8", await mkClient("c8", { name: "Brouillon Existant SA" }), { amount: 100 });
    await q("insert into invoices(client_id, billing_month, subject) values ($1,$2,'Brouillon corrigé à la main')", [ids.c8, month]);
    // C9 mission validée, puis anomalie ouverte
    await mkContract("C9", await mkClient("c9", { name: "Anomalie SA" }), { amount: 150 });
    const m9 = await mkMission(ids.c9, { stage: "validee", price: 60 });
    await q("insert into mission_issues(kind, intervention_id, client_id, description) values ('anomalie',$1,$2,'Dégât constaté')", [m9, ids.c9]);
    expect((await q("select stage from interventions where id=$1", [m9]))[0].stage).toBe("a_verifier");   // l'anomalie a repris la main
  });

  it("l'agent déroule une mission du jour : trajet, check-list héritée du site, photo, anomalie bloquante puis fin", async () => {
    const m = await mkMission(ids.c1, { stage: "affectee", price: null, staff: staffId, date: today, billable: false, contract: c1Contract, title: "Passage du jour" });
    ids.agentMission = m;
    const list = (await q("select agent_missions($1) r", [token]))[0].r;
    const mine = list.missions.find((x: any) => x.id === m);
    expect(mine.checklist.map((c: any) => c.label)).toEqual(["Vider les poubelles", "Aspirer"]);   // héritée du site
    expect(JSON.stringify(list)).not.toMatch(/600|unit_price|invoice|montant/i);                    // aucun montant côté agent
    for (const s of ["en_route", "arrivee", "en_cours"]) await q("select agent_set_stage($1,$2,$3)", [token, m, s]);
    await fails("select agent_set_stage($1,$2,'terminee')", [token, m], /CHECKLIST_INCOMPLETE/);   // check-list non cochée : refusé
  });

  it("…la check-list complète permet de terminer ; la mission attend la validation du patron", async () => {
    const m = ids.agentMission;
    await q("select agent_toggle_check($1,$2,0,true)", [token, m]);
    await q("select agent_toggle_check($1,$2,1,true)", [token, m]);
    await q("select agent_add_photo($1,$2,'apres','image/jpeg',$3)", [token, m, Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64")]);
    expect((await q("select agent_set_stage($1,$2,'terminee') s", [token, m]))[0].s).toBe("terminee");
    expect((await q("select count(*)::int n from interventions where id=$1 and stage='terminee' and status='realise'", [m]))[0].n).toBe(1);
  });

  it("les missions générées par le contrat portent l'agent (lien fiche Équipe) — elles apparaissent sur son téléphone", async () => {
    r1 = await runDaily(deps(T(last)));    // le dernier jour du mois, 19 h à Paris
    expect(r1.planning.created).toBeGreaterThan(0);
    const unlinked = await q("select count(*)::int n from interventions where contract_id=$1 and assignee is not null and staff_id is null", [c1Contract]);
    expect(unlinked[0].n).toBe(0);
    expect(r1.planning.incompleteContracts).toContain("Contrat C2");   // contrat sans jours de passage : signalé, jamais ignoré en silence
  });

  it("fin de mois : seules les factures sûres sont validées, toutes les autres restent en brouillon avec la raison", () => {
    expect(r1.enabled).toBe(true);
    expect(r1.failed).toEqual([]);
    const nominal = generated(r1, "Nominal SA")!;
    expect(nominal).toMatchObject({ status: "validee", totalHt: 670 });         // 600 de forfait + 2 missions validées de 35
    expect(nominal.number).toMatch(/^F-\d{4}-\d+$/);
    expect(generated(r1, "Annulée SA")).toMatchObject({ status: "validee", totalHt: 200 });   // mission annulée non facturée
    expect(generated(r1, "Réservé SA")).toMatchObject({ status: "brouillon", number: null });
    expect(generated(r1, "Réservé SA")!.reasons).toContain("contact réservé");
    expect(generated(r1, "Sans Email SA")!.reasons).toContain("pas d'adresse e-mail");
    expect(generated(r1, "Gros Montant SA")!.reasons.join(" ")).toMatch(/au-dessus du seuil/);
    expect(generated(r1, "Gros Montant SA")).toMatchObject({ status: "brouillon", number: null });
    expect(generated(r1, "Non Validé SA")!.reasons.join(" ")).toMatch(/pas encore validée/);
    expect(generated(r1, "Non Validé SA")).toMatchObject({ status: "brouillon", totalHt: 300 });   // la mission non validée n'est pas facturée
    expect(generated(r1, "Fin De Mois SA")!.reasons.join(" ")).toMatch(/proratisation/);
    expect(generated(r1, "Anomalie SA")).toMatchObject({ status: "brouillon", totalHt: 150 });
  });

  it("le brouillon déjà préparé n'est jamais écrasé : signalé au patron", async () => {
    expect(r1.skippedDrafts).toContain("Brouillon Existant SA");
    expect(generated(r1, "Brouillon Existant SA")).toBeUndefined();
    const inv = await q("select subject from invoices where client_id=$1 and billing_month=$2", [ids.c8, month]);
    expect(inv).toEqual([{ subject: "Brouillon corrigé à la main" }]);
  });

  it("les missions facturées sont verrouillées ; les autres restent libres", async () => {
    const inv = await invoiceOf("c1");
    expect(inv.status).toBe("envoye");                                   // validée : numérotée, pas encore envoyée
    expect(inv.sent_at).toBeNull();
    const billed = await q("select id, stage from interventions where invoice_id=$1", [inv.id]);
    expect(billed).toHaveLength(2);
    expect(billed.every((b) => b.stage === "facturee")).toBe(true);
    await fails("update interventions set unit_price_ht = 1 where id=$1", [billed[0].id], /INTERVENTION_FACTUREE/);
    await fails("delete from interventions where id=$1", [billed[0].id], /INTERVENTION_FACTUREE/);
    await fails("select agent_set_stage($1,$2,'en_route')", [token, billed[0].id], /ETAPE_INTERDITE|MISSION_INTROUVABLE/);
    // missions non facturées : C5 (non validée), C6 (annulée), C9 (anomalie)
    for (const k of ["c5", "c6", "c9"]) expect((await q("select count(*)::int n from interventions where client_id=$1 and invoice_id is not null", [ids[k]]))[0].n).toBe(0);
  });

  it("aucun e-mail client n'est parti le jour du calcul (fenêtre de relecture) ; le patron est prévenu", () => {
    expect(mails.filter((m) => m.to.endsWith("@client.test"))).toHaveLength(0);
    expect(mailsTo("patron@proclean.test").length).toBeGreaterThan(0);
  });

  it("un second passage le même jour ne crée aucun doublon", async () => {
    r2 = await runDaily(deps(T(last, "18:30")));
    expect(r2.generated).toEqual([]);
    for (const k of ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c9"]) {
      expect((await q("select count(*)::int n from invoices where client_id=$1 and billing_month=$2 and status <> 'annule'", [ids[k], month]))[0].n).toBe(1);
    }
    await fails("select automation_create_invoice($1,$2,$3,'x','[{\"description\":\"a\",\"quantity\":1,\"unit_price_ht\":1,\"vat_rate\":20}]'::jsonb,array[]::uuid[],null)", [secret, ids.c1, month], /FACTURE_MENSUELLE_EXISTANTE/);
  });

  it("le lendemain : seules les factures validées partent, avec leur PDF ; jamais un brouillon", async () => {
    r3 = await runDaily(deps(T(nextFirst)));
    expect(r3.sent.map((s) => s.to).sort()).toEqual(["c1@client.test", "c6@client.test"]);
    const mail = mailsTo("c1@client.test")[0];
    expect(Buffer.from(mail.attachment!.bytes.slice(0, 5)).toString()).toBe("%PDF-");
    for (const k of ["c2", "c3", "c4", "c5", "c7", "c8", "c9"]) expect(mailsTo(`${k}@client.test`)).toHaveLength(0);
    const inv = await invoiceOf("c1");
    expect(inv.sent_at).not.toBeNull();
    // les envois sont tracés dans le journal des e-mails
    expect((await q("select count(*)::int n from email_log where kind='facture' and ok")).at(0)!.n).toBe(2);
    // et rien n'est renvoyé au passage suivant
    const again = await runDaily(deps(T(nextFirst, "19:00")));
    expect(again.sent).toEqual([]);
  });
});

describe("Scénario 3 — impayés : J+1, J+7, J+15 alerte, J+30 manuel, arrêt au paiement", () => {
  const settle = async (clientKey: string, daysLate: number, lastReminderDaysAgo: number | null = null) => {
    // La base revérifie le délai sur l'historique des relances : on « fait passer le temps » aussi pour lui.
    if (lastReminderDaysAgo !== null) await q("update reminders set sent_at = now() - ($1::int || ' days')::interval where invoice_id in (select id from invoices where client_id=$2 and billing_month=$3)", [lastReminderDaysAgo, ids[clientKey], month]);
    await q("update invoices set due_date = current_date - $2::int, status = 'envoye', last_reminder_at = case when $3::int is null then last_reminder_at else now() - ($3::int || ' days')::interval end where client_id=$1 and billing_month=$4",
      [ids[clientKey], daysLate, lastReminderDaysAgo, month]);
  };
  const reminderMails = () => mails.filter((m) => /relance|rappel|retard/i.test(m.subject) && m.to === "c1@client.test");

  it("avant l'échéance : aucune relance", async () => {
    await settle("c1", -10);
    const r = await runDaily(deps(new Date()));
    expect(r.reminders).toEqual([]);
  });
  it("J+2 : première relance automatique (une seule, même si le planificateur repasse)", async () => {
    await settle("c1", 2);
    const r = await runDaily(deps(new Date()));
    expect(r.reminders).toHaveLength(1);
    expect(reminderMails()).toHaveLength(1);
    const again = await runDaily(deps(new Date()));
    expect(again.reminders).toEqual([]);                               // délai minimum entre deux relances
    expect((await invoiceOf("c1")).reminder_count).toBe(1);
  });
  it("J+8 : seconde relance ; le maximum est atteint, ensuite plus rien d'automatique", async () => {
    await settle("c1", 8, 7);
    const r = await runDaily(deps(new Date()));
    expect(r.reminders).toHaveLength(1);
    expect((await invoiceOf("c1")).reminder_count).toBe(2);
    await settle("c1", 16, 8);
    expect((await runDaily(deps(new Date()))).reminders).toEqual([]);
    const steps = overdueSequence(16, 2, { reminder_first_after_days: 1, reminder_interval_days: 6, reminder_max_count: 2, unpaid_alert_days: 15, reminder_manual_days: 30 });
    expect(steps.map((s) => s.state)).toEqual(["fait", "fait", "du", "a_venir"]);   // J+15 : alerte due ; J+30 : pas encore
    expect(overdueSequence(31, 2, { reminder_first_after_days: 1, reminder_interval_days: 6, reminder_max_count: 2, unpaid_alert_days: 15, reminder_manual_days: 30 }).at(-1)!.state).toBe("du");
  });
  it("contact réservé : aucune relance automatique, même en retard", async () => {
    const [inv] = await q("select id from invoices where client_id=$1 and billing_month=$2", [ids.c2, month]);
    await q("select validate_invoice($1, false, true)", [inv.id]);                // validation manuelle du patron (confirmation explicite)
    await q("update invoices set due_date = current_date - 20, status='envoye' where id=$1", [inv.id]);
    const before = mails.length;
    const r = await runDaily(deps(new Date()));
    expect(r.reminders.find((x: any) => /Réservé/.test(JSON.stringify(x)))).toBeUndefined();
    expect(mails.slice(before).filter((m) => m.to === "c2@client.test")).toHaveLength(0);
    expect((await q("select reminder_count from invoices where id=$1", [inv.id]))[0].reminder_count).toBe(0);
  });
  it("paiement : la facture passe « payée » et les relances s'arrêtent", async () => {
    const inv = await invoiceOf("c1");
    const [pay] = await q("insert into payments(source, amount, received_at, counterparty) values ('manuel',$1,now(),'Nominal SA') returning id", [inv.total_ttc]);
    await q("select reconcile_payment($1,$2,false)", [pay.id, inv.id]);
    const paid = await invoiceOf("c1");
    expect(paid.status).toBe("paye");
    await settle("c1", 40);                                                   // même « en retard » sur le papier, payée = intouchable
    await q("update invoices set status='paye' where id=$1", [inv.id]);
    const before = reminderMails().length;
    const r = await runDaily(deps(new Date()));
    expect(r.reminders).toEqual([]);
    expect(reminderMails()).toHaveLength(before);
    await fails("select reconcile_payment($1,$2,false)", [pay.id, inv.id], /PAIEMENT_DEJA_RAPPROCHE/);
  });
  it("le client voit sa facture réglée sur la page de suivi", async () => {
    await q("update quotes set invoice_id=$1 where id=$2", [(await invoiceOf("c1")).id, ids.quote]);
    const s = (await q("select public_request_status($1,$2) r", [requestNumber, requestToken]))[0].r;
    expect(s).toMatchObject({ status: "facture", status_label: "Facture réglée : merci !", invoice: { paid: true } });
    expect(s.appointments.length).toBeGreaterThan(0);
    expect(JSON.stringify(s)).not.toMatch(/Fatou|Dégât|clé/i);               // jamais le nom de l'agent
  });
});

describe("Scénario 4 — annulation, accès agent et traçabilité", () => {
  it("annuler une facture libère ses missions : elles redeviennent facturables, la facture du mois peut être refaite", async () => {
    const inv = await invoiceOf("c6");
    const missions = await q("select id from interventions where invoice_id=$1", [inv.id]);
    await q("select cancel_invoice($1,'erreur de saisie')", [inv.id]);
    expect((await q("select status from invoices where id=$1", [inv.id]))[0].status).toBe("annule");
    for (const m of missions) {
      const [x] = await q("select stage, invoice_id from interventions where id=$1", [m.id]);
      expect(x.invoice_id).toBeNull();
      expect(["validee", "facturable"]).toContain(x.stage);                // jamais de retour à « planifiée »
    }
    const redo = await runDaily(deps(T(last)), { forceGenerate: true });
    expect(redo.generated.map((g) => g.client)).toContain("Annulée SA");     // une seule nouvelle facture, pour ce client
    expect(redo.generated).toHaveLength(1);
  });
  it("un lien d'agent révoqué ou un agent désactivé n'ouvre plus rien", async () => {
    await q("update staff set agent_token_hash = null where id=$1", [staffId]);
    await fails("select agent_missions($1)", [token], /ACCES_REFUSE/);
    await q("update staff set agent_token_hash=$1, active=false where id=$2", [createHash("sha256").update(token).digest("hex"), staffId]);
    await fails("select agent_missions($1)", [token], /ACCES_REFUSE/);
    await q("update staff set active=true where id=$1", [staffId]);
    expect((await q("select agent_missions($1)->>'agent' a", [token]))[0].a).toBe("Fatou Diallo");
  });
  it("le journal dit qui a fait quoi : l'agent, l'automatisation ; rien d'effacé sans trace", async () => {
    const actors = (await q("select distinct actor from change_log")).map((r) => r.actor);
    expect(actors).toContain("Agent : Fatou Diallo");
    expect(actors).toContain("automatisation");
    const inv = await invoiceOf("c1");
    const hist = await q("select changes from change_log where table_name='invoices' and row_id=$1 and action='update'", [inv.id]);
    expect(hist.length).toBeGreaterThan(0);
  });
  it("les données de départ sont intactes : aucun client, facture ou contrat supprimé par tout le cycle", async () => {
    expect((await q("select count(*)::int n from clients"))[0].n).toBe(baseClients + 9);          // + les 9 clients du scénario, aucun perdu
    const mine = Object.entries(ids).filter(([k]) => /^c\d$/.test(k)).map(([, v]) => v);
    expect((await q("select count(*)::int n from invoices where status <> 'annule' and client_id = any($1::uuid[])", [mine]))[0].n).toBe(9);   // une facture (ou brouillon) par client du scénario
    expect((await q("select count(*)::int n from invoices where status = 'annule'"))[0].n).toBe(1);                                       // la seule annulée est celle que le test a annulée
  });
});
