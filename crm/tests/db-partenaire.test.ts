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
const TA = "a".repeat(64), LV = "1".repeat(64), P1 = "c".repeat(64), P2 = "d".repeat(64), KEY = "pk_" + "e".repeat(48);
const PIX = Buffer.from("fake-jpeg-bytes").toString("base64");
const iso = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const L = (o: object = {}) => JSON.stringify({ name: "Studio Gare", address: "1 rue A", postal_code: "95300", city: "Pontoise", platform: "airbnb", ical_url: "https://www.airbnb.fr/calendar/ical/1.ics", access_notes: "Boîte 1234", ...o });
let c1: string, c2: string, A: string, listing: string, other: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of ["0044_nettoyeurs.sql", "0045_nettoyeurs_suite.sql", "0046_reservations.sql", "0047_nettoyeurs_uber.sql", "0048_nettoyeurs_en_ligne.sql", "0049_vapid.sql", "0050_nettoyeurs_automatismes.sql", "0051_reference_logement.sql", "0052_suivi_linge.sql", "0053_espace_conciergerie.sql"]) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0053_espace_conciergerie.sql")); // rejouable
  c1 = (await q("insert into clients(name, postal_code, city, address) values ('Conciergerie Un','95300','Pontoise','1 rue A') returning id"))[0].id;
  c2 = (await q("insert into clients(name, postal_code, city, address) values ('Conciergerie Deux','75001','Paris','2 rue B') returning id"))[0].id;
  await q("insert into partner_access(client_id, token_hash) values ($1,$2), ($3,$4)", [c1, hash(P1), c2, hash(P2)]);
  other = (await q("insert into concierge_listings(name, client_id, cleaning_price_ht) values ('Logement de Deux', $1, 50) returning id", [c2]))[0].id;
  A = (await q("insert into cleaners(full_name, email, siret, departments, status, token_hash) values ('Léa Martin','lea@x.test','12345678900011','{95}','actif',$1) returning id", [hash(TA)]))[0].id;
});

describe("0053 — espace conciergerie", () => {
  it("lien inconnu ou désactivé refusé ; aucun accès direct aux tables", async () => {
    await fails("select partner_overview($1)", ["9".repeat(64)], /ACCES_REFUSE/);
    await fails("select partner_overview('pas-un-lien')", [], /ACCES_REFUSE/);
    await db.exec("set role anon");
    await fails("select * from partner_access", [], /permission denied/);
    await fails("select partner_client($1)", [P1], /permission denied/);
    await fails("select concierge_apply_core(gen_random_uuid(), '[]'::jsonb)", [], /permission denied/);
    await db.exec("reset role");
  });
  it("la conciergerie ajoute son logement (adresse obligatoire) ; sans tarif ProClean rien n'est publié", async () => {
    for (const bad of [{ name: "X" }, { postal_code: "953" }, { address: "1" }]) await fails("select partner_save_listing($1, null, $2::jsonb)", [P1, L(bad)], /ARGUMENT/);
    listing = (await q("select partner_save_listing($1, null, $2::jsonb) id", [P1, L()]))[0].id;
    const o = (await q("select partner_overview($1) o", [P1]))[0].o;
    expect(o.name).toBe("Conciergerie Un"); expect(o.listings).toHaveLength(1);
    expect(o.listings[0]).toMatchObject({ name: "Studio Gare", has_ical: true, price: null, city: "Pontoise", access_notes: "Boîte 1234", linen_clean: 0, has_guide: false });
    await q("select partner_save_listing($1, $2, $3::jsonb)", [P1, listing, L({ name: "Studio Gare 2", ical_url: "" })]);
    expect((await q("select partner_overview($1) o", [P1]))[0].o.listings[0]).toMatchObject({ name: "Studio Gare 2", has_ical: false });
    expect((await q("select count(*)::int n from sites where client_id = $1", [c1]))[0].n).toBe(1);   // modifier ne duplique pas l'adresse
  });
  it("cloisonnement : jamais le logement, les ménages ou la référence d'une autre conciergerie", async () => {
    await fails("select partner_save_listing($1, $2, $3::jsonb)", [P1, other, L()], /pas le vôtre/);
    await fails("select partner_set_linen($1, $2, 3)", [P1, other], /pas le vôtre/);
    await fails("select partner_ref_add_photo($1, $2, 'image/jpeg', $3)", [P1, other, PIX], /pas le vôtre/);
    await fails("select partner_guide($1, $2)", [P1, other], /pas le vôtre/);
    await fails("select partner_push_stay($1, $2, 'r1', $3, $4)", [P1, other, iso(1), iso(3)], /pas le vôtre/);
    await q("insert into cleaning_jobs(client_id, title, job_date, postal_code, city, price_ht) values ($1,'Ménage de Deux',$2,'75001','Paris',50)", [c2, iso(1)]);
    expect((await q("select partner_overview($1) o", [P1]))[0].o.jobs).toHaveLength(0);
    expect((await q("select partner_overview($1) o", [P2]))[0].o.jobs).toHaveLength(1);
  });
  it("référence du logement par la conciergerie : photos, guide, une analyse toutes les 10 minutes", async () => {
    await q("select partner_ref_add_photo($1,$2,'image/jpeg',$3)", [P1, listing, PIX]);
    await fails("select partner_ref_add_photo($1,$2,'image/gif',$3)", [P1, listing, PIX], /format/);
    const r = (await q("select partner_ref_for_analysis($1,$2) r", [P1, listing]))[0].r;
    expect(r.name).toBe("Studio Gare 2"); expect(r.photos).toHaveLength(1);
    await fails("select partner_set_guide($1,$2,'{}'::jsonb)", [P1, listing], /guide invalide/);
    await q("select partner_set_guide($1,$2,$3::jsonb)", [P1, listing, JSON.stringify({ summary: "Studio", rooms: [{ room: "Cuisine", steps: ["Plaque"] }], attention: [] })]);
    expect((await q("select partner_guide($1,$2) g", [P1, listing]))[0].g.rooms[0].room).toBe("Cuisine");
    await fails("select partner_ref_for_analysis($1,$2)", [P1, listing], /quelques minutes/);
  });
  it("clé d'API : créée depuis l'espace seulement ; elle envoie les réservations, qui deviennent des ménages (déplacés, annulés)", async () => {
    await fails("select partner_set_api_key($1,$2)", [P1, "court"], /empreinte/);
    await q("select partner_set_api_key($1,$2)", [P1, hash(KEY)]);
    await fails("select partner_set_api_key($1,$2)", [KEY, hash("pk_" + "f".repeat(48))], /espace conciergerie/);
    await fails("select partner_push_stay($1,$2,'r1',$3,$4)", ["pk_" + "0".repeat(48), listing, iso(1), iso(3)], /ACCES_REFUSE/);
    await fails("select partner_push_stay($1,$2,'r 1',$3,$4)", [KEY, listing, iso(1), iso(3)], /identifiant/);
    await fails("select partner_push_stay($1,$2,'r1',$3,$4)", [KEY, listing, iso(5), iso(3)], /dates/);
    await q("update concierge_listings set cleaning_price_ht = 60 where id = $1", [listing]);
    expect((await q("select partner_push_stay($1,$2,'r1',$3,$4) r", [KEY, listing, iso(1), iso(3)]))[0].r).toMatchObject({ created: 1 });
    expect((await q("select partner_push_stay($1,$2,'r2',$3,$4) r", [KEY, listing, iso(5), iso(8)]))[0].r).toMatchObject({ created: 1, cancelled: 0 });   // r1 n'est pas annulée par l'arrivée de r2
    expect((await q("select partner_push_stay($1,$2,'r1',$3,$4) r", [KEY, listing, iso(1), iso(4)]))[0].r).toMatchObject({ created: 0, moved: 1 });
    expect((await q("select partner_push_stay($1,$2,'r2',$3,$4,true) r", [KEY, listing, iso(5), iso(8)]))[0].r).toMatchObject({ cancelled: 1 });
    expect((await q("select count(*)::int n from interventions where source_key like 'conc:%' and stage <> 'annulee' and client_id = $1", [c1]))[0].n).toBe(1);
    expect((await q("select partner_overview($1) o", [KEY]))[0].o.has_api_key).toBe(true);
  });
});

describe("0053 — stock de linge par logement", () => {
  let job: string;
  it("la conciergerie déclare son stock ; le nettoyeur le voit dans son ménage, même sans livreur", async () => {
    await q("select partner_set_linen($1,$2,3)", [P1, listing]);
    await fails("select partner_set_linen($1,$2,-1)", [P1, listing], /parures/);
    job = (await q("insert into cleaning_jobs(client_id, listing_id, title, job_date, postal_code, city, price_ht, status, cleaner_id) values ($1,$2,'Ménage Studio',(now() at time zone 'Europe/Paris')::date,'95300','Pontoise',60,'acceptee',$3) returning id", [c1, listing, A]))[0].id;
    const mine = ((await q("select cleaner_my_jobs($1) m", [TA]))[0].m.jobs as any[]).find((j) => j.id === job);
    expect(mine.clean_linen).toMatchObject({ status: null, stock: { clean: 3, dirty: 0, per_stay: 1 } });
    expect((await q("select partner_overview($1) o", [P1]))[0].o.jobs.find((j: any) => j.id === job)).toMatchObject({ cleaner: "Léa", status: "acceptee" });
  });
  it("ménage terminé : une parure propre en moins, une sale en plus, comptée une seule fois même après reprise", async () => {
    await q("update cleaning_jobs set status = 'a_verifier' where id = $1", [job]);
    await q("update cleaning_jobs set status = 'a_reprendre' where id = $1", [job]);
    await q("update cleaning_jobs set status = 'a_verifier' where id = $1", [job]);
    expect((await q("select linen_clean c, linen_dirty d from concierge_listings where id = $1", [listing]))[0]).toEqual({ c: 2, d: 1 });
  });
  it("livreur : il dépose N parures propres, puis emporte le sale", async () => {
    await q("insert into linen_couriers(full_name, token_hash) values ('Sam',$1)", [hash(LV)]);
    const j2 = (await q("insert into cleaning_jobs(client_id, listing_id, title, job_date, postal_code, city, price_ht, status) values ($1,$2,'Ménage suivant',(now() at time zone 'Europe/Paris')::date + 1,'95300','Pontoise',60,'ouverte') returning id", [c1, listing]))[0].id;
    const runs = (await q("select courier_runs($1) r", [LV]))[0].r.runs as any[];
    expect(runs[0].stock).toMatchObject({ clean: 2, dirty: 1 });
    const liv = runs.find((r) => r.kind === "livraison").id, col = runs.find((r) => r.kind === "collecte").id;
    await fails("select courier_run_update($1,$2,'fait',99)", [LV, liv], /parures/);
    await q("select courier_run_update($1,$2,'fait',4)", [LV, liv]);
    await q("select courier_run_update($1,$2,'fait')", [LV, col]);
    expect((await q("select linen_clean c, linen_dirty d from concierge_listings where id = $1", [listing]))[0]).toEqual({ c: 6, d: 0 });
    expect(j2).toBeTruthy();
  });
});
