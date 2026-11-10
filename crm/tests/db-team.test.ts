import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const as = async (email: string, uid: string) => { await db.exec("reset role"); await q("select set_config('test.email',$1,false), set_config('test.uid',$2,false)", [email, uid]); await db.exec("set role authenticated"); };
const admin = () => db.exec("reset role");



const OWNER = "contact@procleanempire.com", COM = "commercial@exemple.test", STA = "stagiaire@exemple.test", RH = "rh@exemple.test", X = "intrus@exemple.test";
const U_OWN = "00000000-0000-0000-0000-00000000aaaa", U_COM = "00000000-0000-0000-0000-0000000000c1", U_STA = "00000000-0000-0000-0000-0000000000c2", U_RH = "00000000-0000-0000-0000-0000000000c3", U_X = "00000000-0000-0000-0000-00000000eee1";
const hash = (c: string) => createHash("sha256").update(c).digest("hex");
let client: string, base: number;

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
  await db.exec(read("supabase/migrations/0029_accountant.sql"));
  await db.exec("alter table invoices disable trigger user; alter table invoice_lines disable trigger user; alter table contracts disable trigger user; delete from contracts");
  await db.exec(read("supabase/migrations/0040_team_access.sql"));
  await db.exec(read("supabase/migrations/0040_team_access.sql")); // rejouable
  client = (await q("insert into clients(name, email) values ('Client Exemple','c@example.invalid') returning id"))[0].id;
  base = (await q("select count(*)::int n from clients"))[0].n;
  await q("insert into invoices(client_id, number, status, issue_date, total_ht, total_vat, total_ttc, sent_at, validated_at) values ($1,'F-2026-001','envoye','2026-11-03',100,20,120,'2026-11-03','2026-11-03')", [client]);
});

const invite = async (email: string, role: string, perms: object, code: string) => { await as(OWNER, U_OWN); await q("select team_invite($1,'Test',$2,$3::jsonb,$4)", [email, role, JSON.stringify(perms), hash(code)]); };
const claim = async (email: string, uid: string, code: string) => { await as(email, uid); return (await q("select team_claim($1) ok", [code]))[0].ok; };

describe("0040 — équipe et accès", () => {
  it("une invitation seule ne donne aucun droit ; le code lie le compte à l'adresse invitée", async () => {
    await invite(COM, "commercial", { clients: "write", devis: "write" }, "CODE000001");
    await as(COM, U_COM);
    expect((await q("select is_team_member() m"))[0].m).toBe(false);
    expect((await q("select team_level('clients') l"))[0].l).toBeNull();
    expect((await q("select count(*)::int n from clients"))[0].n).toBe(0);
    expect(await claim(X, U_X, "CODE000001")).toBe(false);        // autre adresse
    expect(await claim(COM, U_COM, "MAUVAIS")).toBe(false);        // mauvais code
    expect(await claim(COM, U_COM, "CODE000001")).toBe(true);
    expect((await q("select team_level('clients') l"))[0].l).toBe("write");
    expect((await q("select team_level('finances') l"))[0].l).toBeNull();
  });
  it("seul le patron invite, et pas son propre compte", async () => {
    await as(COM, U_COM);
    await expect(db.query("select team_invite('a@b.fr','x','autre','{}'::jsonb,$1)", [hash("CODE000002")])).rejects.toThrow(/ACCES_REFUSE/);
    await as(OWNER, U_OWN);
    await expect(db.query("select team_invite($1,'x','autre','{}'::jsonb,$2)", [OWNER, hash("CODE000002")])).rejects.toThrow(/EMAIL_PATRON/);
    await expect(db.query("select team_invite('pas-un-mail','x','autre','{}'::jsonb,$1)", [hash("CODE000002")])).rejects.toThrow(/EMAIL_INVALIDE/);
  });
  it("le commercial lit et écrit ses sections, rien d'autre", async () => {
    await as(COM, U_COM);
    expect((await q("select count(*)::int n from clients"))[0].n).toBe(base);
    await q("insert into clients(name) values ('Nouveau client')");
    expect((await q("select count(*)::int n from invoices"))[0].n).toBe(0);                // finances non accordées
    await expect(db.query("insert into invoices(client_id, status) values ($1,'brouillon')", [client])).rejects.toThrow();
    await expect(db.query("insert into staff(full_name, role) values ('X','agent')")).rejects.toThrow();
    expect((await q("select count(*)::int n from app_settings"))[0].n).toBe(0);            // jamais la table des paramètres
    expect((await q("select count(*)::int n from team_members"))[0].n).toBe(0);
    await expect(db.query("update team_members set perms = '{\"finances\":\"write\"}'")).resolves.toBeTruthy(); // 0 ligne visible, donc rien de modifié
    expect((await q("select team_level('finances') l"))[0].l).toBeNull();
  });
  it("paramètres de l'entreprise sans secret pour l'équipe, refus pour un tiers", async () => {
    await as(COM, U_COM);
    const s = (await q("select team_settings() s"))[0].s;
    expect(s.company_name).toBeTruthy();
    expect(s).not.toHaveProperty("automation_secret");
    await as(X, U_X);
    await expect(db.query("select team_settings()")).rejects.toThrow(/ACCES_REFUSE/);
  });
  it("lecture seule : on lit mais on ne modifie ni ne supprime", async () => {
    await invite(STA, "stagiaire", { clients: "read" }, "CODE000003");
    expect(await claim(STA, U_STA, "CODE000003")).toBe(true);
    expect((await q("select count(*)::int n from clients"))[0].n).toBeGreaterThan(0);
    await expect(db.query("insert into clients(name) values ('Interdit')")).rejects.toThrow();
    await q("update clients set name = 'Piraté'");
    await q("delete from clients");
    await as(OWNER, U_OWN);
    expect((await q("select count(*)::int n from clients where name = 'Piraté'"))[0].n).toBe(0);
    expect((await q("select count(*)::int n from clients"))[0].n).toBe(base + 1);
  });
  it("le patron change les droits : effet immédiat ; révocation : plus rien", async () => {
    await as(OWNER, U_OWN);
    await q("update team_members set perms = '{\"clients\":\"read\",\"finances\":\"read\"}' where lower(email) = $1", [STA]);
    await as(STA, U_STA);
    expect((await q("select count(*)::int n from invoices"))[0].n).toBe(1);
    await as(OWNER, U_OWN);
    await q("update team_members set revoked_at = now() where lower(email) = $1", [STA]);
    await as(STA, U_STA);
    expect((await q("select count(*)::int n from invoices"))[0].n).toBe(0);
    expect((await q("select my_access() a"))[0].a.kind).toBe("none");
  });
  it("droits RH : peut gérer le personnel, ne lit toujours pas les factures et ne peut pas se donner d'autres droits", async () => {
    await invite(RH, "rh", { rh: "write" }, "CODE000004");
    expect(await claim(RH, U_RH, "CODE000004")).toBe(true);
    await q("insert into staff(full_name, role) values ('Agent Test','agent')");
    expect((await q("select count(*)::int n from invoices"))[0].n).toBe(0);
    expect((await q("select count(*)::int n from clients"))[0].n).toBe(0);
    expect((await q("select my_access() a"))[0].a).toMatchObject({ kind: "team", role: "rh" });
    // l'ancienne porte « comptable » du personnel n'existe plus
    expect((await q("select count(*)::int n from pg_policy where polname like '%comptable_read'"))[0].n).toBe(0);
  });
  it("numérotation : refusée à un tiers, permise à qui travaille sur les devis", async () => {
    await as(X, U_X);
    await expect(db.query("select next_counter('devis-test')")).rejects.toThrow(/ACCES_REFUSE/);
    await as(COM, U_COM);
    expect((await q("select next_counter('devis-test') n"))[0].n).toBe(1);
  });
});
