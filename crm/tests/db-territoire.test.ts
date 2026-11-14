import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const data = async (dept: string) => (await q("select territory_data($1) r", [dept]))[0].r as any;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x >= "0044").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0059_territoire.sql")); // rejouable
  await q(`insert into territory_targets(siret, siren, name, dept, city, postal_code, lat, lng, sector, headcount) values
    ('11111111100011','111111111','Alpha Bureaux','95','Pontoise','95300',49.05,2.1,'bureaux','12'),
    ('22222222200011','222222222','Beta Santé','95','Cergy','95000',49.03,2.07,'sante','21'),
    ('33333333300011','333333333','Gamma Commerce','95','Cergy','95000',49.03,2.06,'commerce','11'),
    ('44444444400011','444444444','Delta Écartée','95','Osny','95520',49.06,2.06,'bureaux','11'),
    ('55555555500011','555555555','Epsilon 93','93','Saint-Denis','93200',48.93,2.35,'bureaux','12')`);
  await q("update territory_targets set excluded = true where siret = '44444444400011'");
});

describe("0059 — territoire commercial", () => {
  it("quatre zones dans l'ordre, seule la première est ouverte", async () => {
    const z = await q("select code, status from territory_zones order by rank");
    expect(z.map((x: any) => x.code)).toEqual(["95", "93", "94", "75"]);
    expect(z.map((x: any) => x.status)).toEqual(["active", "verrouillee", "verrouillee", "verrouillee"]);
  });
  it("sans client : tout est à prospecter, les écartés ne comptent pas, les autres départements non plus", async () => {
    const d = await data("95");
    expect(d.total).toBe(3); expect(d.clients).toBe(0); expect(d.en_cours).toBe(0); expect(d.excluded).toBe(1);
    expect(d.targets.length).toBe(3);
    expect((await data("93")).total).toBe(1);
  });
  it("un prospect passe en cours, un client signé passe en vert", async () => {
    await q("insert into clients(name, siren, status, pipeline, postal_code, city) values ('Alpha Bureaux','111111111','prospect','a_contacter','95300','Pontoise')");
    let d = await data("95");
    expect(d.en_cours).toBe(1); expect(d.clients).toBe(0);
    await q("update clients set status = 'actif', pipeline = 'client_actif' where siren = '111111111'");
    d = await data("95");
    expect(d.clients).toBe(1); expect(d.en_cours).toBe(0);
    const row = d.targets.find((t: any[]) => t[0] === "11111111100011");
    expect(row[7]).toBe("client"); expect(row[8]).toBeTruthy();
    expect(d.targets.find((t: any[]) => t[0] === "22222222200011")[7]).toBe("cible");
  });
});
