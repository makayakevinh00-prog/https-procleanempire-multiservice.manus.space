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
const TA = "a".repeat(64), TB = "b".repeat(64), SECRET = "secret-de-test-123";
const iso = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const PIX = Buffer.from("fake-jpeg-bytes").toString("base64");
let A: string, B: string, client: string, reserved: string;
const job = async (date = iso(0), status = "acceptee", cleaner: string | null = A) =>
  (await q("insert into cleaning_jobs(client_id, title, job_date, postal_code, city, price_ht, status, cleaner_id) values ($1,'Ménage Studio',$2,'95300','Pontoise',100,$3,$4) returning id", [client, date, status, cleaner]))[0].id as string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of ["0044_nettoyeurs.sql", "0045_nettoyeurs_suite.sql"]) { await db.exec(read(`supabase/migrations/${f}`)); await db.exec(read(`supabase/migrations/${f}`)); } // rejouables
  await q("update app_settings set automation_secret = $1", [SECRET]);
  client = (await q("insert into clients(name, postal_code, city, address) values ('Propriétaire Martin','95300','Pontoise','1 rue A') returning id"))[0].id;
  reserved = (await q("insert into clients(name, postal_code, city, is_reserved) values ('Contact réservé','95300','Pontoise', true) returning id"))[0].id;
  const mk = async (n: string, e: string, t: string) => (await q("insert into cleaners(full_name, email, siret, departments, status, token_hash) values ($1,$2,'12345678900011','{95}','actif',$3) returning id", [n, e, hash(t)]))[0].id as string;
  A = await mk("Léa", "lea@x.test", TA); B = await mk("Karim", "karim@x.test", TB);
});

describe("0045 — photos, contrôle, draps, automatisations", () => {
  it("photos : seulement les siennes, le jour du ménage, formats et poids contrôlés", async () => {
    const j = await job();
    await q("select cleaner_add_photo($1,$2,'avant','image/jpeg',$3)", [TA, j, PIX]);
    await fails("select cleaner_add_photo($1,$2,'avant','image/jpeg',$3)", [TB, j, PIX], /INDISPONIBLE/);
    await fails("select cleaner_add_photo($1,$2,'video','image/jpeg',$3)", [TA, j, PIX], /type de photo/);
    await fails("select cleaner_add_photo($1,$2,'avant','application/pdf',$3)", [TA, j, PIX], /format/);
    await fails("select cleaner_add_photo($1,$2,'avant','image/jpeg',$3)", [TA, j, ""], /vide ou trop lourde/);
    await fails("select cleaner_add_photo($1,$2,'avant','image/jpeg',$3)", [TA, await job(iso(3)), PIX], /le jour du ménage/);
  });
  it("terminer exige une photo avant et une photo après ; les draps sont alors suivis", async () => {
    const j = await job();
    await fails("select cleaner_finish_job($1,$2)", [TA, j], /photo avant et une photo après/);
    await q("select cleaner_add_photo($1,$2,'avant','image/jpeg',$3)", [TA, j, PIX]);
    await fails("select cleaner_finish_job($1,$2)", [TA, j], /photo avant et une photo après/);
    await q("select cleaner_add_photo($1,$2,'apres','image/jpeg',$3)", [TA, j, PIX]);
    await q("select cleaner_finish_job($1,$2,'ok')", [TA, j]);
    expect((await q("select status from cleaning_jobs where id=$1", [j]))[0].status).toBe("a_verifier");
    expect((await q("select status from cleaning_linen where job_id=$1", [j]))[0].status).toBe("a_deposer");
    const mine = (await q("select cleaner_my_jobs($1) r", [TA]))[0].r.jobs.find((x: any) => x.id === j);
    expect(mine).toMatchObject({ photos_before: 1, photos_after: 1, status: "a_verifier", linen: { status: "a_deposer" } });
    await q("update marketplace_settings set require_photos = false");
    await q("select cleaner_finish_job($1,$2)", [TA, await job()]);                     // photos facultatives si le patron le décide
    await q("update marketplace_settings set require_photos = true");
  });
  it("draps : déposer (avec mode), récupérer au retour, remettre ; pas d'étape sautée ni de ménage d'un autre", async () => {
    const j = await job(); await q("insert into cleaning_linen(job_id) values ($1)", [j]);
    await fails("select cleaner_linen_update($1,$2,'depose')", [TA, j], /poste ou livreur/);
    await fails("select cleaner_linen_update($1,$2,'depose','poste')", [TB, j], /pas le vôtre/);
    await q("select cleaner_linen_update($1,$2,'depose','poste','6A12345678')", [TA, j]);
    expect((await q("select status, method, tracking from cleaning_linen where job_id=$1", [j]))[0]).toEqual({ status: "depose", method: "poste", tracking: "6A12345678" });
    await fails("select cleaner_linen_update($1,$2,'remis')", [TA, j], /pas possible/);        // pas avant « récupéré »
    await q("update cleaning_linen set status = 'renvoye' where job_id = $1", [j]);              // le patron : lavé puis renvoyé
    await q("select cleaner_linen_update($1,$2,'recupere')", [TA, j]);
    await q("select cleaner_linen_update($1,$2,'remis')", [TA, j]);
    expect((await q("select status from cleaning_linen where job_id=$1", [j]))[0].status).toBe("remis");
  });
  it("analyse : réservée au serveur (secret) ; « avant » garde les points à nettoyer, « après » peut renvoyer le ménage", async () => {
    const j = await job(iso(0), "a_verifier");
    await fails("select automation_set_job_analysis('mauvais',$1,'avant','{}'::jsonb,null)", [j], /ACCES_REFUSE/);
    await fails("select automation_job_photos('mauvais',$1,'avant')", [j], /ACCES_REFUSE/);
    await q("select automation_set_job_analysis($1,$2,'avant',$3::jsonb,null)", [SECRET, j, JSON.stringify({ items: ["Sol de la cuisine", "Salle de bain"] })]);
    expect((await q("select before_report r from cleaning_jobs where id=$1", [j]))[0].r.items).toHaveLength(2);
    await q("select automation_set_job_analysis($1,$2,'apres',$3::jsonb,'ok')", [SECRET, j, JSON.stringify({ summary: "Tout est propre" })]);
    expect((await q("select status, ai_status, departure from cleaning_jobs where id=$1", [j]))[0]).toEqual({ status: "a_verifier", ai_status: "ok", departure: null });
    await q("select automation_set_job_analysis($1,$2,'apres',$3::jsonb,'reprise')", [SECRET, j, JSON.stringify({ summary: "Le miroir n'est pas nettoyé" })]);
    const r = (await q("select status, ai_status, departure, review_note from cleaning_jobs where id=$1", [j]))[0];
    expect(r).toMatchObject({ status: "a_reprendre", ai_status: "reprise", departure: "rester" });
    expect(r.review_note).toContain("miroir");
    await fails("select automation_set_job_analysis($1,$2,'apres','{}'::jsonb,'peut-etre')", [SECRET, j], /verdict/);
  });
  it("publication automatique : seulement si activée, avec prix et code postal, jamais un contact réservé, jamais deux fois", async () => {
    const mkStay = async (cid: string, price: number | null) => {
      const l = (await q("insert into concierge_listings(name, client_id, cleaning_price_ht, cleaning_hours) values ('Studio Test',$1,$2,2) returning id", [cid, price]))[0].id;
      const s = (await q("insert into concierge_stays(listing_id, uid, check_in, check_out) values ($1,$2,$3,$4) returning id", [l, `u${Math.random()}`, iso(1), iso(3)]))[0].id;
      return (await q("insert into interventions(client_id, title, scheduled_date, source_key) values ($1,'Ménage — Studio Test',$2,$3) returning id", [cid, iso(3), `conc:${s}`]))[0].id as string;
    };
    const ok = await mkStay(client, 70), noPrice = await mkStay(client, null), res = await mkStay(reserved, 70);
    expect((await q("select automation_publish_cleaning_jobs($1) n", [SECRET]))[0].n).toBe(0);      // désactivée par défaut
    await q("update marketplace_settings set auto_publish = true");
    expect((await q("select automation_publish_cleaning_jobs($1) n", [SECRET]))[0].n).toBe(1);
    expect((await q("select automation_publish_cleaning_jobs($1) n", [SECRET]))[0].n).toBe(0);      // pas de doublon
    const pub = (await q("select intervention_id, postal_code, city, price_ht, cleaner_amount, status from cleaning_jobs where intervention_id = $1", [ok]))[0];
    expect(pub).toMatchObject({ postal_code: "95300", city: "Pontoise", price_ht: "70.00", cleaner_amount: "52.50", status: "ouverte" });
    expect((await q("select count(*)::int n from cleaning_jobs where intervention_id in ($1,$2)", [noPrice, res]))[0].n).toBe(0);
    await fails("select automation_publish_cleaning_jobs('mauvais')", [], /ACCES_REFUSE/);
    await q("update marketplace_settings set auto_publish = false");
  });
  it("paiements automatiques : créés par nettoyeur, une seule fois, seulement si activés", async () => {
    await q("delete from cleaning_jobs");
    const j1 = await job(iso(-2), "validee", A), j2 = await job(iso(-2), "validee", A), j3 = await job(iso(-2), "validee", B);
    await q("update cleaning_jobs set validated_at = now() - interval '1 day'");
    expect((await q("select automation_create_payouts($1,$2,$3) r", [SECRET, iso(-7), iso(0)]))[0].r).toEqual({ payouts: 0, total: 0 });
    await q("update marketplace_settings set auto_payout = true");
    const r = (await q("select automation_create_payouts($1,$2,$3) r", [SECRET, iso(-7), iso(0)]))[0].r;
    expect(r).toEqual({ payouts: 2, total: 225 });                                                   // 3 ménages × 75 €
    expect((await q("select amount::float a, jobs from cleaning_payouts order by amount desc"))).toEqual([{ a: 150, jobs: 2 }, { a: 75, jobs: 1 }]);
    expect((await q("select automation_create_payouts($1,$2,$3) r", [SECRET, iso(-7), iso(0)]))[0].r.payouts).toBe(0);
    expect((await q("select count(*)::int n from cleaning_jobs where payout_id is null and id in ($1,$2,$3)", [j1, j2, j3]))[0].n).toBe(0);
    await q("update marketplace_settings set auto_payout = false");
  });
  it("les photos ne sont lisibles ni par un nettoyeur ni en direct", async () => {
    await db.exec("set role anon");
    expect((await q("select count(*)::int n from cleaning_job_photos"))[0].n).toBe(0);
    expect((await q("select count(*)::int n from cleaning_linen"))[0].n).toBe(0);
    await db.exec("reset role");
  });
});
