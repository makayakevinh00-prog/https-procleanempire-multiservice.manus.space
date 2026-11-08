import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const TOKEN = "a".repeat(64), REVOKED = "b".repeat(64);
const touch = (t: string | null, agent: string | null, op = "overview") => db.query("select agent_presence_touch($1,$2,$3)", [t, agent, op]);

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
  await db.exec(read("supabase/migrations/0030_agent_presence.sql"));
  await db.exec(read("supabase/migrations/0030_agent_presence.sql")); // rejouable
  await db.exec(read("supabase/migrations/0031_presence_known_agents.sql"));
  await q("insert into agent_connectors(agent_key, token_hash) values ('core',$1)", [hash(TOKEN)]);
  await q("insert into agent_connectors(agent_key, token_hash, revoked_at) values ('core',$1, now())", [hash(REVOKED)]);
});

describe("0030 — présence des agents Cowork", () => {
  it("un appel enregistre l'agent annoncé (valide), sinon celui du lien", async () => {
    await touch(TOKEN, "commercial", "overview");
    await touch(TOKEN, "commercial", "find_client");
    await touch(TOKEN, "n_importe_quoi", "overview");
    const rows = await q("select agent_key, calls::int calls, last_op from agent_presence order by agent_key");
    expect(rows).toEqual([{ agent_key: "commercial", calls: 2, last_op: "find_client" }, { agent_key: "core", calls: 1, last_op: "overview" }]);
  });
  it("fonctionne même si la table des agents de la base ne contient pas ces agents (cas de la vraie base)", async () => {
    await q("delete from jarvis_agents where key in ('marketing','studio')");
    await touch(TOKEN, "marketing"); await touch(TOKEN, "studio");
    const k = (await q("select agent_key from agent_presence where agent_key in ('marketing','studio') order by 1")).map((r) => r.agent_key);
    expect(k).toEqual(["marketing", "studio"]);
    await touch(TOKEN, "creative");                                             // clé inconnue du plugin : attribuée au lien
    expect((await q("select count(*)::int n from agent_presence where agent_key = 'creative'"))[0].n).toBe(0);
    await q("delete from agent_presence where agent_key in ('marketing','studio')");
  });
  it("un lien invalide, vide ou révoqué n'enregistre rien", async () => {
    for (const t of [REVOKED, "x".repeat(64), "court", null]) await expect(touch(t, "finance")).rejects.toThrow(/ACCES_REFUSE/);
    expect((await q("select count(*)::int n from agent_presence"))[0].n).toBe(2);
  });
  it("seul le patron peut lire la présence ; le rôle anonyme peut appeler la fonction mais ne lit rien", async () => {
    await db.exec("set role anon");
    try {
      await touch(TOKEN, "finance");
      expect((await db.query("select * from agent_presence")).rows).toHaveLength(0);   // la sécurité de la base ne lui montre aucune ligne
    } finally { await db.exec("reset role"); }
    await q("select set_config('test.email','contact@procleanempire.com',false), set_config('test.uid','00000000-0000-0000-0000-00000000aaaa',false)");
    await db.exec("set role authenticated");
    try { expect((await q("select count(*)::int n from agent_presence"))[0].n).toBe(3); }
    finally { await db.exec("reset role"); }
    await q("select set_config('test.email','autre@exemple.test',false), set_config('test.uid','00000000-0000-0000-0000-00000000bbbb',false)");
    await db.exec("set role authenticated");
    try { expect((await q("select count(*)::int n from agent_presence"))[0].n).toBe(0); }
    finally { await db.exec("reset role"); }
  });
  it("retour arrière propre", async () => {
    await db.exec(read("supabase/migrations/0031_down.sql"));
    await db.exec(read("supabase/migrations/0030_down.sql"));
    expect((await q("select count(*)::int n from pg_proc where proname='agent_presence_touch'"))[0].n).toBe(0);
  });
});
