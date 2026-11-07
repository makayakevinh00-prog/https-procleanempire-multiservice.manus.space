import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { analyseFinance, type FinanceSnapshot } from "@/lib/jarvis/agents/finance";
import { prepare } from "@/lib/jarvis/core";
import { ACTION_KINDS } from "@/lib/jarvis/policy";
import { AGENTS } from "@/lib/jarvis/registry";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const fails = (sql: string, params: any[], re: RegExp) => expect(db.query(sql, params)).rejects.toThrow(re);
const run = async (agent: string, result: object) => (await q("select jarvis_record_run($1,'manuel',$2::jsonb) r", [agent, JSON.stringify(result)]))[0].r;
const asOwner = async () => { await q("select set_config('test.email','contact@procleanempire.com',false), set_config('test.uid','00000000-0000-0000-0000-00000000aaaa',false)"); await db.exec("set role authenticated"); };
const asOther = async () => { await q("select set_config('test.email','comptable@cabinet.fr',false), set_config('test.uid','00000000-0000-0000-0000-00000000bbbb',false)"); await db.exec("set role authenticated"); };
const asAdmin = async () => { await db.exec("reset role"); };

const TODAY = "2026-11-10";
let c1: string, c2: string, lateInv: string, cancelled: string, kBad: string;

beforeAll(async () => {
  db = new PGlite();
  // Simule l'authentification Supabase : e-mail et identifiant lus dans des réglages de test.
  await db.exec(`create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email', coalesce(current_setting('test.email', true), '')) $$;
    create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon;
    alter default privileges in schema public grant all on tables to authenticated, anon;
    alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql")).sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  await db.exec("alter table invoices disable trigger user; alter table contracts disable trigger user");
  await db.exec("delete from contracts"); // le jeu de départ du dépôt contient des contrats d'exemple : on isole le scénario
  c1 = (await q("insert into clients(name) values ('Client Retard') returning id"))[0].id;
  c2 = (await q("insert into clients(name) values ('Client Contrat') returning id"))[0].id;
  lateInv = (await q("insert into invoices(client_id, number, status, issue_date, due_date, total_ttc, reminder_count, sent_at, validated_at) values ($1,'F-LATE','en_retard','2026-09-20','2026-10-05',240,3,'2026-09-20','2026-09-20') returning id", [c1]))[0].id;
  cancelled = (await q("insert into invoices(client_id, number, status, issue_date, due_date, total_ttc, sent_at) values ($1,'F-ANN','annule','2026-10-02','2026-10-17',100,'2026-10-02') returning id", [c1]))[0].id;
  kBad = (await q("insert into contracts(client_id, label, status, billing_mode, per_visit_amount_ht) values ($1,'Passages SWYFO','actif','passage',60) returning id", [c2]))[0].id;
});

/** Photo des données depuis la base, comme le fait le chargeur de l'application. */
async function snapshot(): Promise<FinanceSnapshot> {
  const inv = await q(`select i.*, c.name client_name, c.is_reserved from invoices i join clients c on c.id = i.client_id`);
  const ctr = await q(`select k.*, c.name client_name from contracts k join clients c on c.id = k.client_id`);
  const s = (await q("select payment_terms_days, reminder_max_count, reminder_manual_days, quote_terms from app_settings"))[0];
  const iso = (d: any) => (d ? (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10) : null);
  return {
    today: TODAY,
    settings: { payment_terms_days: s.payment_terms_days, reminder_max_count: s.reminder_max_count, reminder_manual_days: s.reminder_manual_days, quote_terms: s.quote_terms },
    invoices: inv.map((i: any) => ({ id: i.id, number: i.number, client_id: i.client_id, client_name: i.client_name, client_reserved: i.is_reserved, status: i.status, issue_date: iso(i.issue_date), due_date: iso(i.due_date),
      total_ttc: Number(i.total_ttc), paid_amount: Number(i.paid_amount), paid_at: i.paid_at ? iso(i.paid_at) : null, sent_at: i.sent_at ? new Date(i.sent_at).toISOString() : null, reminder_count: i.reminder_count, created_at: new Date(i.created_at).toISOString() })),
    contracts: ctr.map((k: any) => ({ id: k.id, client_id: k.client_id, client_name: k.client_name, label: k.label, status: k.status, billing_mode: k.billing_mode, monthly_amount_ht: k.monthly_amount_ht === null ? null : Number(k.monthly_amount_ht),
      per_visit_amount_ht: k.per_visit_amount_ht === null ? null : Number(k.per_visit_amount_ht), terms: k.terms, weekdays: k.weekdays, visits_per_week: k.visits_per_week === null ? null : Number(k.visits_per_week), hours_per_visit: null, site_address: k.site_address, assignee: k.assignee, start_date: iso(k.start_date) })),
    paymentsCount: Number((await q("select count(*) n from payments"))[0].n)
  };
}

describe("socle JARVIS — contenu de la migration", () => {
  it("9 agents, dont seulement Core et Finance actifs", async () => {
    const rows = await q("select key, status from jarvis_agents order by key");
    expect(rows.map((r: any) => r.key).sort()).toEqual(AGENTS.map((a) => a.key).sort());
    expect(rows.filter((r: any) => r.status === "actif").map((r: any) => r.key).sort()).toEqual(["core", "finance"]);
  });
  it("règles d'autonomie de la base = règles du code", async () => {
    const rows = await q("select kind, level from jarvis_action_kinds");
    expect(Object.fromEntries(rows.map((r: any) => [r.kind, r.level]))).toEqual(Object.fromEntries(Object.entries(ACTION_KINDS).map(([k, v]) => [k, v.level])));
  });
});

describe("passage de l'agent Finance sur des données réelles (base de test)", () => {
  let first: any;
  it("enregistre alertes, propositions L2/L3, tâche et demande à Opérations", async () => {
    const result = prepare(analyseFinance(await snapshot()));
    first = await run("finance", result);
    expect(result.alerts.map((a) => a.dedupe_key.split(":")[0]).sort()).toEqual(["cancelled", "contract", "late", "qonto_empty"]);
    expect(first).toMatchObject({ alerts_new: 4, actions_new: 3, tasks_new: 1, events_new: 2 });
    expect((await q("select count(*)::int n from jarvis_alerts where status='open'"))[0].n).toBe(result.alerts.length);
    const actions = await q("select kind, level, status from jarvis_actions order by kind");
    expect(actions).toEqual([
      { kind: "contact_client", level: "L2", status: "proposed" },
      { kind: "issue_credit_note", level: "L3", status: "blocked" },
      { kind: "legal_notice", level: "L3", status: "blocked" }
    ]);
    expect((await q("select target_agent from jarvis_events order by target_agent")).map((r: any) => r.target_agent)).toEqual(["juridique", "operations"]);
  });

  it("un deuxième passage identique ne crée AUCUN doublon", async () => {
    const again = await run("finance", prepare(analyseFinance(await snapshot())));
    expect(again).toMatchObject({ alerts_new: 0, alerts_resolved: 0, actions_new: 0, actions_withdrawn: 0, tasks_new: 0, events_new: 0 });
    expect((await q("select count(*)::int n from jarvis_alerts"))[0].n).toBe((await q("select count(*)::int n from jarvis_alerts where status='open'"))[0].n);
  });

  it("une alerte notée « vue » le reste au passage suivant (pas de réveil intempestif)", async () => {
    await q("update jarvis_alerts set status='acknowledged' where dedupe_key = $1", [`late:${lateInv}`]);
    await run("finance", prepare(analyseFinance(await snapshot())));
    expect((await q("select status from jarvis_alerts where dedupe_key = $1", [`late:${lateInv}`]))[0].status).toBe("acknowledged");
  });

  it("quand la situation se règle, l'alerte est résolue (jamais supprimée) et la proposition retirée", async () => {
    await q("update invoices set status='paye', paid_amount=240, paid_at='2026-11-09' where id=$1", [lateInv]);
    const r = await run("finance", prepare(analyseFinance(await snapshot())));
    expect(r.alerts_resolved).toBeGreaterThanOrEqual(1);
    expect(r.actions_withdrawn).toBe(2);
    const a = (await q("select status, resolved_reason from jarvis_alerts where dedupe_key = $1", [`late:${lateInv}`]))[0];
    expect(a.status).toBe("resolved");
    expect(a.resolved_reason).toMatch(/Plus constaté/);
    expect((await q("select status from jarvis_actions where dedupe_key = $1", [`contact:${lateInv}`]))[0].status).toBe("withdrawn");
  });

  it("garde l'historique des passages", async () => {
    expect((await q("select count(*)::int n from jarvis_runs where agent_key='finance'"))[0].n).toBe(4);
    expect((await q("select last_run_at from jarvis_agents where key='finance'"))[0].last_run_at).not.toBeNull();
  });
});

describe("règles d'autonomie imposées par la base", () => {
  it("refuse une action de type inconnu", async () => {
    await fails("select jarvis_record_run('finance','manuel',$1::jsonb)", [JSON.stringify({ actions: [{ dedupe_key: "z", kind: "virement", title: "Payer" }] })], /ACTION_INCONNUE/);
  });
  it("refuse une action L1 déguisée en proposition", async () => {
    await fails("select jarvis_record_run('finance','manuel',$1::jsonb)", [JSON.stringify({ actions: [{ dedupe_key: "z", kind: "create_task", title: "t" }] })], /ACTION_L1/);
  });
  it("refuse un agent inconnu, un agent désactivé et un destinataire inconnu", async () => {
    await fails("select jarvis_record_run('pirate','manuel','{}'::jsonb)", [], /AGENT_INCONNU/);
    await q("update jarvis_agents set enabled=false where key='finance'");
    await fails("select jarvis_record_run('finance','manuel','{}'::jsonb)", [], /AGENT_DESACTIVE/);
    await q("update jarvis_agents set enabled=true where key='finance'");
    await fails("select jarvis_record_run('finance','manuel',$1::jsonb)", [JSON.stringify({ events: [{ type: "x", target_agent: "nobody", dedupe_key: "1" }] })], /DESTINATAIRE_INCONNU/);
  });
  it("un passage refusé n'écrit rien (transaction)", async () => {
    const before = (await q("select count(*)::int n from jarvis_runs"))[0].n;
    await fails("select jarvis_record_run('finance','manuel',$1::jsonb)", [JSON.stringify({ alerts: [{ dedupe_key: "tmp", severity: "info", title: "t" }], actions: [{ dedupe_key: "z", kind: "virement", title: "x" }] })], /ACTION_INCONNUE/);
    expect((await q("select count(*)::int n from jarvis_runs"))[0].n).toBe(before);
    expect((await q("select count(*)::int n from jarvis_alerts where dedupe_key='tmp'"))[0].n).toBe(0);
  });
});

describe("décision du patron", () => {
  let l2: string, l3: string;
  it("préparer : une proposition L2 et une L3 existent", async () => {
    await q("update invoices set status='en_retard', paid_amount=0, paid_at=null where id=$1", [lateInv]);
    await run("finance", prepare(analyseFinance(await snapshot())));
    l2 = (await q("select id from jarvis_actions where kind='contact_client' and status='proposed'"))[0].id;
    l3 = (await q("select id from jarvis_actions where kind='legal_notice' and status='blocked'"))[0].id;
    expect(l2 && l3).toBeTruthy();
  });
  it("valider une L2 crée une tâche pour le patron, trace la décision et n'envoie rien", async () => {
    const r = (await q("select jarvis_decide_action($1,'approve','ok') r", [l2]))[0].r;
    expect(r.status).toBe("executed");
    const a = (await q("select status, result, decision_note from jarvis_actions where id=$1", [l2]))[0];
    expect(a).toMatchObject({ status: "executed", decision_note: "ok" });
    expect(a.result).toMatch(/Aucun envoi/);
    const t = (await q("select title, detail, priority from jarvis_tasks where source_action_id=$1", [l2]))[0];
    expect(t.title).toMatch(/^À faire :/);
    expect(t.detail).toContain("Brouillon validé");
    expect((await q("select count(*)::int n from audit_log where action='jarvis.validation'"))[0].n).toBe(1);
    expect((await q("select count(*)::int n from email_log"))[0].n).toBe(0);
  });
  it("une décision ne se rejoue pas", async () => {
    await fails("select jarvis_decide_action($1,'approve',null)", [l2], /ACTION_DEJA_TRAITEE/);
    await fails("select jarvis_decide_action($1,'reject',null)", [l2], /ACTION_DEJA_TRAITEE/);
  });
  it("une action L3 ne peut JAMAIS être validée par JARVIS", async () => {
    await fails("select jarvis_decide_action($1,'approve',null)", [l3], /ACTION_BLOQUEE/);
    await fails("select jarvis_decide_action($1,'reject',null)", [l3], /ACTION_BLOQUEE/);
    expect((await q("select status from jarvis_actions where id=$1", [l3]))[0].status).toBe("blocked");
  });
  it("décision invalide ou action inexistante : refusé", async () => {
    await fails("select jarvis_decide_action($1,'peut-etre',null)", [l2], /DECISION_INVALIDE/);
    await fails("select jarvis_decide_action('00000000-0000-0000-0000-000000000000','approve',null)", [], /ACTION_INTROUVABLE/);
  });
  it("refuser une proposition la ferme sans créer de tâche", async () => {
    await q("update jarvis_actions set status='withdrawn' where status in ('proposed')");
    await run("finance", prepare(analyseFinance(await snapshot())));
    const id = (await q("select id from jarvis_actions where kind='contact_client' and status='proposed'"))[0].id;
    const before = (await q("select count(*)::int n from jarvis_tasks"))[0].n;
    expect((await q("select jarvis_decide_action($1,'reject','pas maintenant') r", [id]))[0].r.status).toBe("rejected");
    expect((await q("select count(*)::int n from jarvis_tasks"))[0].n).toBe(before);
  });
});

describe("mémoire commune maîtrisée", () => {
  it("seule une clé déclarée, par son rédacteur autorisé", async () => {
    await fails("select jarvis_record_run('finance','manuel',$1::jsonb)", [JSON.stringify({ memory: [{ key: "client.opinion", subject_type: "client", subject_id: c1, value: { x: 1 } }] })], /violates foreign key|MEMOIRE_REFUSEE/);
    await fails("select jarvis_record_run('commercial','manuel',$1::jsonb)", [JSON.stringify({ memory: [{ key: "client.delai_paiement_moyen_jours", subject_type: "client", subject_id: c1, value: { moyenne: 3 } }] })], /MEMOIRE_REFUSEE/);
  });
  it("écrit, met à jour sans doublon, garde la provenance", async () => {
    const mem = (v: number) => ({ memory: [{ key: "client.delai_paiement_moyen_jours", subject_type: "client", subject_id: c1, value: { moyenne: v, n: 2 } }] });
    await run("finance", mem(4)); await run("finance", mem(6));
    const rows = await q("select value, source from jarvis_memory where subject_id=$1", [c1]);
    expect(rows).toHaveLength(1);
    expect(rows[0].value.moyenne).toBe(6);
    expect(rows[0].source).toMatch(/^finance · passage /);
  });
  it("efface ce qui dépasse sa durée de vie", async () => {
    await q("update jarvis_memory set updated_at = now() - interval '400 days' where subject_id=$1", [c1]);
    const r = await run("finance", {});
    expect(r.memory_expired).toBe(1);
    expect((await q("select count(*)::int n from jarvis_memory"))[0].n).toBe(0);
  });
});

describe("accès : le patron seulement", () => {
  it("le patron lit et enregistre", async () => {
    await asOwner();
    try {
      expect((await q("select count(*)::int n from jarvis_alerts"))[0].n).toBeGreaterThan(0);
      expect((await q("select jarvis_record_run('finance','manuel','{}'::jsonb) r"))[0].r.run_id).toBeTruthy();
    } finally { await asAdmin(); }
  });
  it("tout autre compte connecté ne voit aucune ligne JARVIS", async () => {
    await asOther();
    try {
      for (const t of ["jarvis_agents", "jarvis_alerts", "jarvis_actions", "jarvis_tasks", "jarvis_events", "jarvis_runs", "jarvis_memory", "jarvis_instructions", "jarvis_action_kinds", "jarvis_memory_keys"])
        expect((await q(`select count(*)::int n from ${t}`))[0].n, t).toBe(0);
    } finally { await asAdmin(); }
  });
  it("tout autre compte ne peut ni écrire, ni lancer un passage, ni décider", async () => {
    await asOther();
    try {
      await expect(db.query("insert into jarvis_tasks(agent_key,title) values ('finance','x')")).rejects.toThrow(/row-level security|permission/);
      await expect(db.query("select jarvis_record_run('finance','manuel','{}'::jsonb)")).rejects.toThrow(/ACCES_REFUSE|row-level security|permission/);
      await expect(db.query("select jarvis_decide_action('00000000-0000-0000-0000-000000000000','approve',null)")).rejects.toThrow(/ACCES_REFUSE|ACTION_INTROUVABLE/);
    } finally { await asAdmin(); }
  });
  it("même le patron ne peut pas modifier les règles d'autonomie ni les clés de mémoire", async () => {
    await asOwner();
    try {
      await expect(db.query("update jarvis_action_kinds set level='L1' where kind='legal_notice'")).rejects.toThrow(/permission denied/);
      await expect(db.query("insert into jarvis_memory_keys(key,scope,writers,description,retention_days) values ('x','shared',array['finance'],'x',1)")).rejects.toThrow(/permission denied/);
      await expect(db.query("truncate jarvis_alerts")).rejects.toThrow(/permission denied/);
    } finally { await asAdmin(); }
  });
  it("les écritures sensibles sont tracées dans le journal des modifications", async () => {
    expect((await q("select count(*)::int n from change_log where table_name in ('jarvis_actions','jarvis_tasks')"))[0].n).toBeGreaterThan(0);
  });
});

describe("instructions du patron", () => {
  it("une commande « run » est valide ; un texte libre exige du contenu", async () => {
    await q("insert into jarvis_instructions(agent_key, kind, command) values ('finance','commande','run')");
    await q("insert into jarvis_instructions(agent_key, kind, body) values ('finance','libre','surveille SWYFO')");
    await fails("insert into jarvis_instructions(agent_key, kind, body) values ('finance','libre','   ')", [], /jarvis_instruction_shape/);
    await fails("insert into jarvis_instructions(agent_key, kind) values ('finance','libre')", [], /jarvis_instruction_shape/);
    await fails("insert into jarvis_instructions(agent_key, kind) values ('finance','commande')", [], /jarvis_instruction_shape/);
  });
  it("seules les commandes connues existent (aucune commande libre déguisée)", async () => {
    await fails("insert into jarvis_instructions(agent_key, kind, command) values ('finance','commande','supprimer_facture')", [], /check/);
    await fails("insert into jarvis_instructions(agent_key, kind, body, status) values ('finance','libre','x y z','traitee')", [], /check/);
  });
  it("l'agent doit exister ; une instruction reste en attente par défaut", async () => {
    await fails("insert into jarvis_instructions(agent_key, kind, body) values ('pirate','libre','abc')", [], /foreign key/);
    expect((await q("select status from jarvis_instructions where body='surveille SWYFO'"))[0].status).toBe("en_attente");
  });
  it("réservées au patron : un autre compte ne lit ni n'écrit", async () => {
    await asOther();
    try {
      expect((await q("select count(*)::int n from jarvis_instructions"))[0].n).toBe(0);
      await expect(db.query("insert into jarvis_instructions(agent_key, kind, body) values ('finance','libre','intrus')")).rejects.toThrow(/row-level security|permission/);
    } finally { await asAdmin(); }
  });
  it("les instructions n'ont aucun lien avec les données du CRM : aucune clé étrangère vers une table existante", async () => {
    const refs = await q("select confrelid::regclass::text t from pg_constraint where conrelid='jarvis_instructions'::regclass and contype='f'");
    expect(refs.map((r: any) => r.t)).toEqual(["jarvis_agents"]);
  });
});

describe("retour arrière", () => {
  it("0021_down supprime uniquement les objets JARVIS", async () => {
    const tablesAvant = (await q("select count(*)::int n from information_schema.tables where table_schema='public' and table_name not like 'jarvis_%'"))[0].n;
    await db.exec(read("supabase/migrations/0021_down.sql"));
    expect((await q("select count(*)::int n from information_schema.tables where table_schema='public' and table_name like 'jarvis_%'"))[0].n).toBe(0);
    expect((await q("select count(*)::int n from information_schema.tables where table_schema='public' and table_name not like 'jarvis_%'"))[0].n).toBe(tablesAvant);
    expect((await q("select count(*)::int n from invoices"))[0].n).toBeGreaterThan(0);
    await db.exec(read("supabase/migrations/0021_jarvis_core.sql")); // et la migration se rejoue proprement
    expect((await q("select count(*)::int n from jarvis_agents"))[0].n).toBe(9);
  });
});
