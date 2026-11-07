import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
const MIG = readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x < "0022").sort(); // ce fichier teste 0021 : les migrations suivantes ont leurs propres tests
const BEFORE = MIG.filter((f) => f < "0021");

async function build(files: string[], opts: { seed?: boolean } = {}) {
  const db = new PGlite();
  await db.exec(`create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create role authenticated; create role anon;
    alter default privileges in schema public grant all on tables to authenticated, anon;
    alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of files) await db.exec(read(`supabase/migrations/${f}`));
  if (opts.seed) {
    await db.exec(read("supabase/seed.sql"));
    await db.exec("alter table invoices disable trigger user; alter table contracts disable trigger user");
    const [c] = (await db.query<{ id: string }>("insert into clients(name, email) values ('Client A', 'a@x.fr') returning id")).rows;
    await db.query("insert into invoices(client_id, number, status, issue_date, due_date, total_ttc, validated_at, sent_at) values ($1,'F-1','envoye','2026-10-01','2026-10-16',240,'2026-10-01','2026-10-01')", [c.id]);
    await db.query("insert into contracts(client_id, label, status, billing_mode, monthly_amount_ht) values ($1,'Entretien','actif','mensuel',500)", [c.id]);
    await db.exec("alter table invoices enable trigger user; alter table contracts enable trigger user");
    await db.exec("select log_audit('test','invoice',null,'{}')");
  }
  return db;
}

/** Empreinte des DONNÉES : toutes les tables hors JARVIS, ligne par ligne. */
async function dataFingerprint(db: PGlite, withJarvis = false) {
  const tables = (await db.query<{ t: string }>(`select table_name t from information_schema.tables where table_schema='public' and table_type='BASE TABLE' ${withJarvis ? "" : "and table_name not like 'jarvis\\_%'"} order by 1`)).rows.map((r) => r.t);
  const out: Record<string, string> = {};
  for (const t of tables) out[t] = (await db.query<{ h: string }>(`select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) h, count(*) from public."${t}" x`)).rows[0].h;
  return out;
}

/** Empreinte du SCHÉMA existant : colonnes, contraintes, index, politiques, déclencheurs, fonctions, droits. */
async function schemaFingerprint(db: PGlite, withJarvis = false) {
  const nj = (col: string) => (withJarvis ? "true" : `${col} not like 'jarvis\\_%'`);
  const q = async (sql: string) => (await db.query<any>(sql)).rows.map((r) => JSON.stringify(r)).sort();
  return {
    columns: await q(`select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' and ${nj("table_name")}`),
    constraints: await q(`select conrelid::regclass::text t, conname, pg_get_constraintdef(oid) d from pg_constraint where connamespace='public'::regnamespace and ${nj("conrelid::regclass::text")}`),
    indexes: await q(`select tablename, indexname, indexdef from pg_indexes where schemaname='public' and ${nj("tablename")}`),
    policies: await q(`select tablename, policyname, cmd, roles::text, qual, with_check from pg_policies where schemaname='public' and ${nj("tablename")}`),
    triggers: await q(`select event_object_table t, trigger_name, action_timing, event_manipulation from information_schema.triggers where trigger_schema='public' and ${nj("event_object_table")}`),
    functions: await q(`select proname, pg_get_function_identity_arguments(oid) a, md5(prosrc) h, prosecdef from pg_proc where pronamespace='public'::regnamespace and ${nj("proname")}`),
    grants: await q(`select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and ${nj("table_name")}`),
    rls: await q(`select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r' and ${nj("relname")}`)
  };
}

describe("migration 0021 — aucune donnée existante n'est touchée", () => {
  it("les 20 migrations précédentes existent, 0021 est la suivante", () => {
    expect(BEFORE).toHaveLength(20);
    expect(MIG[20]).toBe("0021_jarvis_core.sql");
  });

  it("appliquer 0021 laisse chaque ligne de chaque table existante strictement identique", async () => {
    const db = await build(BEFORE, { seed: true });
    const avant = await dataFingerprint(db);
    expect(Object.keys(avant).length).toBeGreaterThanOrEqual(25);
    await db.exec(read("supabase/migrations/0021_jarvis_core.sql"));
    expect(await dataFingerprint(db)).toEqual(avant);
  });

  it("le schéma existant (colonnes, contraintes, index, politiques, déclencheurs, fonctions, droits, RLS) est strictement inchangé", async () => {
    const db = await build(BEFORE, { seed: true });
    const avant = await schemaFingerprint(db);
    await db.exec(read("supabase/migrations/0021_jarvis_core.sql"));
    expect(await schemaFingerprint(db)).toEqual(avant);
  });

  it("la migration ne contient aucune instruction qui modifie une table existante", () => {
    const sql = read("supabase/migrations/0021_jarvis_core.sql").replace(/--[^\n]*/g, "");
    // « after insert or update or delete » (déclencheur) et « do update set » (mise à jour d'une ligne JARVIS) ne sont pas des modifications de table existante.
    const nettoye = sql.replace(/(?:after|before)\s+insert\s+or\s+update\s+or\s+delete/gi, "").replace(/do\s+update\s+set/gi, "");
    const cibles = [...nettoye.matchAll(/\b(alter table|drop table|truncate(?: table)?|update|delete from|insert into)\s+(?:if (?:not )?exists\s+)?([a-z_%I]+)/gi)].map((m) => `${m[1].toLowerCase()} ${m[2]}`);
    expect(cibles.length).toBeGreaterThan(10); // le test ne doit pas devenir vide
    expect(cibles.filter((c) => !/ (jarvis_|%I$|t$)/.test(c))).toEqual([]);
  });

  it("n'insère que des lignes de configuration JARVIS (agents, règles, clés de mémoire)", async () => {
    const db = await build(BEFORE, { seed: true });
    await db.exec(read("supabase/migrations/0021_jarvis_core.sql"));
    const n = async (t: string) => Number((await db.query<{ n: number }>(`select count(*)::int n from ${t}`)).rows[0].n);
    expect([await n("jarvis_agents"), await n("jarvis_action_kinds"), await n("jarvis_memory_keys")]).toEqual([9, 5, 1]);
    for (const t of ["jarvis_runs", "jarvis_alerts", "jarvis_actions", "jarvis_tasks", "jarvis_events", "jarvis_instructions", "jarvis_memory"]) expect(await n(t), t).toBe(0);
  });
});

describe("migration 0021 — retour arrière", () => {
  it("0021_down ramène le schéma ET les données à l'état exact d'avant, sans aucun reste", async () => {
    const db = await build(BEFORE, { seed: true });
    const schemaAvant = await schemaFingerprint(db, true);
    const donneesAvant = await dataFingerprint(db, true);
    await db.exec(read("supabase/migrations/0021_jarvis_core.sql"));
    await db.exec(read("supabase/migrations/0021_down.sql"));
    expect(await schemaFingerprint(db, true)).toEqual(schemaAvant);
    expect(await dataFingerprint(db, true)).toEqual(donneesAvant);
    const restes = (await db.query<{ n: number }>(`select (select count(*) from pg_class where relnamespace='public'::regnamespace and relname like 'jarvis\\_%') + (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname like 'jarvis\\_%') n`)).rows[0].n;
    expect(Number(restes)).toBe(0);
  });

  it("se rejoue après un retour arrière (appliquer, annuler, réappliquer)", async () => {
    const db = await build(BEFORE);
    for (let i = 0; i < 2; i++) { await db.exec(read("supabase/migrations/0021_jarvis_core.sql")); await db.exec(read("supabase/migrations/0021_down.sql")); }
    await db.exec(read("supabase/migrations/0021_jarvis_core.sql"));
    expect(Number((await db.query<{ n: number }>("select count(*)::int n from jarvis_agents")).rows[0].n)).toBe(9);
  });

  it("le retour arrière efface les données JARVIS créées entre-temps (à exporter avant si on veut les garder), sans toucher aux autres", async () => {
    const db = await build(BEFORE, { seed: true });
    const donnees = await dataFingerprint(db);
    await db.exec(read("supabase/migrations/0021_jarvis_core.sql"));
    await db.exec("select jarvis_record_run('finance','manuel','{\"alerts\":[{\"dedupe_key\":\"x\",\"severity\":\"info\",\"title\":\"t\"}]}'::jsonb)");
    await db.exec(read("supabase/migrations/0021_down.sql"));
    expect(await dataFingerprint(db)).toEqual(donnees);
  });
});

describe("migration 0021 — dépendances réelles", () => {
  const sql = read("supabase/migrations/0021_jarvis_core.sql").replace(/--[^\n]*/g, "");
  const definiePar = (fn: string) => BEFORE.filter((f) => new RegExp(`create (or replace )?function ${fn}\\(`, "i").test(read(`supabase/migrations/${f}`)));

  it("n'appelle que 3 objets du CRM existant : is_owner() et log_audit() (0001), audit_row() (0006, redéfinie en 0008) — plus auth.uid() de Supabase", () => {
    const utilises = ["is_owner", "log_audit", "audit_row"].filter((fn) => new RegExp(`\\b${fn}\\b`).test(sql));
    expect(utilises).toEqual(["is_owner", "log_audit", "audit_row"]);
    expect(definiePar("is_owner")).toEqual(["0001_schema.sql"]);
    expect(definiePar("log_audit")).toEqual(["0001_schema.sql"]);
    expect(definiePar("audit_row")).toEqual(["0006_sites_staff_missions.sql", "0008_agent_mobile.sql"]);
  });

  it("ne référence AUCUNE table existante (clés étrangères, lectures, jointures) : toutes ses relations sont jarvis_*", () => {
    const refs = [...sql.matchAll(/\b(?:references|from|join|into|update|using|on)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase());
    const ignores = new Set(["conflict", "all", "tables", "excluded", "jsonb_to_recordset", "jsonb_array_elements", "jsonb_each", "t", "x", "a", "k", "m", "now", "public", "function", "functions", "on", "or", "set", "jarvis_action_kinds_owner", "jarvis_memory_keys_owner", "auth", "authenticated", "anon"]);
    const tables = [...new Set(refs.filter((r) => !ignores.has(r) && !r.startsWith("v_")))]; // v_* : variables PL/pgSQL, pas des tables
    expect(tables.filter((t) => !t.startsWith("jarvis_"))).toEqual([]);
  });

  it("échoue proprement (rien d'appliqué) si l'un de ces 3 objets manque", async () => {
    const db = await build(["0001_schema.sql"]); // is_owner et log_audit présents, audit_row absent
    await expect(db.exec(read("supabase/migrations/0021_jarvis_core.sql"))).rejects.toThrow(/audit_row/);
    expect(Number((await db.query<{ n: number }>("select count(*)::int n from pg_class where relname like 'jarvis\\_%' and relnamespace='public'::regnamespace")).rows[0].n)).toBe(0);
  });

  it("s'applique sur la chaîne complète des 20 migrations, dans l'ordre, sans erreur : 10 tables JARVIS", async () => {
    const db = await build(MIG);
    expect(Number((await db.query<{ n: number }>("select count(*)::int n from information_schema.tables where table_schema='public' and table_name like 'jarvis\\_%'")).rows[0].n)).toBe(10);
  });
});
