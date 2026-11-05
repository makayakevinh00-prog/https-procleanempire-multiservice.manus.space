import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const read = (p: string) => readFileSync(path.join(__dirname, "..", p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const fails = (sql: string, params: any[], re: RegExp) => expect(db.query(sql, params)).rejects.toThrow(re);
const TOKEN = "c".repeat(64);
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const C = "00000000-0000-0000-0000-0000000000c2";
// Site : 3 rue Stéphane Charbonnier, Pontoise
const SITE = { lat: 49.047349, lng: 2.094571 };
let staffId: string, siteGps: string, siteNoGps: string, m1: string, m2: string, m3: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;`);
  for (const f of ["0001_schema", "0002_automation", "0003_automation_reminders", "0004_reliability", "0005_draft_clients", "0006_sites_staff_missions", "0007_process_links", "0008_agent_mobile", "0016_pointage_gps"]) {
    await db.exec(read(`supabase/migrations/${f}.sql`));
  }
  await db.exec(read("supabase/seed.sql"));
  await q("insert into clients(id, name, address, city) values ($1,'Client Test','3 rue A','Pontoise')", [C]);
  staffId = (await q("insert into staff(full_name, agent_token_hash) values ('Esma T',$1) returning id", [hash(TOKEN)]))[0].id;
  siteGps = (await q("insert into sites(client_id, name, address, city, lat, lng, geofence_m, checklist) values ($1,'Site GPS','3 rue A','Pontoise',$2,$3,150,'[\"Sols\"]') returning id", [C, SITE.lat, SITE.lng]))[0].id;
  siteNoGps = (await q("insert into sites(client_id, name, address, city) values ($1,'Site sans GPS','4 rue B','Pontoise') returning id", [C]))[0].id;
  const today = (await q("select (now() at time zone 'Europe/Paris')::date d"))[0].d.toISOString().slice(0, 10);
  const mk = async (site: string, title: string) => (await q("insert into interventions(client_id, site_id, title, scheduled_date, staff_id, unit_price_ht) values ($1,$2,$3,$4,$5,100) returning id", [C, site, title, today, staffId]))[0].id;
  m1 = await mk(siteGps, "M1"); m2 = await mk(siteNoGps, "M2"); m3 = await mk(siteGps, "M3");
});

describe("pointage GPS à l'arrivée", () => {
  it("distance entre deux points (Pontoise → Cergy ≈ 4–6 km)", async () => {
    const d = (await q("select geo_distance_m(49.047349, 2.094571, 49.0364, 2.0760) d"))[0].d;
    expect(d).toBeGreaterThan(1500); expect(d).toBeLessThan(2500);
    expect((await q("select geo_distance_m(49.0, 2.0, 49.0, 2.0) d"))[0].d).toBe(0);
  });
  it("refuse une arrivée trop loin du site, sans rien enregistrer", async () => {
    await fails("select agent_check_in($1,$2,49.0364,2.0760,10)", [TOKEN, m1], /TROP_LOIN: vous êtes à environ \d+ m du site \(rayon autorisé : 150 m\)/);
    const [m] = await q("select arrived_at, stage from interventions where id=$1", [m1]);
    expect(m.arrived_at).toBeNull();
  });
  it("refuse une arrivée sans position", async () => {
    await fails("select agent_check_in($1,$2,null,null,null)", [TOKEN, m1], /POSITION_ABSENTE/);
  });
  it("accepte une arrivée dans le rayon : heure, distance, vérifiée, étape « arrivée »", async () => {
    const r = (await q("select agent_check_in($1,$2,$3,$4,12) r", [TOKEN, m1, SITE.lat + 0.0003, SITE.lng]))[0].r;
    expect(r.ok).toBe(true); expect(r.verified).toBe(true); expect(r.distance_m).toBeLessThan(60);
    const [m] = await q("select arrived_at, arrived_verified, stage from interventions where id=$1", [m1]);
    expect(m.arrived_at).not.toBeNull(); expect(m.arrived_verified).toBe(true); expect(m.stage).toBe("arrivee");
  });
  it("une 2e arrivée ne change pas l'heure déjà enregistrée", async () => {
    const before = (await q("select arrived_at from interventions where id=$1", [m1]))[0].arrived_at;
    const r = (await q("select agent_check_in($1,$2,$3,$4,12) r", [TOKEN, m1, SITE.lat, SITE.lng]))[0].r;
    expect(r.already).toBe(true);
    expect((await q("select arrived_at from interventions where id=$1", [m1]))[0].arrived_at).toEqual(before);
  });
  it("site sans position GPS : arrivée enregistrée « non vérifiée »", async () => {
    const r = (await q("select agent_check_in($1,$2,49.05,2.1,20) r", [TOKEN, m2]))[0].r;
    expect(r.verified).toBe(false);
    expect((await q("select arrived_verified from interventions where id=$1", [m2]))[0].arrived_verified).toBe(false);
  });
  it("un autre agent (ou un faux jeton) ne peut pas pointer sur cette mission", async () => {
    await fails("select agent_check_in($1,$2,49.0,2.0,5)", ["d".repeat(64), m3], /ACCES_REFUSE/);
  });
});

describe("fin de mission et départ", () => {
  it("la fin est refusée si la check-list n'est pas complète, puis enregistre l'heure de départ", async () => {
    await fails("select agent_finish($1,$2,null,null,null)", [TOKEN, m1], /CHECKLIST_INCOMPLETE/);
    await q("select agent_toggle_check($1,$2,0,true)", [TOKEN, m1]);
    const r = (await q("select agent_finish($1,$2,$3,$4,10) r", [TOKEN, m1, SITE.lat, SITE.lng]))[0].r;
    expect(r.ok).toBe(true); expect(r.verified).toBe(true);
    const [m] = await q("select departed_at, departed_verified, stage from interventions where id=$1", [m1]);
    expect(m.departed_at).not.toBeNull(); expect(m.stage).toBe("terminee");
  });
  it("agent_missions expose arrivée et départ", async () => {
    const r = (await q("select agent_missions($1) r", [TOKEN]))[0].r;
    const x = r.missions.find((m: any) => m.id === m1);
    expect(x.arrived_at).not.toBeNull(); expect(x.departed_at).not.toBeNull(); expect(x.arrived_verified).toBe(true);
  });
});
