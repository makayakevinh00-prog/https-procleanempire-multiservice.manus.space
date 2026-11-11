import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const fails = (sql: string, params: any[], re: RegExp) => expect(db.query(sql, params)).rejects.toThrow(re);
const iso = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const ok = (o: object = {}) => JSON.stringify({ name: "Marie Durand", email: "marie@exemple.test", phone: "0600000000", address: "12 rue de la Paix", postal_code: "95300", city: "Pontoise", job_date: iso(3), kind: "t2", ...o });

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of ["0044_nettoyeurs.sql", "0045_nettoyeurs_suite.sql", "0046_reservations.sql"]) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0046_reservations.sql")); // rejouable
});

describe("0046 — réservation d'un ménage", () => {
  it("le client voit les tarifs ; le prix enregistré vient de la base, pas du navigateur", async () => {
    expect((await q("select booking_prices() p"))[0].p).toMatchObject({ studio: 45, t2: 60, t3: 75, maison: 95 });
    expect((await q("select book_cleaning($1::jsonb) r", [ok({ price_ht: 1 })]))[0].r).toBe("ok");
    expect((await q("select price_ht::float p, status, kind from cleaning_bookings"))[0]).toEqual({ p: 60, status: "nouvelle", kind: "t2" });
  });
  it("refuse les demandes incomplètes, passées, trop lointaines ou d'un type inconnu", async () => {
    for (const bad of [{ name: "X" }, { email: "pas-un-mail" }, { postal_code: "953" }, { address: "12" }, { job_date: iso(0) }, { job_date: iso(-2) }, { job_date: iso(120) }, { job_date: "demain" }, { kind: "chateau" }])
      await fails("select book_cleaning($1::jsonb)", [ok(bad)], /ARGUMENT/);
  });
  it("limite les abus : 3 demandes par jour et par e-mail", async () => {
    await q("select book_cleaning($1::jsonb)", [ok({ email: "abus@exemple.test" })]); await q("select book_cleaning($1::jsonb)", [ok({ email: "abus@exemple.test" })]); await q("select book_cleaning($1::jsonb)", [ok({ email: "abus@exemple.test" })]);
    await fails("select book_cleaning($1::jsonb)", [ok({ email: "ABUS@exemple.test" })], /plusieurs demandes/);
  });
  it("aucune lecture directe des réservations par le public", async () => {
    await db.exec("set role anon");
    expect((await q("select count(*)::int n from cleaning_bookings"))[0].n).toBe(0);
    await db.exec("reset role");
  });
});
