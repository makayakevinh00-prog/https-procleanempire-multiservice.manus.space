import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const OK = ["https://claude.ai/api/mcp/auth_callback"];

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
  await db.exec(read("supabase/migrations/0024_agent_connector.sql"));
  await db.exec(read("supabase/migrations/0027_oauth.sql"));
});

describe("inscription du client OAuth", () => {
  it("accepte Claude et localhost, refuse le reste", async () => {
    const id = (await q("select oauth_register_client('Claude', $1) id", [OK]))[0].id;
    expect(id).toMatch(/^cl_[0-9a-f]{32}$/);
    await q("select oauth_register_client('CLI', $1)", [["http://localhost:6274/cb"]]);
    for (const bad of [["https://evil.example/cb"], ["https://claude.ai.evil.example/cb"], ["http://claude.ai/cb"], []]) {
      await expect(db.query("select oauth_register_client('x', $1)", [bad])).rejects.toThrow(/INVALID_REDIRECT_URI/);
    }
  });
  it("ne laisse à l'anonyme aucun accès direct aux tables", async () => {
    await db.exec("set role anon");
    try {
      await expect(db.query("select * from oauth_codes")).rejects.toThrow(/permission denied/);
      await expect(db.query("select * from oauth_clients")).rejects.toThrow(/permission denied/);
    } finally { await db.exec("reset role"); }
  });
});

describe("échange du code", () => {
  let client: string;
  const put = async (hash: string, token = "t".repeat(64), mins = 10) =>
    q("insert into oauth_codes(code_hash, client_id, redirect_uri, code_challenge, access_token, expires_at) values ($1,$2,$3,'CHAL',$4, now() + make_interval(mins => $5))", [hash, client, OK[0], token, mins]);
  beforeAll(async () => { client = (await q("select oauth_register_client('Claude', $1) id", [OK]))[0].id; });

  it("rend le jeton une seule fois", async () => {
    await put("h1", "a".repeat(64));
    expect((await q("select oauth_exchange('h1',$1,$2,'CHAL') t", [client, OK[0]]))[0].t).toBe("a".repeat(64));
    expect((await q("select oauth_exchange('h1',$1,$2,'CHAL') t", [client, OK[0]]))[0].t).toBeNull();
  });
  it("refuse un mauvais verifier, un autre client ou une autre adresse — et brûle le code", async () => {
    for (const [c, r, ch] of [[client, OK[0], "AUTRE"], ["cl_autre", OK[0], "CHAL"], [client, "https://claude.ai/autre", "CHAL"]] as const) {
      await put("h2");
      expect((await q("select oauth_exchange('h2',$1,$2,$3) t", [c, r, ch]))[0].t).toBeNull();
      expect((await q("select count(*)::int n from oauth_codes where code_hash='h2'"))[0].n).toBe(0);
    }
  });
  it("refuse un code expiré ou inconnu", async () => {
    await put("h3", "t".repeat(64), -1);
    expect((await q("select oauth_exchange('h3',$1,$2,'CHAL') t", [client, OK[0]]))[0].t).toBeNull();
    expect((await q("select oauth_exchange('zzz',$1,$2,'CHAL') t", [client, OK[0]]))[0].t).toBeNull();
  });
  it("le jeton rendu ouvre agent_api comme un lien d'agent (même empreinte)", async () => {
    const { createHash } = await import("node:crypto");
    const token = "c".repeat(64);
    await q("insert into agent_connectors(agent_key, token_hash) values ('core',$1)", [createHash("sha256").update(token).digest("hex")]);
    await put("h4", token);
    const t = (await q("select oauth_exchange('h4',$1,$2,'CHAL') t", [client, OK[0]]))[0].t;
    expect((await q("select agent_api($1,'overview','{}'::jsonb) r", [t]))[0].r.date).toBeTruthy();
  });
});
