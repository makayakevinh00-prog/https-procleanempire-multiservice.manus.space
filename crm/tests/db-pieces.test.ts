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
const SECRET = "secret-de-test-123", TA = "a".repeat(64), P1 = "c".repeat(64);
const PIX = Buffer.from("fake-jpeg-bytes").toString("base64");
let client: string, listing: string, A: string;
const accepted = async (l: string | null) => {
  const id = (await q("insert into cleaning_jobs(client_id, listing_id, title, job_date, postal_code, city, price_ht) values ($1,$2,'Ménage',(now() at time zone 'Europe/Paris')::date,'95300','Pontoise',100) returning id", [client, l]))[0].id as string;
  await q("update cleaning_jobs set status = 'acceptee', cleaner_id = $1, checklist = '[]'::jsonb where id = $2", [A, id]);
  await q("update cleaning_jobs set checklist = '[]'::jsonb where id = $1", [id]);          // les tâches sont testées ailleurs
  return id;
};
const rooms = async (j: string) => (await q("select rooms r from cleaning_jobs where id = $1", [j]))[0].r as string[];
const photo = (j: string, kind: string, room: string | null) => q("select cleaner_add_photo($1,$2,$3,'image/jpeg',$4,$5)", [TA, j, kind, PIX, room]);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x >= "0044" && x <= "0056_photos_par_piece.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0056_photos_par_piece.sql")); // rejouable
  await q("update app_settings set automation_secret = $1", [SECRET]);
  await q("update marketplace_settings set spot_check_every = 0, trust_jobs = 0, rules_min_minutes = 0, rules_min_photos = 1");
  client = (await q("insert into clients(name, postal_code, city, address) values ('Propriétaire','95300','Pontoise','1 rue A') returning id"))[0].id;
  await q("insert into partner_access(client_id, token_hash) values ($1,$2)", [client, hash(P1)]);
  listing = (await q("insert into concierge_listings(name, client_id, cleaning_price_ht, ref_guide) values ('T2 Centre', $1, 60, $2::jsonb) returning id", [client, JSON.stringify({ summary: "", rooms: [{ room: "Cuisine", steps: ["Plaque"] }, { room: "Chambre", steps: ["Lit"] }], attention: [] })]))[0].id;
  A = (await q("insert into cleaners(full_name, email, siret, departments, status, token_hash) values ('Léa','lea@x.test','12345678900011','{95}','actif',$1) returning id", [hash(TA)]))[0].id;
});

describe("0056 — photos pièce par pièce", () => {
  it("les pièces viennent du logement : sa liste, sinon son guide, sinon la liste standard", async () => {
    expect(await rooms(await accepted(null))).toEqual(["Cuisine", "Salon / séjour", "Chambre", "Salle de bain / douche", "WC"]);
    expect(await rooms(await accepted(listing))).toEqual(["Cuisine", "Chambre"]);
    await q("select partner_set_rooms($1,$2,$3)", [P1, listing, ["Chambre 1", "Chambre 2", " ", "Douche", "Chambre 1"]]);
    expect(await rooms(await accepted(listing))).toEqual(["Chambre 1", "Chambre 2", "Douche"]);
    await fails("select partner_set_rooms($1,$2,$3)", [P1, listing, Array.from({ length: 21 }, (_, i) => `P${i}`)], /20 pièces/);
    await q("delete from cleaning_jobs");
  });
  it("chaque photo porte sa pièce ; une pièce inconnue est refusée ; le nettoyeur voit ce qui manque", async () => {
    const j = await accepted(listing);
    await fails("select cleaner_add_photo($1,$2,'avant','image/jpeg',$3,'Garage')", [TA, j, PIX], /pièce inconnue/);
    await photo(j, "avant", "Chambre 1"); await photo(j, "apres", "Chambre 1"); await photo(j, "avant", "Douche"); await photo(j, "avant", null);
    const r = (await q("select cleaner_job_rooms($1) r", [TA]))[0].r[j] as any[];
    expect(r).toEqual([{ room: "Chambre 1", avant: 1, apres: 1 }, { room: "Chambre 2", avant: 0, apres: 0 }, { room: "Douche", avant: 1, apres: 0 }]);
  });
  it("terminer : chaque pièce photographiée avant et après, ou un mot d'explication", async () => {
    const j = (await q("select id from cleaning_jobs limit 1"))[0].id;
    await fails("select cleaner_finish_job($1,$2,null)", [TA, j], /il manque des photos : Chambre 2 \(avant et après\), Douche \(après\)/);
    await photo(j, "apres", "Douche"); await photo(j, "avant", "Chambre 2"); await photo(j, "apres", "Chambre 2");
    await q("select cleaner_finish_job($1,$2,null)", [TA, j]);
    expect((await q("select automation_rules_validate($1,$2) r", [SECRET, j]))[0].r).toMatchObject({ validated: true });
    const k = await accepted(listing);
    await photo(k, "avant", "Chambre 1"); await photo(k, "apres", "Chambre 1");
    await q("select cleaner_finish_job($1,$2,'Chambre 2 fermée à clé, douche en travaux')", [TA, k]);
    const r = (await q("select automation_rules_validate($1,$2) r", [SECRET, k]))[0].r;
    expect(r.validated).toBe(false); expect(r.reason).toMatch(/photo manquante : Chambre 2 \(avant et après\), Douche \(avant et après\)/);
  });
  it("l'IA reçoit chaque photo avec sa pièce", async () => {
    const j = (await q("select id from cleaning_jobs where status = 'validee' limit 1"))[0].id;
    const p = (await q("select automation_job_photos($1,$2,'apres') p", [SECRET, j]))[0].p as any[];
    expect(p.map((x) => x.room).sort()).toEqual(["Chambre 1", "Chambre 2", "Douche"]);
  });
});
