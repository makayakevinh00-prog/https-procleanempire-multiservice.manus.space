import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const fails = (sql: string, params: any[], re: RegExp) => expect(db.query(sql, params)).rejects.toThrow(re);
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const SECRET = "secret-de-test-123", LINK = "a".repeat(64), D1 = "1".repeat(64), D2 = "2".repeat(64);
const MAIL = "multi@x.test";
let cleaner: string, agent: string, courier: string, client: string;
const start = async (email: string, code: string) => (await q("select automation_login_start($1,$2,$3) r", [SECRET, email, hash(code)]))[0].r;
const verify = async (email: string, code: string) => (await q("select automation_login_verify($1,$2,$3) r", [SECRET, email, hash(code)]))[0].r as any[] | null;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x >= "0044" && x <= "0058_identification.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0058_identification.sql")); // rejouable
  await q("update app_settings set automation_secret = $1", [SECRET]);
  cleaner = (await q("insert into cleaners(full_name, email, siret, departments, status, token_hash) values ('Léa Multi',$1,'12345678900011','{95}','actif',$2) returning id", [MAIL.toUpperCase(), hash(LINK)]))[0].id;
  agent = (await q("insert into staff(full_name, email, active) values ('Léa Salariée',$1,true) returning id", [MAIL]))[0].id;
  courier = (await q("insert into linen_couriers(full_name, email) values ('Sam Linge','sam@x.test') returning id"))[0].id;
  client = (await q("insert into clients(name, email, postal_code, city) values ('Conciergerie Un','conc@x.test','95300','Pontoise') returning id"))[0].id;
  await q("insert into partner_access(client_id) values ($1)", [client]);
});

describe("0058 — connexion unique par code", () => {
  it("adresse inconnue : aucun code enregistré ; adresse connue : code envoyé, 5 par heure au plus", async () => {
    expect(await start("inconnu@x.test", "111111")).toBe("aucun");
    expect((await q("select count(*)::int n from login_codes"))[0].n).toBe(0);
    for (let i = 0; i < 5; i++) expect(await start(MAIL, "00000" + i)).toBe("envoye");
    expect(await start(MAIL, "999999")).toBe("trop");
    await fails("select automation_login_start('faux',$1,$2)", [MAIL, hash("1")], /./);
  });
  it("mauvais code refusé, 5 essais au plus ; bon code : tous ses espaces, et le code ne resert pas", async () => {
    expect(await verify(MAIL, "123456")).toBeNull();
    const roles = await verify(MAIL, "000004");                         // le dernier code envoyé
    expect(roles!.map((r) => r.kind).sort()).toEqual(["agent", "nettoyeur"]);
    expect(await verify(MAIL, "000004")).toBeNull();
    await q("delete from login_codes"); await start("sam@x.test", "424242");
    for (let i = 0; i < 5; i++) expect(await verify("sam@x.test", "000000")).toBeNull();
    expect(await verify("sam@x.test", "424242")).toBeNull();              // bloqué après 5 essais
    await q("delete from login_codes"); await start("conc@x.test", "777777");
    expect((await verify("CONC@x.test", "777777"))!.map((r) => r.kind)).toEqual(["partenaire"]);
    await q("delete from login_codes"); await start(MAIL, "555555");
    await q("update login_codes set expires_at = now() - interval '1 minute'");
    expect(await verify(MAIL, "555555")).toBeNull();                      // code expiré
  });
  it("jeton d'appareil : il ouvre l'espace, le lien privé continue de marcher, 5 appareils au plus", async () => {
    await q("select automation_issue_token($1,'nettoyeur',$2,$3)", [SECRET, cleaner, hash(D1)]);
    expect((await q("select cleaner_overview($1) o", [D1]))[0].o.name).toBe("Léa Multi");
    expect((await q("select cleaner_overview($1) o", [LINK]))[0].o.name).toBe("Léa Multi");
    await q("select automation_issue_token($1,'agent',$2,$3)", [SECRET, agent, hash(D2)]);
    expect((await q("select agent_missions($1) p", [D2]))[0].p.agent).toBe("Léa Salariée");
    await fails("select cleaner_overview($1)", [D2], /ACCES_REFUSE/);     // un jeton d'agent n'ouvre pas l'espace nettoyeur
    await q("select automation_issue_token($1,'linge',$2,$3)", [SECRET, courier, hash("3".repeat(64))]);
    expect((await q("select courier_runs($1) r", ["3".repeat(64)]))[0].r.name).toBe("Sam Linge");
    await q("select automation_issue_token($1,'partenaire',$2,$3)", [SECRET, client, hash("4".repeat(64))]);
    expect((await q("select partner_overview($1) o", ["4".repeat(64)]))[0].o.name).toBe("Conciergerie Un");
    for (let i = 0; i < 6; i++) await q("select automation_issue_token($1,'nettoyeur',$2,$3)", [SECRET, cleaner, hash(`${i}`.repeat(64).replace(/./g, (c, k) => (k < 2 ? "e" : c)))]);
    expect((await q("select count(*)::int n from access_tokens where kind = 'nettoyeur'"))[0].n).toBe(5);
    await fails("select automation_issue_token($1,'patron',$2,$3)", [SECRET, cleaner, hash("x")], /jeton invalide/);
  });
  it("déconnexion, suspension ou nouveau lien : les appareils sont coupés", async () => {
    await q("select automation_issue_token($1,'nettoyeur',$2,$3)", [SECRET, cleaner, hash(D1)]);
    await q("select automation_revoke_tokens($1,$2)", [SECRET, [hash(D1)]]);
    await fails("select cleaner_overview($1)", [D1], /ACCES_REFUSE/);
    await q("select automation_issue_token($1,'nettoyeur',$2,$3)", [SECRET, cleaner, hash(D1)]);
    await q("update cleaners set token_hash = $1 where id = $2", [hash("9".repeat(64)), cleaner]);       // nouveau lien
    await fails("select cleaner_overview($1)", [D1], /ACCES_REFUSE/);
    await q("update staff set active = false where id = $1", [agent]);
    expect((await q("select count(*)::int n from access_tokens where kind = 'agent'"))[0].n).toBe(0);
    await q("update partner_access set active = false where client_id = $1", [client]);
    await fails("select partner_overview($1)", ["4".repeat(64)], /ACCES_REFUSE/);
  });
  it("rien n'est lisible ni appelable sans le secret", async () => {
    await db.exec("set role anon");
    await fails("select * from login_codes", [], /permission denied/);
    await fails("select * from access_tokens", [], /permission denied/);
    await fails("select login_roles('multi@x.test')", [], /permission denied/);
    await db.exec("reset role");
    await fails("select automation_login_verify('faux',$1,$2)", [MAIL, hash("1")], /./);
  });
});
