import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { parisToday } from "../src/lib/domain/dates";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const SECRET = "secret-de-test-123";
const TA = "a".repeat(64), TB = "b".repeat(64), PARTNER = "c".repeat(64), OTHER = "d".repeat(64);
const DEST = { lat: 48.8738, lng: 2.285 }, P1 = { lat: 49.0508, lng: 2.1008 }, P2 = { lat: 48.95, lng: 2.2 };
let owner: string, stranger: string, A: string, job: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  const all = readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql")).sort();
  for (const f of all.filter((x) => x <= "0038_conciergerie.sql")) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of all.filter((x) => x > "0038_conciergerie.sql" && x < "0074")) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0074_suivi_direct.sql"));
  await db.exec(read("supabase/migrations/0074_suivi_direct.sql")); // rejouable
  await q("update app_settings set automation_secret = $1", [SECRET]);
  owner = (await q("insert into clients(name, postal_code, city, address) values ('Propriétaire','75016','Paris','1 rue A') returning id"))[0].id;
  stranger = (await q("insert into clients(name) values ('Autre client') returning id"))[0].id;
  await q("insert into partner_access(client_id, token_hash) values ($1,$2), ($3,$4)", [owner, hash(PARTNER), stranger, hash(OTHER)]);
  A = (await q("insert into cleaners(full_name, email, siret, departments, status, token_hash, online, lat, lng) values ('Léa Martin','lea@x.test','12345678900011','{95}','actif',$1,true,$2,$3) returning id", [hash(TA), P1.lat, P1.lng]))[0].id;
  await q("insert into cleaners(full_name, email, siret, departments, status, token_hash) values ('Bob Autre','bob@x.test','12345678900029','{95}','actif',$1)", [hash(TB)]);
  // Créneau qui entoure l'heure courante de Paris : le ménage est « en route » quel que soit le moment où le test tourne.
  job = (await q(`insert into cleaning_jobs(client_id, title, job_date, window_start, window_end, postal_code, city, price_ht, status, cleaner_id, lat, lng)
    values ($1,'Ménage Paris 16e',$2, greatest((now() at time zone 'Europe/Paris')::time - interval '5 minutes', time '00:00'), time '23:59:59','75016','Paris',100,'acceptee',$3,$4,$5) returning id`, [owner, parisToday(), A, DEST.lat, DEST.lng]))[0].id;
});

describe("0074 — suivi en direct", () => {
  it("avant le départ : rien n'est montré du nettoyeur", async () => {
    const l = (await q("select partner_live($1) l", [PARTNER]))[0].l;
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ moving: false, pos: null, trail: [], cleaner: "Léa", eta_at: null });
  });
  it("le nettoyeur voit son ménage du jour ; un autre nettoyeur ne voit rien", async () => {
    expect((await q("select cleaner_trip($1) t", [TA]))[0].t).toMatchObject({ job, started: false, has_dest: true });
    expect((await q("select cleaner_trip($1) t", [TB]))[0].t).toBeNull();
  });
  it("position envoyée : le trajet démarre, un point est enregistré, l'heure d'arrivée est à calculer", async () => {
    const r = (await q("select cleaner_trip_ping($1,$2,$3) r", [TA, P1.lat, P1.lng]))[0].r;
    expect(r).toMatchObject({ job, need_eta: true, dest_lat: DEST.lat });
    await q("select cleaner_trip_ping($1,$2,$3)", [TA, P2.lat, P2.lng]); // moins de 20 s après : pas de second point
    expect((await q("select count(*)::int n from cleaner_trail where job_id = $1", [job]))[0].n).toBe(1);
    await q("update cleaner_trail set at = at - interval '30 seconds'");
    await q("select cleaner_trip_ping($1,$2,$3)", [TA, P2.lat, P2.lng]);
    expect((await q("select count(*)::int n from cleaner_trail where job_id = $1", [job]))[0].n).toBe(2);
  });
  it("heure d'arrivée : seul le nettoyeur du ménage peut la fixer", async () => {
    await q("select cleaner_set_eta($1,$2,35,'trafic')", [TB, job]);
    expect((await q("select eta_minutes from cleaning_jobs where id = $1", [job]))[0].eta_minutes).toBeNull();
    await q("select cleaner_set_eta($1,$2,35,'trafic')", [TA, job]);
    expect((await q("select cleaner_trip_ping($1,$2,$3) r", [TA, P2.lat, P2.lng]))[0].r.need_eta).toBe(false);
  });
  it("pendant le trajet : le propriétaire voit la position, le tracé et l'heure d'arrivée ; un autre client ne voit rien", async () => {
    const l = (await q("select partner_live($1) l", [PARTNER]))[0].l[0];
    expect(l).toMatchObject({ moving: true, eta_minutes: 35, eta_traffic: true, pos: [P2.lat, P2.lng], dest: [DEST.lat, DEST.lng] });
    expect(l.trail).toEqual([[P1.lat, P1.lng], [P2.lat, P2.lng]]);
    expect((await q("select partner_live($1) l", [OTHER]))[0].l).toEqual([]);
    await expect(db.query("select partner_live($1)", ["e".repeat(64)])).rejects.toThrow(/ACCES_REFUSE/);
  });
  it("la direction seule lit le suivi général", async () => {
    await expect(db.query("select admin_live()")).rejects.toThrow(/ACCES_REFUSE/);
  });
  it("une fois sur place : la position et le tracé ne sortent plus", async () => {
    await q("update cleaning_jobs set arrived_at = now() where id = $1", [job]);
    const l = (await q("select partner_live($1) l", [PARTNER]))[0].l[0];
    expect(l).toMatchObject({ moving: false, pos: null, trail: [], eta_at: null });
    expect(l.arrived_at).toBeTruthy();
    expect((await q("select cleaner_trip_ping($1,$2,$3) r", [TA, P2.lat, P2.lng]))[0].r).toBeNull();
    expect((await q("select count(*)::int n from cleaner_trail where job_id = $1", [job]))[0].n).toBe(2);
  });
  it("rappel de départ : proposé une seule fois, jamais après le départ", async () => {
    const j2 = (await q(`insert into cleaning_jobs(client_id, title, job_date, window_start, window_end, postal_code, city, price_ht, status, cleaner_id, lat, lng)
      values ($1,'Second ménage',$2, (now() at time zone 'Europe/Paris')::time + interval '40 minutes', (now() at time zone 'Europe/Paris')::time + interval '50 minutes','75016','Paris',100,'acceptee',$3,$4,$5) returning id`, [owner, parisToday(), A, DEST.lat, DEST.lng]).catch(() => [{ id: null }]))[0].id;
    if (!j2) return; // entre 23 h 10 et minuit, le créneau déborderait sur le lendemain
    const c = (await q("select automation_departure_candidates($1) c", [SECRET]))[0].c as any[];
    expect(c.map((x) => x.job)).toEqual([j2]);
    expect(c[0]).toMatchObject({ dest_lat: DEST.lat, name: "Léa Martin" });
    expect(c[0].minutes_left).toBeGreaterThan(35);
    expect((await q("select automation_mark_departure($1,$2) ok", [SECRET, j2]))[0].ok).toBe(true);
    expect((await q("select automation_mark_departure($1,$2) ok", [SECRET, j2]))[0].ok).toBe(false);
    expect((await q("select automation_departure_candidates($1) c", [SECRET]))[0].c).toEqual([]);
    await expect(db.query("select automation_departure_candidates('mauvais')")).rejects.toThrow();
  });
  it("les points de trajet de plus de 7 jours sont effacés", async () => {
    await q("update cleaner_trail set at = now() - interval '8 days' where id = (select min(id) from cleaner_trail)");
    await q("select automation_purge_trail($1)", [SECRET]);
    expect((await q("select count(*)::int n from cleaner_trail"))[0].n).toBe(1);
  });
});
