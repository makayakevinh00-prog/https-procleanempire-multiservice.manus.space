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
const OWNER = "contact@procleanempire.com", ACC = "comptable@cabinet.test", U_ACC = "00000000-0000-0000-0000-00000000acc1", U_OWN = "00000000-0000-0000-0000-00000000aaaa", U_X = "00000000-0000-0000-0000-00000000eee1";
const hash = (c: string) => createHash("sha256").update(c).digest("hex");
const CODE = "A1B2C3D4E5";
let inv: string;

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
  await db.exec(read("supabase/migrations/0029_accountant.sql")); // rejouable
  await db.exec("alter table invoices disable trigger user; alter table invoice_lines disable trigger user; alter table contracts disable trigger user; delete from contracts");
  const c = (await q("insert into clients(name, email, phone, address) values ('Client Exemple','secret@example.invalid','0600000000','1 rue Secrète') returning id"))[0].id;
  inv = (await q("insert into invoices(client_id, number, status, issue_date, due_date, total_ht, total_vat, total_ttc, sent_at, validated_at) values ($1,'F-2026-001','envoye','2026-11-03','2026-11-18',100,20,120,'2026-11-03','2026-11-03') returning id", [c]))[0].id;
  await q("insert into invoice_lines(invoice_id, description, quantity, unit_price_ht, vat_rate) values ($1,'Ménage',2,50,20)", [inv]);
  await q("insert into payments(source, amount, received_at, counterparty, label) values ('manuel', 120, '2026-11-05T10:00:00Z', 'Client Exemple', 'virement')");
  await q("insert into invoices(client_id, number, status, total_ttc) values ($1, null, 'brouillon', 50)", [c]);
});

describe("0029 — accès comptable en lecture seule", () => {
  it("avant toute invitation, personne d'autre que le patron n'a accès", async () => {
    await as(ACC, U_ACC);
    expect((await q("select is_accountant() a"))[0].a).toBe(false);
    await expect(db.query("select compta_data('2026-11')")).rejects.toThrow(/ACCES_REFUSE/);
    await as(OWNER, U_OWN);
    expect((await q("select compta_data('2026-11') d"))[0].d.invoices).toHaveLength(1);
  });
  it("seul le patron invite ; le comptable ne peut pas s'inviter lui-même", async () => {
    await as(ACC, U_ACC);
    await expect(db.query("select accountant_invite($1,'x',$2)", [ACC, hash(CODE)])).rejects.toThrow(/ACCES_REFUSE/);
    await as(OWNER, U_OWN);
    await expect(db.query("select accountant_invite('pas-un-mail','x',$1)", [hash(CODE)])).rejects.toThrow(/EMAIL_INVALIDE/);
    await expect(db.query("select accountant_invite($1,'x','court')", [ACC])).rejects.toThrow(/CODE_INVALIDE/);
    await q("select accountant_invite($1,'Cabinet Test',$2)", [ACC, hash(CODE)]);
  });
  it("une invitation seule ne donne rien : il faut réclamer avec le bon code, depuis la bonne adresse", async () => {
    await as(ACC, U_ACC);
    expect((await q("select is_accountant() a"))[0].a).toBe(false);
    await as("autre@exemple.test", U_X);
    expect((await q("select accountant_claim($1) ok", [CODE]))[0].ok).toBe(false);             // mauvaise adresse
    await as(ACC, U_ACC);
    expect((await q("select accountant_claim('mauvais') ok"))[0].ok).toBe(false);               // mauvais code
    expect((await q("select is_accountant() a"))[0].a).toBe(false);
  });
  it("5 mauvais essais verrouillent l'invitation, même avec le bon code ensuite", async () => {
    await as(ACC, U_ACC);
    for (let i = 0; i < 5; i++) await q("select accountant_claim('faux') ok");
    expect((await q("select accountant_claim($1) ok", [CODE]))[0].ok).toBe(false);
    await as(OWNER, U_OWN);
    await q("select accountant_invite($1,'Cabinet Test',$2)", [ACC, hash(CODE)]);               // le patron ré-invite : nouveau code
  });
  it("le bon code, depuis la bonne adresse, active l'accès (une seule fois)", async () => {
    await as(ACC, U_ACC);
    expect((await q("select accountant_claim($1) ok", [CODE]))[0].ok).toBe(true);
    expect((await q("select is_accountant() a"))[0].a).toBe(true);
    expect((await q("select accountant_claim($1) ok", [CODE]))[0].ok).toBe(false);
  });
  it("le comptable lit les chiffres du mois sans aucune coordonnée de client, sans identifiants de factures, sans brouillons", async () => {
    await as(ACC, U_ACC);
    const d = (await q("select compta_data('2026-11') d"))[0].d;
    expect(d.invoices).toHaveLength(1);
    expect(d.invoices[0]).toMatchObject({ number: "F-2026-001", client: "Client Exemple", id: null });
    expect(JSON.stringify(d)).not.toMatch(/secret@example|0600000000|Secrète/);
    expect(d.vat).toEqual([{ rate: 20, base: 100, vat: 20 }]);
    expect(d.payments).toHaveLength(1);
    expect(d.numbers).toEqual(["F-2026-001"]);
    await expect(db.query("select compta_data('2026-13')")).rejects.toThrow(/MOIS_INVALIDE/);
  });
  it("le comptable n'a AUCUN accès direct aux tables (clients, factures, missions, JARVIS, réglages)", async () => {
    await as(ACC, U_ACC);
    for (const t of ["clients", "invoices", "interventions", "payments", "contracts", "app_settings", "accountants"]) {
      const rows = await q(`select count(*)::int n from ${t}`).catch(() => [{ n: 0 }]);
      expect(rows[0].n, t).toBe(0);
    }
    await expect(db.query("insert into clients(name) values ('pirate')")).rejects.toThrow();
    expect((await db.query("update invoices set status='paye'")).affectedRows ?? 0).toBe(0);   // la sécurité de la base filtre : aucune ligne touchée
    await admin();
    expect((await q("select status from invoices where number='F-2026-001'"))[0].status).toBe("envoye");
    await as(ACC, U_ACC);
    await expect(db.query("select accountant_invite('x@y.fr','x',$1)", [hash("z".repeat(10))])).rejects.toThrow(/ACCES_REFUSE/);
  });
  it("la révocation coupe l'accès immédiatement ; une autre identité avec la même adresse n'y accède pas", async () => {
    await as("comptable@cabinet.test", U_X);
    expect((await q("select is_accountant() a"))[0].a).toBe(false);                             // même adresse, autre identifiant : refusé
    await as(OWNER, U_OWN);
    await q("update accountants set revoked_at = now() where lower(email)=$1", [ACC]);
    await as(ACC, U_ACC);
    expect((await q("select is_accountant() a"))[0].a).toBe(false);
    await expect(db.query("select compta_data('2026-11')")).rejects.toThrow(/ACCES_REFUSE/);
  });
  it("retour arrière propre", async () => {
    await admin(); await db.exec(read("supabase/migrations/0029_down.sql"));
    expect((await q("select count(*)::int n from pg_proc where proname in ('compta_data','is_accountant','accountant_claim','accountant_invite')"))[0].n).toBe(0);
  });
});
