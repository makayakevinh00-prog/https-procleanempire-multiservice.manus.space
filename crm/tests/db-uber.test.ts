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
const SECRET = "secret-de-test-123", T1 = "1".repeat(64), T2 = "2".repeat(64), T3 = "3".repeat(64);
const iso = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const PONTOISE = { lat: 49.05, lng: 2.1 }, PARIS = { lat: 48.8566, lng: 2.3522 }, VERSAILLES = { lat: 48.8049, lng: 2.1204 };
const reg = (o: object = {}) => JSON.stringify({ full_name: "Léa Martin", email: "lea@x.test", phone: "0600000000", siret: "12345678900011", postal_code: "95300", city: "Pontoise", address_line: "1 rue A", ...PONTOISE, radius_km: 15, verified: true, ...o });
let client: string, listing: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of ["0044_nettoyeurs.sql", "0045_nettoyeurs_suite.sql", "0046_reservations.sql", "0047_nettoyeurs_uber.sql"]) { await db.exec(read(`supabase/migrations/${f}`)); await db.exec(read(`supabase/migrations/${f}`)); } // rejouables
  await q("update app_settings set automation_secret = $1", [SECRET]);
  client = (await q("insert into clients(name, postal_code, city, address) values ('Propriétaire Martin','95300','Pontoise','1 rue A') returning id"))[0].id;
  listing = (await q("insert into concierge_listings(name, client_id, cleaning_price_ht, cleaning_hours, platform) values ('Studio Gare', $1, 60, 2, 'airbnb') returning id", [client]))[0].id;
});

describe("0047 — distance et zone", () => {
  it("haversine : Pontoise–Paris ≈ 27 km, Pontoise–Versailles ≈ 27 km", async () => {
    const d = (a: any, b: any) => q("select geo_km($1,$2,$3,$4)::float d", [a.lat, a.lng, b.lat, b.lng]).then((r) => r[0].d);
    expect(await d(PONTOISE, PARIS)).toBeGreaterThan(25); expect(await d(PONTOISE, PARIS)).toBeLessThan(30);
    expect(await d(PONTOISE, PONTOISE)).toBe(0);
    expect(await d(PONTOISE, VERSAILLES)).toBeGreaterThan(25); expect(await d(PONTOISE, VERSAILLES)).toBeLessThan(30);
  });
});

describe("0047 — inscription instantanée (serveur seulement)", () => {
  it("le public ne peut plus écrire dans les inscriptions ; sans le secret, rien ne passe", async () => {
    await db.exec("set role anon");
    await fails("select cleaner_signup($1::jsonb)", [reg()], /permission denied/);
    await fails("select automation_cleaner_register('mauvais', $1::jsonb, $2)", [reg(), hash(T1)], /./);
    await db.exec("reset role");
  });
  it("SIRET vérifié : compte actif tout de suite, lien valable ; un doublon d'e-mail est refusé", async () => {
    expect((await q("select automation_cleaner_register($1,$2::jsonb,$3) r", [SECRET, reg(), hash(T1)]))[0].r).toBe("actif");
    expect((await q("select automation_cleaner_register($1,$2::jsonb,$3) r", [SECRET, reg({ email: "LEA@x.test" }), hash(T2)]))[0].r).toBe("deja");
    expect((await q("select cleaner_overview($1) o", [T1]))[0].o).toMatchObject({ name: "Léa Martin", radius_km: 15, has_location: true, departments: ["95"] });
  });
  it("annuaire indisponible : en attente, aucun accès avant validation ; données invalides refusées", async () => {
    expect((await q("select automation_cleaner_register($1,$2::jsonb,$3) r", [SECRET, reg({ email: "attente@x.test", verified: false }), hash(T2)]))[0].r).toBe("attente");
    await fails("select cleaner_overview($1)", [T2], /./);
    for (const bad of [{ email: "pas-un-mail" }, { full_name: "X" }, { postal_code: "953" }, { radius_km: 0 }, { radius_km: 500 }])
      await fails("select automation_cleaner_register($1,$2::jsonb,$3)", [SECRET, reg({ email: "x" + Math.random() + "@x.test", ...bad }), hash("z".repeat(64))], /ARGUMENT/);
  });
  it("nouveau lien : l'ancien cesse de marcher, un seul envoi toutes les 5 minutes, comptes non actifs ignorés", async () => {
    await q("update cleaners set token_set_at = now() - interval '10 minutes' where lower(email) = 'lea@x.test'");
    expect((await q("select automation_cleaner_new_link($1,'LEA@x.test',$2) r", [SECRET, hash(T3)]))[0].r).toBe("Léa Martin");
    await fails("select cleaner_overview($1)", [T1], /./);
    expect((await q("select cleaner_overview($1) o", [T3]))[0].o.name).toBe("Léa Martin");
    expect((await q("select automation_cleaner_new_link($1,'lea@x.test',$2) r", [SECRET, hash("9".repeat(64))]))[0].r).toBe("trop_tot");
    expect((await q("select automation_cleaner_new_link($1,'attente@x.test',$2) r", [SECRET, hash("8".repeat(64))]))[0].r).toBeNull();
    expect((await q("select automation_cleaner_new_link($1,'inconnu@x.test',$2) r", [SECRET, hash("7".repeat(64))]))[0].r).toBeNull();
  });
});

describe("0047 — réservations → ménages → zone", () => {
  const ev = (uid: string, a: number, b: number) => ({ uid, checkIn: iso(a), checkOut: iso(b), summary: "Reserved" });
  it("les réservations créent séjours et ménages ; refaire la synchro ne duplique rien", async () => {
    const r = (await q("select automation_concierge_apply($1,$2,$3::jsonb) r", [SECRET, listing, JSON.stringify([ev("a", 1, 4), ev("b", 4, 7)])]))[0].r;
    expect(r).toMatchObject({ created: 2, moved: 0, cancelled: 0 });
    expect((await q("select automation_concierge_apply($1,$2,$3::jsonb) r", [SECRET, listing, JSON.stringify([ev("a", 1, 4), ev("b", 4, 7)])]))[0].r).toMatchObject({ created: 0, moved: 0, cancelled: 0 });
    const rows = await q("select i.title, i.scheduled_date::text d, i.stage, i.unit_price_ht::float p from interventions i where source_key like 'conc:%' order by scheduled_date");
    expect(rows).toHaveLength(2); expect(rows[0].title).toContain("arrivée le même jour"); expect(rows[0].p).toBe(60);
  });
  it("publication automatique : les ménages deviennent des demandes avec leur part ; géolocalisation par le serveur", async () => {
    expect((await q("select automation_publish_cleaning_jobs($1) n", [SECRET]))[0].n).toBe(2);
    const todo = (await q("select automation_jobs_to_geocode($1) t", [SECRET]))[0].t as any[];
    expect(todo).toHaveLength(2);
    for (const t of todo) await q("select automation_set_job_geo($1,$2,$3,$4)", [SECRET, t.id, PONTOISE.lat, PONTOISE.lng]);
    await q("select automation_set_job_geo($1,$2,0,0)", [SECRET, todo[0].id]);   // hors de France : ignoré
    expect((await q("select count(*)::int n from cleaning_jobs where lat is not null"))[0].n).toBe(2);
    expect((await q("select automation_jobs_to_geocode($1) t", [SECRET]))[0].t).toHaveLength(0);
  });
  it("le nettoyeur voit les ménages de son rayon avec la distance, pas ceux hors zone", async () => {
    let jobs = (await q("select cleaner_open_jobs($1) o", [T3]))[0].o.jobs as any[];
    expect(jobs).toHaveLength(2); expect(jobs[0].distance_km).toBeLessThan(1);
    await q("update cleaners set lat = $1, lng = $2, radius_km = 10 where lower(email) = 'lea@x.test'", [PARIS.lat, PARIS.lng]);   // Paris, 10 km : Pontoise est trop loin
    expect((await q("select cleaner_open_jobs($1) o", [T3]))[0].o.jobs).toHaveLength(0);
    await fails("select cleaner_accept_job($1,(select id from cleaning_jobs limit 1))", [T3], /hors de votre zone/);
    await q("update cleaners set radius_km = 40 where lower(email) = 'lea@x.test'");
    jobs = (await q("select cleaner_open_jobs($1) o", [T3]))[0].o.jobs as any[];
    expect(jobs).toHaveLength(2); expect(jobs[0].distance_km).toBeGreaterThan(25);
  });
  it("sans position : repli sur le département", async () => {
    await q("update cleaners set lat = null, lng = null where lower(email) = 'lea@x.test'");
    expect((await q("select cleaner_open_jobs($1) o", [T3]))[0].o.jobs).toHaveLength(2);
    await q("update cleaners set departments = '{75}' where lower(email) = 'lea@x.test'");
    expect((await q("select cleaner_open_jobs($1) o", [T3]))[0].o.jobs).toHaveLength(0);
    await q("update cleaners set departments = '{95}' where lower(email) = 'lea@x.test'");
  });
  it("accepter : le premier gagne, le patron est informé (nom, titre) ; le profil se met à jour avec contrôles", async () => {
    const id = (await q("select id from cleaning_jobs order by job_date limit 1"))[0].id;
    const r = (await q("select cleaner_accept_job($1,$2) r", [T3, id]))[0].r;
    expect(r).toMatchObject({ ok: true, name: "Léa Martin" }); expect(r.title).toContain("Studio Gare");
    expect((await q("select status from cleaning_jobs where id = $1", [id]))[0].status).toBe("acceptee");
    await fails("select cleaner_accept_job($1,$2)", [T3, id], /INDISPONIBLE/);
    await q("select cleaner_update_profile2($1,'3 rue B','95300','Pontoise',$2,$3,20,'0611','FR76 3000 6000 0112 3456 7890 189')", [T3, PONTOISE.lat, PONTOISE.lng]);
    expect((await q("select cleaner_overview($1) o", [T3]))[0].o).toMatchObject({ radius_km: 20, postal_code: "95300", has_iban: true });
    await fails("select cleaner_update_profile2($1,'x','953','P',null,null,20,'',null)", [T3], /code postal/);
    await fails("select cleaner_update_profile2($1,'x','95300','P',null,null,0,'',null)", [T3], /rayon/);
    await fails("select cleaner_update_profile2($1,'x','95300','P',10,10,20,'',null)", [T3], /hors de France/);
    await fails("select cleaner_update_profile2($1,'x','95300','P',null,null,20,'','FR00')", [T3], /IBAN/);
  });
  it("séjour annulé ou déplacé : ménage et demande suivent ; alerte si personne n'accepte", async () => {
    const r = (await q("select automation_concierge_apply($1,$2,$3::jsonb) r", [SECRET, listing, JSON.stringify([ev("a", 1, 5)])]))[0].r;
    expect(r).toMatchObject({ moved: 1, cancelled: 1 });
    expect((await q("select count(*)::int n from cleaning_jobs where status = 'annulee'"))[0].n).toBe(1);
    expect((await q("select job_date::text d from cleaning_jobs where status <> 'annulee'"))[0].d).toBe(iso(5));
    await q("update cleaning_jobs set job_date = $1, status = 'ouverte', cleaner_id = null where status <> 'annulee'", [iso(1)]);
    expect((await q("select automation_unfilled_jobs($1,1) j", [SECRET]))[0].j).toHaveLength(1);
    expect((await q("select automation_unfilled_jobs($1,0) j", [SECRET]))[0].j).toHaveLength(0);
    await fails("select automation_unfilled_jobs('faux',1)", [], /./);
  });
  it("automatisation « ménages » coupée : les séjours sont notés mais aucun ménage n'est créé", async () => {
    await q("update concierge_automations set enabled = false where key = 'menages'");
    expect((await q("select automation_concierge_apply($1,$2,$3::jsonb) r", [SECRET, listing, JSON.stringify([ev("a", 1, 5), ev("z", 8, 10)])]))[0].r).toMatchObject({ created: 0 });
    await q("update concierge_automations set enabled = true where key = 'menages'");
  });
  it("synchro : au plus une exécution complète par créneau ; secret exigé ; anonymes sans accès direct", async () => {
    await q("update marketplace_settings set last_sync_at = null");
    expect((await q("select automation_claim_sync($1,30) r", [SECRET]))[0].r).toBe(true);
    expect((await q("select automation_claim_sync($1,30) r", [SECRET]))[0].r).toBe(false);
    await fails("select automation_claim_sync('faux',30)", [], /./);
    await db.exec("set role anon");
    expect((await q("select count(*)::int n from cleaning_jobs"))[0].n).toBe(0);
    await fails("select cleaner_covers(c, j) from cleaners c, cleaning_jobs j", [], /permission denied/);
    await db.exec("reset role");
  });
});
