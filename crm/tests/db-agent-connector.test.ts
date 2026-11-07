import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const api = async (token: string, op: string, args: object = {}) => (await q("select agent_api($1,$2,$3::jsonb) r", [token, op, JSON.stringify(args)]))[0].r;
const fails = (token: string | null, op: string, args: object, re: RegExp) => expect(db.query("select agent_api($1,$2,$3::jsonb)", [token, op, JSON.stringify(args)])).rejects.toThrow(re);
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const TOKEN = "d".repeat(64), TOKEN_REVOKED = "e".repeat(64), TOKEN_OFF = "f".repeat(64);
let ok: string, reserved: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email', coalesce(current_setting('test.email', true), '')) $$;
    create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon;
    alter default privileges in schema public grant all on tables to authenticated, anon;
    alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0021_jarvis_core.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  await db.exec(read("supabase/migrations/0024_agent_connector.sql"));
  await db.exec("alter table invoices disable trigger user; alter table contracts disable trigger user; delete from contracts");
  ok = (await q("insert into clients(name, email, city) values ('Client Exemple','x@example.invalid','Lille') returning id"))[0].id;
  reserved = (await q("insert into clients(name, email, is_reserved) values ('Contact Secret','s@example.invalid', true) returning id"))[0].id;
  await q("insert into invoices(client_id, number, status, issue_date, due_date, total_ttc, paid_amount, sent_at, validated_at) values ($1,'F-A','en_retard','2026-09-01','2026-09-15',120,20,'2026-09-01','2026-09-01')", [ok]);
  await q("insert into invoices(client_id, number, status, issue_date, due_date, total_ttc, sent_at, validated_at) values ($1,'F-SECRET','en_retard','2026-09-01','2026-09-15',999,'2026-09-01','2026-09-01')", [reserved]);
  await q("insert into payments(source, amount, received_at, counterparty, label, reference) values ('manuel', 55, now(), 'PAYEUR TEST', 'lib', 'ref')");
  await q("insert into quote_requests(name, email, phone, message) values ('Prospect Test','p@example.invalid','0600000000','Besoin de ménage')");
  await q("insert into agent_connectors(agent_key, token_hash) values ('finance',$1)", [hash(TOKEN)]);
  await q("insert into agent_connectors(agent_key, token_hash, revoked_at) values ('finance',$1, now())", [hash(TOKEN_REVOKED)]);
  await q("insert into agent_connectors(agent_key, token_hash) values ('juridique',$1)", [hash(TOKEN_OFF)]);
  await q("update jarvis_agents set enabled = false where key = 'juridique'");
});

describe("accès par lien d'agent", () => {
  it("refuse lien inconnu, vide, court, révoqué ou agent désactivé — même message", async () => {
    for (const t of ["x".repeat(64), "", "court", TOKEN_REVOKED, TOKEN_OFF]) await fails(t, "overview", {}, /ACCES_REFUSE/);
    await fails(null, "overview", {}, /ACCES_REFUSE/);
  });
  it("opération inconnue refusée", async () => { await fails(TOKEN, "drop_everything", {}, /OPERATION_INCONNUE/); });
  it("est appelable par le rôle anonyme (comme les liens agents) mais n'ouvre aucune table", async () => {
    await db.exec("set role anon");
    try {
      expect((await api(TOKEN, "overview")).date).toBeTruthy();
      await expect(db.query("select * from agent_connectors")).rejects.toThrow(/permission denied/);   // aucun droit sur les liens
      expect((await db.query("select * from invoices")).rows).toHaveLength(0);
    } finally { await db.exec("reset role"); }
  });
});

describe("lecture limitée", () => {
  it("exclut les contacts réservés et ne montre ni e-mail, ni téléphone, ni IBAN", async () => {
    const inv = await api(TOKEN, "open_invoices");
    expect(inv.map((i: any) => i.numero)).toEqual(["F-A"]);
    expect(inv[0].reste_du_ttc).toBe(100);
    const all = JSON.stringify([inv, await api(TOKEN, "quote_requests"), await api(TOKEN, "find_client", { name: "Client" }), await api(TOKEN, "unmatched_payments"), await api(TOKEN, "overview")]);
    expect(all).not.toMatch(/example\.invalid|0600000000|FR76|F-SECRET|Contact Secret/);
    expect((await api(TOKEN, "overview")).factures_en_retard.nombre).toBe(1);
  });
  it("find_client indique si un e-mail existe sans le révéler, et ignore les réservés", async () => {
    const r = await api(TOKEN, "find_client", { name: "Client Exemple" });
    expect(r).toHaveLength(1); expect(r[0].peut_recevoir_un_email).toBe(true);
    expect(await api(TOKEN, "find_client", { name: "Contact Secret" })).toEqual([]);
    await fails(TOKEN, "find_client", { name: "a" }, /ARGUMENT/);
  });
  it("borne le nombre de lignes", async () => { expect((await api(TOKEN, "open_invoices", { limit: 9999 })).length).toBeLessThanOrEqual(50); });
});

describe("écriture : tâches et propositions", () => {
  it("crée une tâche pour l'agent du lien, sans doublon", async () => {
    const a = await api(TOKEN, "create_task", { title: "Relancer le client exemple", dedupe_key: "t1" });
    expect(a.creee).toBe(true);
    expect((await api(TOKEN, "create_task", { title: "Relancer le client exemple", dedupe_key: "t1" })).creee).toBe(false);
    expect((await q("select agent_key from jarvis_tasks where dedupe_key='t1'"))[0].agent_key).toBe("finance");
  });
  it("une proposition d'e-mail ne garde que client_id, objet et corps (aucune adresse fournie)", async () => {
    const r = await api(TOKEN, "propose_action", { kind: "send_email", title: "Relance courtoise", dedupe_key: "mail-1", payload: { client_id: ok, subject: "Votre facture", body: "Bonjour, un petit rappel pour la facture F-A.", to: "pirate@example.invalid" } });
    expect(r.creee).toBe(true);
    const row = (await q("select status, level, payload from jarvis_actions where id=$1", [r.id]))[0];
    expect(row.status).toBe("proposed"); expect(row.level).toBe("L2");
    expect(Object.keys(row.payload).sort()).toEqual(["body", "client_id", "subject"]);
    expect((await api(TOKEN, "propose_action", { kind: "send_email", title: "Relance courtoise", dedupe_key: "mail-1", payload: { client_id: ok, subject: "Votre facture", body: "Bonjour, un petit rappel." } })).creee).toBe(false);
  });
  it("refuse : client réservé, client inconnu, objet/corps invalides, niveau L3, type inconnu", async () => {
    const base = { kind: "send_email", title: "Test", dedupe_key: "zzz", payload: { client_id: ok, subject: "Objet valide", body: "Corps suffisamment long." } };
    await fails(TOKEN, "propose_action", { ...base, payload: { ...base.payload, client_id: reserved } }, /CLIENT_INTERDIT/);
    await fails(TOKEN, "propose_action", { ...base, payload: { ...base.payload, client_id: "00000000-0000-0000-0000-000000000000" } }, /CLIENT_INTERDIT/);
    await fails(TOKEN, "propose_action", { ...base, payload: { ...base.payload, subject: "ab" } }, /subject/);
    await fails(TOKEN, "propose_action", { ...base, payload: { ...base.payload, body: "court" } }, /body/);
    await fails(TOKEN, "propose_action", { ...base, kind: "legal_notice" }, /ACTION_NON_PROPOSABLE/);
    await fails(TOKEN, "propose_action", { ...base, kind: "create_task" }, /ACTION_NON_PROPOSABLE/);
    await fails(TOKEN, "propose_action", { ...base, kind: "inconnue" }, /ACTION_INCONNUE/);
  });
  it("l'envoi réel est réservé au patron : jarvis_mark_sent refuse un autre appelant", async () => {
    const id = (await q("select id from jarvis_actions where dedupe_key='mail-1'"))[0].id;
    await q("select set_config('test.uid','00000000-0000-0000-0000-00000000bbbb',false), set_config('test.email','autre@example.invalid',false)");
    await db.exec("set role authenticated");
    try { await expect(db.query("select jarvis_mark_sent($1,'x')", [id])).rejects.toThrow(/ACCES_REFUSE/); } finally { await db.exec("reset role"); }
    await q("select set_config('test.uid','',false), set_config('test.email','',false)");
  });
  it("les écritures sont tracées sous le nom de l'agent", async () => {
    const rows = await q("select count(*)::int n from audit_log where action like 'agent.%'");
    expect(rows[0].n).toBeGreaterThanOrEqual(2);
  });
});
