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
const SECRET = "secret-de-test-123";
const tok = (n: number) => String(n).repeat(64).slice(0, 64);
const iso = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const HERE = { lat: 49.05, lng: 2.1 };           // Pontoise
const NEAR = { lat: 49.06, lng: 2.11 }, MID = { lat: 49.15, lng: 2.2 }, FAR = { lat: 49.3, lng: 2.4 };
let client: string; const C: string[] = [];

async function cleaner(i: number, pos: { lat: number; lng: number }, online = true) {
  const r = await q("insert into cleaners(full_name, email, siret, departments, status, token_hash, lat, lng, radius_km, online, postal_code) values ($1,$2,'12345678900011','{95}','actif',$3,$4,$5,60,$6,'95300') returning id", [`C${i}`, `c${i}@x.test`, hash(tok(i)), pos.lat, pos.lng, online]);
  C[i] = r[0].id; return r[0].id as string;
}
const job = async (o: { date?: string; ageMin?: number; status?: string } = {}) =>
  (await q("insert into cleaning_jobs(client_id, title, job_date, postal_code, city, price_ht, status, lat, lng, created_at) values ($1,'Ménage test',$2,'95300','Pontoise',100,$3,$4,$5, now() - make_interval(mins => $6)) returning id", [client, o.date ?? iso(1), o.status ?? "ouverte", HERE.lat, HERE.lng, o.ageMin ?? 0]))[0].id as string;
const reset = async () => {
  const pos: Record<string, { lat: number; lng: number }> = { C1: NEAR, C2: HERE, C3: { lat: 49.07, lng: 2.12 }, C4: MID, C5: FAR };
  for (const [n, p] of Object.entries(pos)) await q("update cleaners set lat = $1, lng = $2, last_lat = null, last_lng = null, last_seen_at = null, online = true where full_name = $3", [p.lat, p.lng, n]);
};
const visible = async (i: number) => ((await q("select cleaner_open_jobs($1) o", [tok(i)]))[0].o.jobs as any[]).map((j) => j.id);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of ["0044_nettoyeurs.sql", "0045_nettoyeurs_suite.sql", "0046_reservations.sql", "0047_nettoyeurs_uber.sql", "0048_nettoyeurs_en_ligne.sql", "0049_vapid.sql"]) { await db.exec(read(`supabase/migrations/${f}`)); await db.exec(read(`supabase/migrations/${f}`)); }
  await q("update app_settings set automation_secret = $1", [SECRET]);
  client = (await q("insert into clients(name, postal_code, city, address) values ('Propriétaire','95300','Pontoise','1 rue A') returning id"))[0].id;
});

describe("0048 — en ligne, zones, position", () => {
  it("bouton En ligne / Hors ligne ; l'aperçu le reflète ; jeton obligatoire", async () => {
    await cleaner(1, HERE, false);
    expect((await q("select cleaner_overview($1) o", [tok(1)]))[0].o).toMatchObject({ online: false, today_amount: 0, week_amount: 0 });
    await q("select cleaner_set_online($1,true)", [tok(1)]);
    expect((await q("select cleaner_overview($1) o", [tok(1)]))[0].o.online).toBe(true);
    await q("select cleaner_set_online($1,false)", [tok(1)]);
    await fails("select cleaner_set_online($1,true)", [tok(9)], /./);
  });
  it("position en direct : acceptée en France, refusée ailleurs", async () => {
    await q("select cleaner_ping($1,$2,$3)", [tok(1), NEAR.lat, NEAR.lng]);
    expect((await q("select last_lat::float la, last_seen_at is not null s from cleaners where id = $1", [C[1]]))[0]).toEqual({ la: NEAR.lat, s: true });
    await fails("select cleaner_ping($1,0,0)", [tok(1)], /hors de France/);
  });
  it("abonnement aux notifications : https obligatoire, 5 par nettoyeur au plus, réabonnement sans doublon", async () => {
    await fails("select cleaner_push_subscribe($1,'http://x','a','b')", [tok(1)], /invalide/);
    await fails("select cleaner_push_subscribe($1,'https://push.test/1','','b')", [tok(1)], /invalide/);
    for (let i = 0; i < 7; i++) await q("select cleaner_push_subscribe($1,$2,'k','a')", [tok(1), `https://push.test/${i}`]);
    await q("select cleaner_push_subscribe($1,'https://push.test/6','k2','a')", [tok(1)]);
    expect((await q("select count(*)::int n from cleaner_push where cleaner_id = $1", [C[1]]))[0].n).toBeLessThanOrEqual(5);
    expect((await q("select cleaner_push_status($1) s", [tok(1)]))[0].s).toBe(true);
    await db.exec("set role anon");
    await fails("select * from cleaner_push", [], /permission denied/);
    await db.exec("reset role");
  });
  it("zones de demande : ménages en attente par code postal, choisir une zone déplace son centre", async () => {
    await job(); await job({ date: iso(2) });
    const z = (await q("select cleaner_zones($1) z", [tok(1)]))[0].z as any[];
    expect(z[0]).toMatchObject({ postal_code: "95300", open_jobs: 2 });
    await q("select cleaner_set_zone($1,'78000','Versailles',48.8049,2.1204)", [tok(1)]);
    expect((await q("select cleaner_overview($1) o", [tok(1)]))[0].o).toMatchObject({ postal_code: "78000", city: "Versailles", has_location: true, departments: ["78"] });
    await fails("select cleaner_set_zone($1,'7800','V',null,null)", [tok(1)], /code postal/);
    await q("select cleaner_set_zone($1,'95300','Pontoise',$2,$3)", [tok(1), HERE.lat, HERE.lng]);
    await q("delete from cleaning_jobs");
  });
});

describe("0048 — algorithme de distribution", () => {
  it("les plus proches en ligne passent d'abord : 3 premiers pendant 2 min, puis 10, puis tous", async () => {
    await q("delete from cleaners");
    await cleaner(1, NEAR); await cleaner(2, NEAR); await cleaner(3, HERE); await cleaner(4, MID); await cleaner(5, FAR);
    const j = await job();                                   // à l'instant
    const seen = await Promise.all([1, 2, 3, 4, 5].map(visible));
    expect(seen.map((s) => s.includes(j))).toEqual([true, true, true, false, false]);   // 1, 2, 3 = les mieux placés
    await q("update cleaning_jobs set created_at = now() - interval '3 minutes' where id = $1", [j]);
    expect((await Promise.all([4, 5].map(visible))).map((s) => s.includes(j))).toEqual([true, true]);
  });
  it("hors ligne : rien avant 5 minutes, puis le ménage devient visible dans la zone", async () => {
    await q("update cleaners set online = false where full_name = 'C1'");
    const j = await job({ ageMin: 1 });
    expect(await visible(1)).not.toContain(j);
    await q("update cleaning_jobs set created_at = now() - interval '6 minutes' where id = $1", [j]);
    expect(await visible(1)).toContain(j);
    await q("update cleaners set online = true where full_name = 'C1'");
  });
  it("accepter : un nettoyeur pas encore appelé est refusé ; le mieux placé est accepté", async () => {
    await q("delete from cleaning_jobs");
    const j = await job();
    await fails("select cleaner_accept_job($1,$2)", [tok(5), j], /mieux placés/);
    expect((await q("select cleaner_accept_job($1,$2) r", [tok(3), j]))[0].r).toMatchObject({ ok: true });
  });
  it("créneau déjà pris : plus éligible pour un autre ménage au même moment, mais libre un autre jour", async () => {
    const same = await job(), other = await job({ date: iso(2) });
    await q("update cleaning_jobs set created_at = now() - interval '10 minutes'");
    expect(await visible(3)).not.toContain(same);       // C3 a déjà accepté ce jour-là
    expect(await visible(3)).toContain(other);
    await fails("select cleaner_accept_job($1,$2)", [tok(3), same], /créneau/);
  });
  it("fiabilité et favori comptent : un favori passe devant un nettoyeur un peu plus proche", async () => {
    await q("delete from cleaning_jobs"); await q("delete from cleaner_favorites");
    await reset();                                           // C2 est le plus proche
    const j = await job();
    expect((await q("select dispatch_rank(c, j) r from cleaners c, cleaning_jobs j where c.full_name = 'C2' and j.id = $1", [j]))[0].r).toBe(1);
    await q("insert into cleaner_favorites(cleaner_id, client_id) values ($1,$2)", [C[1], client]);
    expect((await q("select dispatch_rank(c, j) r from cleaners c, cleaning_jobs j where c.full_name = 'C1' and j.id = $1", [j]))[0].r).toBe(1);
  });
  it("position récente utilisée à la place de l'adresse ; trop ancienne = adresse", async () => {
    await q("delete from cleaning_jobs"); await q("delete from cleaner_favorites");
    await reset();
    await q("update cleaners set last_lat = $1, last_lng = $2, last_seen_at = now() where full_name = 'C5'", [HERE.lat, HERE.lng]);     // C5 est en fait sur place
    const j = await job();
    expect((await q("select dispatch_rank(c, j) r from cleaners c, cleaning_jobs j where c.full_name = 'C5' and j.id = $1", [j]))[0].r).toBeLessThanOrEqual(2);
    await q("update cleaners set last_seen_at = now() - interval '1 hour' where full_name = 'C5'");
    expect((await q("select dispatch_rank(c, j) r from cleaners c, cleaning_jobs j where c.full_name = 'C5' and j.id = $1", [j]))[0].r).toBe(5);
  });
});

describe("0048 — notifications par vagues", () => {
  it("chaque nettoyeur est annoncé une seule fois, par vagues, et seulement s'il est en ligne", async () => {
    await q("delete from cleaning_jobs"); await q("delete from cleaning_offers");
    await reset();
    await q("update cleaners set online = false where full_name = 'C4'");
    await q("select cleaner_push_subscribe($1,'https://push.test/c2','k','a')", [tok(2)]);
    await job();
    let r = (await q("select automation_pending_notifications($1) r", [SECRET]))[0].r as any[];
    expect(r).toHaveLength(1); expect(r[0].targets.map((t: any) => t.name).sort()).toEqual(["C1", "C2", "C3"]);   // 1re vague : les 3 meilleurs
    expect(r[0].targets.find((t: any) => t.name === "C2").push).toHaveLength(1);
    expect((await q("select automation_pending_notifications($1) r", [SECRET]))[0].r).toHaveLength(0);   // rien de nouveau
    await q("update cleaning_jobs set created_at = now() - interval '3 minutes'");
    r = (await q("select automation_pending_notifications($1) r", [SECRET]))[0].r as any[];
    expect(r[0].targets.map((t: any) => t.name)).toEqual(["C5"]);                          // 2e vague : le reste des nettoyeurs en ligne (C4 est hors ligne)
    await fails("select automation_pending_notifications('faux')", [], /./);
  });
  it("ménage accepté ou annulé : plus d'annonce ; cadence limitée ; abonnement périmé supprimé", async () => {
    await q("update cleaning_jobs set status = 'acceptee'");
    await q("delete from cleaning_offers");
    expect((await q("select automation_pending_notifications($1) r", [SECRET]))[0].r).toHaveLength(0);
    await q("update marketplace_settings set last_tick_at = null");
    expect((await q("select automation_claim_tick($1,20) r", [SECRET]))[0].r).toBe(true);
    expect((await q("select automation_claim_tick($1,20) r", [SECRET]))[0].r).toBe(false);
    await q("select automation_drop_push($1,'https://push.test/c2')", [SECRET]);
    expect((await q("select count(*)::int n from cleaner_push where endpoint = 'https://push.test/c2'"))[0].n).toBe(0);
  });
});

describe("0049 — clés des notifications", () => {
  it("une seule paire, créée à la demande, secret exigé, aucune lecture directe", async () => {
    await fails("select automation_vapid_keys('faux','a','b')", [], /./);
    expect((await q("select automation_vapid_keys($1,'','') k", [SECRET]))[0].k).toBeNull();
    expect((await q("select automation_vapid_keys($1,'pub1','priv1') k", [SECRET]))[0].k).toEqual({ public: "pub1", private: "priv1" });
    expect((await q("select automation_vapid_keys($1,'pub2','priv2') k", [SECRET]))[0].k).toEqual({ public: "pub1", private: "priv1" });
    await db.exec("set role anon");
    await fails("select * from vapid_keys", [], /permission denied/);
    await db.exec("reset role");
  });
});
