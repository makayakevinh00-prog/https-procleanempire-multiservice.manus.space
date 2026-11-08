import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
let client: string, siteZ: string, siteFlat: string;

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
  await db.exec(read("supabase/migrations/0028_site_zones.sql"));
  await db.exec(read("supabase/migrations/0028_site_zones.sql")); // rejouable
  client = (await q("insert into clients(name, email, city) values ('Client Exemple','x@example.invalid','Lille') returning id"))[0].id;
  siteZ = (await q("insert into sites(client_id, name, checklist, zones, specifics, frequency) values ($1,'Maison test','[\"Vider les poubelles\"]'::jsonb,$2::jsonb,'{Parquet fragile}','2 fois / semaine') returning id",
    [client, JSON.stringify([{ name: "Salon", tasks: ["Aspirer", "Dépoussiérer"], attention: ["Parquet fragile"] }, { name: "Cuisine", tasks: ["Dégraisser"], attention: [] }])]))[0].id;
  siteFlat = (await q("insert into sites(client_id, name, checklist) values ($1,'Bureau test','[\"Vider les poubelles\",\"Aspirer\"]'::jsonb) returning id", [client]))[0].id;
});

const mission = async (site: string, checklist = "[]") =>
  (await q("insert into interventions(client_id, site_id, title, scheduled_date, checklist) values ($1,$2,'Passage','2026-11-10',$3::jsonb) returning checklist", [client, site, checklist]))[0].checklist as any[];

describe("0028 — zones d'un site", () => {
  it("une mission d'un site avec zones reçoit une check-list par pièce, dans l'ordre", async () => {
    expect(await mission(siteZ)).toEqual([
      { label: "Aspirer", done: false, room: "Salon" }, { label: "Dépoussiérer", done: false, room: "Salon" }, { label: "Dégraisser", done: false, room: "Cuisine" }
    ]);
  });
  it("un site sans zones garde la check-list à plat (comportement inchangé)", async () => {
    expect(await mission(siteFlat)).toEqual([{ label: "Vider les poubelles", done: false }, { label: "Aspirer", done: false }]);
  });
  it("une check-list saisie à la main n'est jamais écrasée", async () => {
    expect(await mission(siteZ, JSON.stringify([{ label: "Point manuel", done: false }]))).toEqual([{ label: "Point manuel", done: false }]);
  });
  it("zones doit être une liste", async () => {
    await expect(db.query("update sites set zones = '{\"a\":1}'::jsonb where id = $1", [siteZ])).rejects.toThrow();
  });
  it("retour arrière propre", async () => {
    await db.exec(read("supabase/migrations/0028_down.sql"));
    expect((await q("select count(*)::int n from information_schema.columns where table_name='sites' and column_name in ('zones','specifics','frequency')"))[0].n).toBe(0);
    expect(await mission(siteFlat)).toEqual([{ label: "Vider les poubelles", done: false }, { label: "Aspirer", done: false }]);
  });
});
