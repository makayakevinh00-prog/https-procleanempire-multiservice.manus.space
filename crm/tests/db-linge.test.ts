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
const TA = "a".repeat(64), L1 = "1".repeat(64), L2 = "2".repeat(64);
let client: string, A: string, C1: string, C2: string;
const job = async (day = 0, status = "acceptee") => (await q("insert into cleaning_jobs(client_id, title, job_date, postal_code, city, address, access_notes, price_ht, status, cleaner_id, lat, lng) values ($1,'Ménage Studio',(now() at time zone 'Europe/Paris')::date + $2::int,'95300','Pontoise','1 rue A','Boîte à clés 1234',100,$3,$4,49.05,2.1) returning id", [client, day, status, status === "ouverte" ? null : A]))[0].id as string;
const runs = async (t: string) => (await q("select courier_runs($1) r", [t]))[0].r.runs as any[];
const linen = async (j: string) => ((await q("select cleaner_my_jobs($1) m", [TA]))[0].m.jobs as any[]).find((x) => x.id === j)?.clean_linen;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of ["0044_nettoyeurs.sql", "0045_nettoyeurs_suite.sql", "0046_reservations.sql", "0047_nettoyeurs_uber.sql", "0048_nettoyeurs_en_ligne.sql", "0049_vapid.sql", "0050_nettoyeurs_automatismes.sql", "0051_reference_logement.sql", "0052_suivi_linge.sql"]) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0052_suivi_linge.sql")); // rejouable
  client = (await q("insert into clients(name, postal_code, city, address) values ('Propriétaire','95300','Pontoise','1 rue A') returning id"))[0].id;
  A = (await q("insert into cleaners(full_name, email, siret, departments, status, token_hash) values ('Léa','lea@x.test','12345678900011','{95}','actif',$1) returning id", [hash(TA)]))[0].id;
});

describe("0052 — suivi du linge", () => {
  it("sans livreur : aucune tournée, le nettoyeur ne voit rien de plus", async () => {
    const j = await job();
    expect((await q("select count(*)::int n from linen_runs"))[0].n).toBe(0);
    expect(await linen(j)).toBeNull();
  });
  it("avec un livreur : chaque ménage publié crée une livraison et une collecte ; rattrapage réservé au patron", async () => {
    C1 = (await q("insert into linen_couriers(full_name, phone, token_hash) values ('Sam Linge','0611',$1) returning id", [hash(L1)]))[0].id;
    C2 = (await q("insert into linen_couriers(full_name, token_hash) values ('Autre Livreur',$1) returning id", [hash(L2)]))[0].id;
    await fails("select linen_backfill()", [], /ACCES_REFUSE/);
    await db.exec("create or replace function is_owner() returns boolean language sql as $$ select true $$");
    expect((await q("select linen_backfill() n"))[0].n).toBe(1);
    const j = await job(1, "ouverte");
    expect((await q("select kind from linen_runs where job_id = $1 order by kind", [j])).map((r) => r.kind)).toEqual(["collecte", "livraison"]);
    expect((await runs(L1)).length).toBe(4);
  });
  it("le livreur voit l'adresse et l'accès ; « Je pars » lui réserve la tournée ; un autre ne peut plus la prendre", async () => {
    const today = (await q("select (now() at time zone 'Europe/Paris')::date::text d"))[0].d;
    const r = (await runs(L1)).find((x) => x.kind === "livraison" && x.date === today);
    expect(r).toMatchObject({ address: "1 rue A", access_notes: "Boîte à clés 1234", status: "a_faire", mine: false });
    await q("select courier_run_update($1,$2,'en_route')", [L1, r.id]);
    await fails("select courier_run_update($1,$2,'fait')", [L2, r.id], /autre livreur/);
    expect((await runs(L2)).find((x) => x.id === r.id).taken).toBe(true);
    await fails("select courier_run_update($1,$2,'livre')", [L1, r.id], /inconnue/);
    await fails("select courier_runs($1)", ["9".repeat(64)], /./);
  });
  it("le nettoyeur suit le linge propre : en route avec la distance du livreur, puis sur place", async () => {
    const j = (await q("select id from cleaning_jobs where status = 'acceptee' limit 1"))[0].id;
    expect(await linen(j)).toMatchObject({ status: "en_route", courier: "Sam Linge", phone: "0611", km: null });
    await fails("select courier_ping($1,0,0)", [L1], /hors de France/);
    await q("select courier_ping($1,49.06,2.11)", [L1]);
    const l = await linen(j);
    expect(l.km).toBeGreaterThan(0.5); expect(l.km).toBeLessThan(3); expect(l.lat).toBe(49.06);
    await q("update linen_couriers set last_seen_at = now() - interval '1 hour' where id = $1", [C1]);
    expect((await linen(j)).km).toBeNull();                       // position trop ancienne : on ne l'affiche plus
    const r = (await q("select id from linen_runs where job_id = $1 and kind = 'livraison'", [j]))[0].id;
    await q("select courier_run_update($1,$2,'fait')", [L1, r]);
    expect(await linen(j)).toMatchObject({ status: "sur_place", phone: null });
    await fails("select courier_run_update($1,$2,'en_route')", [L1, r], /déjà faite/);
  });
  it("linge sale récupéré : le suivi des draps du ménage passe à « déposé (livreur) » ; se désister libère la tournée", async () => {
    const j = (await q("select id from cleaning_jobs where status = 'acceptee' limit 1"))[0].id;
    const r = (await q("select id from linen_runs where job_id = $1 and kind = 'collecte'", [j]))[0].id;
    await q("select courier_run_update($1,$2,'en_route')", [L2, r]);
    await q("select courier_run_update($1,$2,'a_faire')", [L2, r]);
    expect((await q("select courier_id from linen_runs where id = $1", [r]))[0].courier_id).toBeNull();
    await q("select courier_run_update($1,$2,'fait')", [L1, r]);
    expect((await q("select status, method from cleaning_linen where job_id = $1", [j]))[0]).toEqual({ status: "depose", method: "livreur" });
  });
  it("ménage déplacé ou annulé : les tournées suivent ; livreur désactivé = lien coupé ; aucun accès direct", async () => {
    const j = await job(2, "ouverte");
    await q("update cleaning_jobs set job_date = job_date + 1 where id = $1", [j]);
    expect((await q("select count(*)::int n from linen_runs r join cleaning_jobs c on c.id = r.job_id where r.job_id = $1 and r.due_date = c.job_date", [j]))[0].n).toBe(2);
    await q("update cleaning_jobs set status = 'annulee' where id = $1", [j]);
    expect((await q("select count(*)::int n from linen_runs where job_id = $1", [j]))[0].n).toBe(0);
    await q("update linen_couriers set active = false where id = $1", [C2]);
    await fails("select courier_runs($1)", [L2], /ACCES_REFUSE/);
    await db.exec("set role anon");
    await fails("select * from linen_couriers", [], /permission denied/);
    await fails("select * from linen_runs", [], /permission denied/);
    await fails("select cleaning_job_linen(gen_random_uuid())", [], /permission denied/);
    await db.exec("reset role");
  });
});
