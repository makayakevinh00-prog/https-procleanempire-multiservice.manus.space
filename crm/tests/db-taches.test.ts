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
const TA = "a".repeat(64), TB = "b".repeat(64);
const PIX = Buffer.from("fake-jpeg-bytes").toString("base64");
let client: string, listing: string, A: string;
const job = async (o: { day?: number; listing?: string | null } = {}) => (await q("insert into cleaning_jobs(client_id, listing_id, title, job_date, postal_code, city, price_ht) values ($1,$2,'Ménage',(now() at time zone 'Europe/Paris')::date + $3::int,'95300','Pontoise',100) returning id", [client, o.listing ?? null, o.day ?? 0]))[0].id as string;
const list = async (j: string) => (await q("select checklist c from cleaning_jobs where id = $1", [j]))[0].c as { label: string; done: boolean }[];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of ["0044_nettoyeurs.sql", "0045_nettoyeurs_suite.sql", "0046_reservations.sql", "0047_nettoyeurs_uber.sql", "0048_nettoyeurs_en_ligne.sql", "0049_vapid.sql", "0050_nettoyeurs_automatismes.sql", "0051_reference_logement.sql", "0052_suivi_linge.sql", "0053_espace_conciergerie.sql", "0054_taches_menage.sql"]) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0054_taches_menage.sql")); // rejouable
  client = (await q("insert into clients(name, postal_code, city, address) values ('Propriétaire','95300','Pontoise','1 rue A') returning id"))[0].id;
  listing = (await q("insert into concierge_listings(name, client_id, cleaning_price_ht, ref_guide) values ('Studio Gare', $1, 60, $2::jsonb) returning id", [client, JSON.stringify({ summary: "Studio", rooms: [{ room: "Cuisine", steps: ["Dégraisser la plaque", "Vider le frigo"] }, { room: "Chambre", steps: ["Refaire le lit"] }], attention: [] })]))[0].id;
  A = (await q("insert into cleaners(full_name, email, siret, departments, status, token_hash, online) values ('Léa','lea@x.test','12345678900011','{95}','actif',$1,true) returning id", [hash(TA)]))[0].id;
  await q("insert into cleaners(full_name, email, siret, departments, status, token_hash) values ('Autre','b@x.test','12345678900011','{95}','actif',$1)", [hash(TB)]);
  await q("update cleaning_jobs set created_at = now() - interval '10 minutes'");
});

describe("0054 — tâches à cocher", () => {
  it("à l'acceptation : liste standard, ou le guide du logement pièce par pièce", async () => {
    const a = await job(), b = await job({ listing });
    expect(await list(a)).toHaveLength(0);                       // pas encore accepté
    await q("update cleaning_jobs set created_at = now() - interval '10 minutes'");
    await q("select cleaner_accept_job($1,$2)", [TA, a]);
    const std = await list(a);
    expect(std).toHaveLength(10); expect(std[0]).toEqual({ label: "Aérer le logement", done: false });
    await q("update cleaning_jobs set window_start = '15:00', window_end = '17:00' where id = $1", [b]);
    await q("select cleaner_accept_job($1,$2)", [TA, b]);
    expect((await list(b)).map((t) => t.label)).toEqual(["Cuisine : Dégraisser la plaque", "Cuisine : Vider le frigo", "Chambre : Refaire le lit"]);
    expect(Object.keys((await q("select cleaner_checklists($1) c", [TA]))[0].c)).toHaveLength(2);
  });
  it("cocher : son ménage seulement, le jour même, tâche existante", async () => {
    const j = (await q("select id from cleaning_jobs where listing_id is not null"))[0].id;
    await q("select cleaner_check_task($1,$2,0,true)", [TA, j]);
    expect((await list(j)).map((t) => t.done)).toEqual([true, false, false]);
    await q("select cleaner_check_task($1,$2,0,false)", [TA, j]);
    expect((await list(j))[0].done).toBe(false);
    await fails("select cleaner_check_task($1,$2,0,true)", [TB, j], /./);
    await fails("select cleaner_check_task($1,$2,9,true)", [TA, j], /tâche inconnue/);
    const demain = await job({ day: 1 });
    await q("update cleaning_jobs set status = 'acceptee', cleaner_id = $1 where id = $2", [A, demain]);
    await fails("select cleaner_check_task($1,$2,0,true)", [TA, demain], /jour du ménage/);
  });
  it("terminer : tout coché, ou un mot d'explication ; la liste standard se règle", async () => {
    const j = (await q("select id from cleaning_jobs where listing_id is not null"))[0].id;
    await q("select cleaner_add_photo($1,$2,'avant','image/jpeg',$3)", [TA, j, PIX]); await q("select cleaner_add_photo($1,$2,'apres','image/jpeg',$3)", [TA, j, PIX]);
    await q("select cleaner_check_task($1,$2,0,true)", [TA, j]);
    await fails("select cleaner_finish_job($1,$2,null)", [TA, j], /tâches non cochées/);
    await q("select cleaner_finish_job($1,$2,'Frigo déjà vide, lit sans draps propres sur place')", [TA, j]);
    expect((await q("select status from cleaning_jobs where id = $1", [j]))[0].status).toBe("a_verifier");
    const k = (await q("select id from cleaning_jobs where listing_id is null and status = 'acceptee' and job_date = (now() at time zone 'Europe/Paris')::date"))[0].id;
    await q("select cleaner_add_photo($1,$2,'avant','image/jpeg',$3)", [TA, k, PIX]); await q("select cleaner_add_photo($1,$2,'apres','image/jpeg',$3)", [TA, k, PIX]);
    for (let i = 0; i < 10; i++) await q("select cleaner_check_task($1,$2,$3,true)", [TA, k, i]);
    await q("select cleaner_finish_job($1,$2,null)", [TA, k]);
    expect((await q("select status from cleaning_jobs where id = $1", [k]))[0].status).toBe("a_verifier");
    await fails("select cleaner_check_task($1,$2,0,false)", [TA, k], /plus à faire/);
    await q("update marketplace_settings set default_checklist = array['Une seule tâche', ' ']");
    const n = await job();
    await q("update cleaning_jobs set status = 'acceptee', cleaner_id = $1 where id = $2", [A, n]);
    expect((await list(n)).map((t) => t.label)).toEqual(["Une seule tâche"]);
  });
});
