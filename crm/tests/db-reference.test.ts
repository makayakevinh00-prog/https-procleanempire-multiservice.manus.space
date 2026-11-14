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
const SECRET = "secret-de-test-123", TA = "a".repeat(64);
const PIX = Buffer.from("fake-jpeg-bytes").toString("base64");
const GUIDE = { summary: "Studio 25 m²", rooms: [{ room: "Cuisine", steps: ["Dégraisser la plaque"] }], attention: ["Canapé clair"] };
let client: string, listing: string, A: string, withRef: string, without: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of ["0044_nettoyeurs.sql", "0045_nettoyeurs_suite.sql", "0046_reservations.sql", "0047_nettoyeurs_uber.sql", "0048_nettoyeurs_en_ligne.sql", "0049_vapid.sql", "0050_nettoyeurs_automatismes.sql", "0051_reference_logement.sql"]) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0051_reference_logement.sql")); // rejouable
  await q("update app_settings set automation_secret = $1", [SECRET]);
  client = (await q("insert into clients(name, postal_code, city, address) values ('Propriétaire','95300','Pontoise','1 rue A') returning id"))[0].id;
  listing = (await q("insert into concierge_listings(name, client_id, cleaning_price_ht) values ('Studio Gare', $1, 60) returning id", [client]))[0].id;
  A = (await q("insert into cleaners(full_name, email, siret, departments, status, token_hash) values ('Léa','lea@x.test','12345678900011','{95}','actif',$1) returning id", [hash(TA)]))[0].id;
  const mk = async (l: string | null) => (await q("insert into cleaning_jobs(client_id, listing_id, title, job_date, postal_code, city, price_ht, status, cleaner_id) values ($1,$2,'Ménage',(now() at time zone 'Europe/Paris')::date,'95300','Pontoise',100,'acceptee',$3) returning id", [client, l, A]))[0].id as string;
  withRef = await mk(listing); without = await mk(null);
});

describe("0051 — référence du logement", () => {
  it("seul le patron ajoute ou lit les photos de référence", async () => {
    await fails("select listing_ref_add_photo($1,'image/jpeg',$2)", [listing, PIX], /ACCES_REFUSE/);
    await fails("select listing_ref_photos_b64($1)", [listing], /ACCES_REFUSE/);
    await db.exec("set role anon");
    await fails("select * from listing_ref_photos", [], /permission denied/);
    await fails("select listing_ref_add_photo($1,'image/jpeg',$2)", [listing, PIX], /permission denied/);
    await db.exec("reset role");
  });
  it("patron : formats, poids et nombre contrôlés", async () => {
    await db.exec("create or replace function is_owner() returns boolean language sql as $$ select true $$");
    await fails("select listing_ref_add_photo($1,'image/gif',$2)", [listing, PIX], /format/);
    await fails("select listing_ref_add_photo($1,'image/jpeg','')", [listing], /vide/);
    await fails("select listing_ref_add_photo(gen_random_uuid(),'image/jpeg',$1)", [PIX], /introuvable/);
    for (let i = 0; i < 20; i++) await q("select listing_ref_add_photo($1,'image/jpeg',$2)", [listing, PIX]);
    await fails("select listing_ref_add_photo($1,'image/jpeg',$2)", [listing, PIX], /20 photos/);
    expect((await q("select listing_ref_photos_b64($1) p", [listing]))[0].p).toHaveLength(10);
  });
  it("le guide du logement arrive au nettoyeur et à l'IA ; rien pour un ménage sans logement", async () => {
    await q("update concierge_listings set ref_guide = $1::jsonb, ref_at = now() where id = $2", [JSON.stringify(GUIDE), listing]);
    const jobs = (await q("select cleaner_my_jobs($1) m", [TA]))[0].m.jobs as any[];
    expect(jobs.find((j) => j.id === withRef).guide).toEqual(GUIDE);
    expect(jobs.find((j) => j.id === without).guide).toBeNull();
    expect((await q("select automation_job_context($1,$2) c", [SECRET, withRef]))[0].c.guide).toEqual(GUIDE);
    expect((await q("select automation_job_context($1,$2) c", [SECRET, without]))[0].c.guide).toBeNull();
    expect((await q("select automation_job_ref_photos($1,$2) p", [SECRET, withRef]))[0].p).toHaveLength(4);
    expect((await q("select automation_job_ref_photos($1,$2) p", [SECRET, without]))[0].p).toHaveLength(0);
    await fails("select automation_job_ref_photos('faux',$1)", [withRef], /./);
  });
});
