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
const C = "00000000-0000-0000-0000-0000000000c1";
const iso = (n: number, base: string) => new Date(Date.parse(base + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
let today: string, sa: string, sb: string, s1: string, s2: string;
const mission = async (staff: string, site: string, date: string, stage: string, time: string | null = null) =>
  (await q("insert into interventions(client_id, site_id, title, scheduled_date, staff_id, unit_price_ht, stage, start_time) values ($1,$2,'Passage',$3,$4,100,$5,$6) returning id", [C, site, date, staff, stage, time]))[0].id as string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0016_pointage_gps.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  await db.exec(read("supabase/migrations/0041_agent_app.sql"));
  await db.exec(read("supabase/migrations/0041_agent_app.sql")); // rejouable
  today = (await q("select (now() at time zone 'Europe/Paris')::date d"))[0].d.toISOString().slice(0, 10);
  await q("insert into clients(id, name, address, city) values ($1,'Client Secret SA','1 rue A','Paris')", [C]);
  sa = (await q("insert into staff(full_name, email, agent_token_hash) values ('Fatou D','fatou@exemple.test',$1) returning id", [hash(TA)]))[0].id;
  sb = (await q("insert into staff(full_name, agent_token_hash) values ('Karim B',$1) returning id", [hash(TB)]))[0].id;
  s1 = (await q("insert into sites(client_id, name, address, city) values ($1,'Bureaux A','1 rue A','Paris') returning id", [C]))[0].id;
  s2 = (await q("insert into sites(client_id, name, address, city) values ($1,'Bureaux B','2 rue B','Paris') returning id", [C]))[0].id;
});

describe("0041 — application des agents", () => {
  it("refuse un jeton invalide sur chaque nouvelle fonction, avec le même message", async () => {
    for (const sql of ["select agent_day($1)", "select agent_report($1)", "select agent_profile($1)", "select agent_request_deletion($1)", "select agent_mission($1, gen_random_uuid())"])
      await fails(sql, ["x".repeat(64)], /ACCES_REFUSE: lien invalide ou expiré/);
  });
  it("la journée ne contient que les missions de l'agent, triées par heure, avec le détail complet", async () => {
    const m2 = await mission(sa, s1, today, "planifiee", "14:00");
    const m1 = await mission(sa, s1, today, "planifiee", "08:30");
    await mission(sb, s2, today, "planifiee", "09:00");
    const r = (await q("select agent_day($1, $2) r", [TA, today]))[0].r;
    expect(r.missions.map((m: any) => m.id)).toEqual([m1, m2]);
    expect(r.missions[0]).toMatchObject({ client: "Client Secret SA", site: "Bureaux A" });
    expect(JSON.stringify(r)).not.toContain("Karim");
  });
  it("on peut consulter un jour passé, mais pas une date hors période", async () => {
    await mission(sa, s1, iso(-3, today), "validee", "10:00");
    expect((await q("select agent_day($1, $2) r", [TA, iso(-3, today)]))[0].r.missions).toHaveLength(1);
    await fails("select agent_day($1, $2)", [TA, iso(-400, today)], /ARGUMENT/);
    await fails("select agent_day($1, $2)", [TA, iso(500, today)], /ARGUMENT/);
    expect((await q("select agent_day($1) r", [TA]))[0].r.date).toBe(today);   // sans date : aujourd'hui
  });
  it("une mission d'un autre agent reste introuvable", async () => {
    const other = (await q("select id from interventions where staff_id = $1 limit 1", [sb]))[0].id;
    await fails("select agent_mission($1, $2)", [TA, other], /INTROUVABLE/);
    const mine = (await q("select id from interventions where staff_id = $1 limit 1", [sa]))[0].id;
    expect((await q("select agent_mission($1, $2) r", [TA, mine]))[0].r.mission.id).toBe(mine);
  });
  it("le rapport compte validées, terminées, annulées et sites contrôlés — rien du futur ni d'un autre agent", async () => {
    await mission(sa, s2, iso(-5, today), "validee");
    await mission(sa, s2, iso(-6, today), "terminee");
    await mission(sa, s1, iso(-7, today), "annulee");
    await mission(sa, s1, iso(4, today), "planifiee");     // dans le futur : ignorée
    const r = (await q("select agent_report($1) r", [TA]))[0].r;
    expect(r).toMatchObject({ done: 3, validated: 2, cancelled: 1, sites_checked: 2, rate: 67 });
    expect(r.recent.length).toBeGreaterThanOrEqual(4);
    expect(r.recent[0].date >= r.recent[r.recent.length - 1].date).toBe(true);
    const rb = (await q("select agent_report($1) r", [TB]))[0].r;
    expect(rb).toMatchObject({ done: 0, validated: 0, rate: 0 });
  });
  it("profil : identité, missions terminées et coordonnées du responsable ; demande d'effacement enregistrée une fois", async () => {
    const p = (await q("select agent_profile($1) r", [TA]))[0].r;
    expect(p).toMatchObject({ name: "Fatou D", email: "fatou@exemple.test", missions_done: 3, deletion_requested_at: null });
    expect(p.company_name).toBeTruthy();
    await q("select agent_request_deletion($1)", [TA]);
    const t1 = (await q("select deletion_requested_at t from staff where id = $1", [sa]))[0].t;
    await q("select agent_request_deletion($1)", [TA]);
    expect((await q("select deletion_requested_at t from staff where id = $1", [sa]))[0].t).toEqual(t1);
    expect((await q("select deletion_requested_at t from staff where id = $1", [sb]))[0].t).toBeNull();
  });
  it("les fonctions internes ne sont pas appelables par un agent", async () => {
    await db.exec("set role anon");
    await expect(db.query("select agent_mission_obj(gen_random_uuid())")).rejects.toThrow();
    await db.exec("reset role");
  });
});
