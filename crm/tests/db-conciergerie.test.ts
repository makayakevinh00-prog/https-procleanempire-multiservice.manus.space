import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
let client: string, listing: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email', coalesce(current_setting('test.email', true), '')) $$;
    create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon;
    alter default privileges in schema public grant all on tables to authenticated, anon;
    alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  await db.exec(read("supabase/migrations/0001_schema.sql"));
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((n) => /^000[2-9]|^00[1-3]\d/.test(n) && !n.endsWith("_down.sql") && n <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  client = (await q("insert into clients(name, email) values ('Propriétaire Test','p@example.invalid') returning id"))[0].id;
  listing = (await q("insert into concierge_listings(name, client_id, cleaning_price_ht) values ('Studio Test',$1,55) returning id", [client]))[0].id;
});

describe("migration conciergerie", () => {
  it("crée les tables, avec les trois automatisations activées par défaut", async () => {
    expect((await q("select key, enabled from concierge_automations order by key")).map((r) => [r.key, r.enabled])).toEqual([["facturation", true], ["menages", true], ["messages", true]]);
  });
  it("un séjour est unique par logement et par UID, et le départ ne précède pas l'arrivée", async () => {
    await q("insert into concierge_stays(listing_id, uid, check_in, check_out) values ($1,'u1','2026-11-12','2026-11-15')", [listing]);
    await expect(db.query("insert into concierge_stays(listing_id, uid, check_in, check_out) values ($1,'u1','2026-11-20','2026-11-22')", [listing])).rejects.toThrow();
    await expect(db.query("insert into concierge_stays(listing_id, uid, check_in, check_out) values ($1,'u2','2026-11-20','2026-11-19')", [listing])).rejects.toThrow();
  });
  it("le ménage créé par l'automatisation est accepté par les règles du planning, et sa clé empêche les doublons", async () => {
    const row = `insert into interventions(client_id, title, scheduled_date, start_time, duration_hours, quantity, unit_price_ht, vat_rate, billable, source_key, stage, activity)
                 values ($1,'Ménage — Studio Test','2026-11-15','11:00',2,1,55,20,true,$2,'planifiee','nettoyage_airbnb') returning stage, status`;
    const r = (await q(row, [client, "conc:test-1"]))[0];
    expect(r.stage).toBe("planifiee");
    await expect(db.query(row, [client, "conc:test-1"])).rejects.toThrow();
  });
  it("le catalogue accepte la catégorie conciergerie et refuse une catégorie inconnue", async () => {
    await q("insert into services(code, name, unit_price_ht, category) values ('T-1','Test', 10, 'conciergerie')");
    await expect(db.query("insert into services(code, name, unit_price_ht, category) values ('T-2','Test', 10, 'inconnue')")).rejects.toThrow();
  });
  it("seul le patron accède aux données de la conciergerie (RLS)", async () => {
    for (const t of ["concierge_listings", "concierge_stays", "concierge_revenues", "concierge_automations"]) {
      expect((await q("select relrowsecurity r from pg_class where relname = $1", [t]))[0].r, t).toBe(true);
      expect((await q("select count(*)::int n from pg_policies where tablename = $1 and policyname = $2", [t, `${t}_owner`]))[0].n, t).toBe(1);
    }
  });
});
