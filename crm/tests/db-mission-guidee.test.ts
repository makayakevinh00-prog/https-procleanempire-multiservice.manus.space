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
const fails = async (sql: string, params: any[], re: RegExp) => { await expect(db.query(sql, params)).rejects.toThrow(re); };
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const SECRET = "secret-de-test-123", TA = "a".repeat(64);
const PIX = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
let owner: string, cleaner: string;

const newJob = async (status = "acceptee") => (await q(`insert into cleaning_jobs(client_id, title, job_date, window_start, window_end, postal_code, city, price_ht, status, cleaner_id)
  values ($1,'Ménage test',$2, time '00:00', time '23:59:59','95300','Pontoise',30,$3,$4) returning id`, [owner, parisToday(), status, cleaner]))[0].id as string;
const tasksOf = async (j: string) => (await q("select checklist c from cleaning_jobs where id = $1", [j]))[0].c as { label: string; done: boolean }[];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  const all = readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql")).sort();
  for (const f of all.filter((x) => x <= "0038_conciergerie.sql")) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of all.filter((x) => x > "0038_conciergerie.sql" && x < "0074")) await db.exec(read(`supabase/migrations/${f}`));
  for (const f of ["0074_suivi_direct.sql", "0075_controle_video.sql", "0076_mission_guidee.sql", "0076_mission_guidee.sql"]) await db.exec(read(`supabase/migrations/${f}`)); // 0076 rejouable
  await q("update app_settings set automation_secret = $1", [SECRET]);
  owner = (await q("insert into clients(name, postal_code, city, address) values ('Test','95300','Pontoise','3 rue A') returning id"))[0].id;
  cleaner = (await q("insert into cleaners(full_name, email, siret, departments, status, token_hash) values ('Léa Martin','lea@x.test','12345678900011','{95}','actif',$1) returning id", [hash(TA)]))[0].id;
});

describe("0076 — mission guidée", () => {
  it("l'IA reçoit les captures dans l'ordre du film, 16 au plus (les plus récentes)", async () => {
    const j = await newJob();
    for (let i = 0; i < 20; i++) await q("select cleaner_add_photo($1,$2,'avant','image/jpeg',$3)", [TA, j, PIX]);
    await q("update cleaning_job_photos set created_at = now() - (interval '1 minute' * (21 - rn)) from (select id, row_number() over (order by created_at, id) rn from cleaning_job_photos where job_id = $1) o where cleaning_job_photos.id = o.id", [j]);
    const p = (await q("select automation_job_photos($1,$2,'avant') p", [SECRET, j]))[0].p as any[];
    expect(p).toHaveLength(16);
    const ids = (await q("select id from cleaning_job_photos where job_id = $1 order by created_at", [j])).map((r) => r.id).slice(-16);
    const got = (await q("select id from cleaning_job_photos where job_id = $1 order by created_at", [j])).map((r) => r.id);
    expect(got.slice(-16)).toEqual(ids); // même ordre de film
  });

  it("l'IA fixe la liste des tâches dans l'ordre ; refusée sans le secret", async () => {
    const j = await newJob();
    await fails("select automation_set_job_tasks('mauvais',$1,'[\"a\"]'::jsonb)", [j], /ACCES_REFUSE/);
    await q("select automation_set_job_tasks($1,$2,$3::jsonb)", [SECRET, j, JSON.stringify(["Aérer", "  ", "Cuisine : dégraisser la plaque", "Sols en dernier"])]);
    expect(await tasksOf(j)).toEqual([{ label: "Aérer", done: false }, { label: "Cuisine : dégraisser la plaque", done: false }, { label: "Sols en dernier", done: false }]);
    expect((await q("select cleaner_checklists($1) c", [TA]))[0].c[j]).toHaveLength(3);
  });

  it("ne remplace pas une liste déjà entamée, ni celle d'un ménage terminé, ni plus de 14 tâches", async () => {
    const j = await newJob();
    await q("select automation_set_job_tasks($1,$2,$3::jsonb)", [SECRET, j, JSON.stringify(["Une", "Deux"])]);
    await q("select cleaner_check_task($1,$2,0,true)", [TA, j]);
    await q("select automation_set_job_tasks($1,$2,$3::jsonb)", [SECRET, j, JSON.stringify(["Autre"])]);
    expect((await tasksOf(j)).map((t) => t.label)).toEqual(["Une", "Deux"]);
    const done = await newJob("a_verifier");
    await q("select automation_set_job_tasks($1,$2,$3::jsonb)", [SECRET, done, JSON.stringify(["X"])]);
    expect((await tasksOf(done)).map((t) => t.label)).not.toContain("X");
    const big = await newJob();
    await q("select automation_set_job_tasks($1,$2,$3::jsonb)", [SECRET, big, JSON.stringify(Array.from({ length: 30 }, (_, i) => `t${i}`))]);
    expect(await tasksOf(big)).toHaveLength(14);
    await q("select automation_set_job_tasks($1,$2,'[]'::jsonb)", [SECRET, big]);
    expect(await tasksOf(big)).toHaveLength(14); // liste vide : on garde l'existante
  });

  it("des captures tirées d'une vidéo (sans pièce) suffisent pour terminer ; l'IA les classe", async () => {
    const j = await newJob();
    for (let i = 0; i < 6; i++) { await q("select cleaner_add_photo($1,$2,'avant','image/jpeg',$3)", [TA, j, PIX]); await q("select cleaner_add_photo($1,$2,'apres','image/jpeg',$3)", [TA, j, PIX]); }
    expect((await q("select cleaning_missing_rooms($1) m", [j]))[0].m).toBeNull();
    await q("select cleaner_finish_job($1,$2,$3)", [TA, j, "Fin filmée : tâches contrôlées par l'IA d'après la vidéo."]);
    expect((await q("select status from cleaning_jobs where id = $1", [j]))[0].status).toBe("a_verifier");
  });

  it("sans film d'arrivée ou de fin, le ménage n'est pas considéré comme photographié", async () => {
    const j = await newJob();
    await q("select cleaner_add_photo($1,$2,'avant','image/jpeg',$3)", [TA, j, PIX]);
    expect((await q("select cleaning_missing_rooms($1) m", [j]))[0].m).toMatch(/Cuisine/);
  });
});

describe("0077 — photo du nettoyeur", () => {
  beforeAll(async () => { await db.exec(read("supabase/migrations/0077_photo_nettoyeur.sql")); await db.exec(read("supabase/migrations/0077_photo_nettoyeur.sql")); });
  it("enregistre un JPEG, le relit, le retire ; refuse un autre format ou un lien inconnu", async () => {
    expect((await q("select cleaner_avatar($1) a", [TA]))[0].a).toBeNull();
    await q("select cleaner_set_avatar($1,$2)", [TA, PIX]);
    expect((await q("select cleaner_avatar($1) a", [TA]))[0].a).toBe(PIX);
    await fails("select cleaner_set_avatar($1,$2)", [TA, Buffer.from("pas une image").toString("base64")], /PHOTO_FORMAT/);
    await fails("select cleaner_set_avatar($1,$2)", [TA, Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(150_001)]).toString("base64")], /PHOTO_TROP_LOURDE/);
    await fails("select cleaner_avatar($1)", ["f".repeat(64)], /.+/);
    await q("select cleaner_set_avatar($1,'')", [TA]);
    expect((await q("select cleaner_avatar($1) a", [TA]))[0].a).toBeNull();
  });
});

describe("0078 — l'IA connaît le lieu", () => {
  it("la migration se rejoue sans erreur", async () => {
    await db.exec(read("supabase/migrations/0078_ia_connait_le_lieu.sql"));
    await db.exec(read("supabase/migrations/0078_ia_connait_le_lieu.sql"));
  });
});

describe("0079 — agents ProClean : film, IA et rotation du site", () => {
  const TS = "c".repeat(64);
  let staff: string, site: string;
  const mission = async () => (await q("insert into interventions(client_id, site_id, title, scheduled_date, staff_id, unit_price_ht, stage) values ($1,$2,'Passage',$3,$4,100,'planifiee') returning id", [owner, site, parisToday(), staff]))[0].id as string;
  beforeAll(async () => {
    await db.exec(read("supabase/migrations/0079_agent_film_ia.sql"));
    await db.exec(read("supabase/migrations/0079_agent_film_ia.sql")); // rejouable
    await q("select set_config('app.automation_secret', $1, false)", [SECRET]).catch(() => undefined);
    staff = (await q("insert into staff(full_name, agent_token_hash) values ('Agent Film',$1) returning id", [hash(TS)]))[0].id;
    site = (await q(`insert into sites(client_id, name, rotation) values ($1,'Boutique test','{"items":["Étagère 1","Étagère 2"],"next":0}') returning id`, [owner]))[0].id;
  });
  it("à l'arrivée, la mission reçoit l'élément du jour et le site passe au suivant, une seule fois", async () => {
    const a = await mission(), b = await mission(), c = await mission();
    await q("update interventions set arrived_at = now() where id = $1", [a]);
    await q("update interventions set arrived_at = now() where id = $1", [a]); // rien ne bouge au second pointage
    await q("update interventions set arrived_at = now() where id = $1", [b]);
    await q("update interventions set arrived_at = now() where id = $1", [c]);
    const got = async (id: string) => (await q("select rotation_item r from interventions where id = $1", [id]))[0].r;
    expect([await got(a), await got(b), await got(c)]).toEqual(["Étagère 1", "Étagère 2", "Étagère 1"]);
    expect((await q("select rotation->>'next' n from sites where id = $1", [site]))[0].n).toBe("1");
  });
  it("la mission vue par l'agent porte les films, le relevé et l'élément du jour ; 60 images au plus", async () => {
    const m = await mission();
    await q("select agent_add_photo($1,$2,'avant','image/jpeg',$3)", [TS, m, PIX]);
    const o = (await q("select agent_mission($1,$2) j", [TS, m]))[0].j.mission;
    expect([o.photos_before, o.photos_after, o.before_report, o.ai_status]).toEqual([1, 0, null, null]);
    expect((await q("select agent_can_analyse($1,$2) ok", [TS, m]))[0].ok).toBe(true);
    await q("insert into mission_photos(intervention_id, staff_id, kind, content_type, size_bytes, data) select $1,$2,'avant','image/jpeg',3,'\\xffd8ff' from generate_series(1,59)", [m, staff]);
    await fails("select agent_add_photo($1,$2,'avant','image/jpeg',$3)", [TS, m, PIX], /60 images/);
  });
  it("l'IA lit le site et ses images ; ses tâches deviennent la check-list seulement si elle est vide ou déjà de l'IA, et le site s'en souvient", async () => {
    const m = await mission();
    await q("select agent_add_photo($1,$2,'avant','image/jpeg',$3)", [TS, m, PIX]);
    await fails("select automation_mission_brief('mauvais',$1)", [m], /ACCES_REFUSE/);
    const b = (await q("select automation_mission_brief($1,$2) j", [SECRET, m]))[0].j;
    expect([b.site, b.has_site, b.agent]).toEqual(["Boutique test", true, "Agent"]);
    const ph = (await q("select automation_mission_photos($1,$2,'avant') j", [SECRET, m]))[0].j;
    expect(ph).toHaveLength(1);
    expect(ph[0].b64).not.toMatch(/\s/);
    await q("select automation_set_mission_analysis($1,$2,'avant',$3,null,$4,$5)", [SECRET, m, { seen: "Une boutique" }, JSON.stringify(["Étagère 1 : dépoussiérer", "Sol : laver"]), { visits: 1, zones: ["Boutique"], recurring: [], last: [] }]);
    let row = (await q("select checklist c, before_report r, (select visit_memory from sites where id = $2) mem from interventions where id = $1", [m, site]))[0];
    expect(row.c.map((x: any) => [x.label, x.done, x.ai])).toEqual([["Étagère 1 : dépoussiérer", false, true], ["Sol : laver", false, true]]);
    expect([row.r.seen, row.mem.visits]).toEqual(["Une boutique", 1]);
    // Une tâche cochée : la liste ne bouge plus.
    await q("select agent_toggle_check($1,$2,0,true)", [TS, m]);
    await q("select automation_set_mission_analysis($1,$2,'avant',$3,null,$4,null)", [SECRET, m, { seen: "Bis" }, JSON.stringify(["Autre"])]);
    row = (await q("select checklist c from interventions where id = $1", [m]))[0];
    expect(row.c).toHaveLength(2);
    // Check-list du site (pas de l'IA) : jamais remplacée.
    const m2 = await mission();
    await q(`update interventions set checklist = '[{"label":"Vider les poubelles","done":false}]' where id = $1`, [m2]);
    await q("select automation_set_mission_analysis($1,$2,'avant',$3,null,$4,null)", [SECRET, m2, { seen: "x" }, JSON.stringify(["Autre"])]);
    expect((await q("select checklist c from interventions where id = $1", [m2]))[0].c[0].label).toBe("Vider les poubelles");
    await q("select automation_set_mission_analysis($1,$2,'apres',$3,'reprise',null,null)", [SECRET, m2, { verdict: "reprise", summary: "À revoir" }]);
    expect((await q("select ai_status s, stage from interventions where id = $1", [m2]))[0]).toEqual({ s: "reprise", stage: "affectee" });
  });
});

describe("0080 — stock de produits", () => {
  const TS = "d".repeat(64);
  let staff: string, site: string, m: string, bare: string;
  beforeAll(async () => {
    await db.exec(read("supabase/migrations/0080_stock_produits.sql"));
    await db.exec(read("supabase/migrations/0080_stock_produits.sql")); // rejouable
    staff = (await q("insert into staff(full_name, agent_token_hash) values ('Agent Stock',$1) returning id", [hash(TS)]))[0].id;
    site = (await q("insert into sites(client_id, name) values ($1,'Site stock') returning id", [owner]))[0].id;
    m = (await q("insert into interventions(client_id, site_id, title, scheduled_date, staff_id, unit_price_ht) values ($1,$2,'Passage',$3,$4,100) returning id", [owner, site, parisToday(), staff]))[0].id;
    bare = (await q("insert into interventions(client_id, title, scheduled_date, staff_id, unit_price_ht) values ($1,'Sans site',$2,$3,100) returning id", [owner, parisToday(), staff]))[0].id;
  });
  it("le stock est celui du site de la mission, sinon de l'agent, sinon du nettoyeur ; le lien privé est vérifié", async () => {
    expect((await q("select stock_status('agent',$1,$2) j", [TS, m]))[0].j).toMatchObject({ kind: "site", due: true, last: null });
    expect((await q("select stock_status('agent',$1,$2) j", [TS, bare]))[0].j.kind).toBe("staff");
    expect((await q("select stock_status('nettoyeur',$1,$2) j", [TA, m]))[0].j.kind).toBe("cleaner");
    await fails("select stock_status('agent',$1,$2)", ["f".repeat(64), m], /.+/);
    await fails("select stock_status('agent',$1,$2)", [TS, "00000000-0000-0000-0000-000000000000"], /INTROUVABLE/);
  });
  it("film, comptage enregistré, images effacées, prochain comptage plus tard", async () => {
    await q("select stock_add_frame('agent',$1,$2,'image/jpeg',$3,true)", [TS, m, PIX]);
    await q("select stock_add_frame('agent',$1,$2,'image/jpeg',$3,false)", [TS, m, PIX]);
    await q("select stock_add_frame('agent',$1,$2,'image/jpeg',$3,true)", [TS, m, PIX]); // nouveau film : l'ancien est écarté
    const inp = (await q("select automation_stock_input($1,'site',$2) j", [SECRET, site]))[0].j;
    expect([inp.label, inp.frames.length, inp.previous]).toEqual(["Site stock", 1, null]);
    expect(inp.frames[0].b64).not.toMatch(/\s/);
    await fails("select automation_stock_input('mauvais','site',$1)", [site], /ACCES_REFUSE/);
    await q("select automation_stock_save($1,'site',$2,'Agent Stock',$3,'Stock correct',$4)", [SECRET, site, JSON.stringify([{ name: "Javel", left: 1, unit: "bidon", buy: true }]), "2099-01-01"]);
    const st = (await q("select stock_status('agent',$1,$2) j", [TS, m]))[0].j;
    expect([st.due, st.last.items[0].name, st.last.next_due]).toEqual([false, "Javel", "2099-01-01"]);
    expect((await q("select count(*)::int n from stock_frames"))[0].n).toBe(0);
  });
});

describe("0081 — trajet des agents et itinéraire", () => {
  const TS = "e".repeat(64);
  let site: string, m: string;
  beforeAll(async () => {
    await db.exec(read("supabase/migrations/0081_trajet_itineraire.sql"));
    await db.exec(read("supabase/migrations/0081_trajet_itineraire.sql")); // rejouable
    const staff = (await q("insert into staff(full_name, agent_token_hash) values ('Awa Trajet',$1) returning id", [hash(TS)]))[0].id;
    site = (await q("insert into sites(client_id, name, lat, lng) values ($1,'Boutique',48.99,2.52) returning id", [owner]))[0].id;
    m = (await q("insert into interventions(client_id, site_id, title, scheduled_date, staff_id, unit_price_ht) values ($1,$2,'Passage',$3,$4,100) returning id", [owner, site, parisToday(), staff]))[0].id;
  });
  it("rien n'est enregistré avant le départ ; en route, position, heure d'arrivée et tracé sont partagés", async () => {
    expect((await q("select agent_trip_ping($1,$2,48.9,2.4) j", [TS, m]))[0].j).toBeNull();
    expect((await q("select count(*)::int n from mission_trips"))[0].n).toBe(0);
    await q("update interventions set stage = 'en_route' where id = $1", [m]);
    const p = (await q("select agent_trip_ping($1,$2,48.9,2.4) j", [TS, m]))[0].j;
    expect(p).toMatchObject({ dest_lat: 48.99, dest_lng: 2.52, need_eta: true });
    await q("select agent_trip_eta($1,$2,25,'transports')", [TS, m]);
    expect((await q("select agent_trip_ping($1,$2,48.95,2.45) j", [TS, m]))[0].j.need_eta).toBe(false);
    const live = (await q("select mission_live(i) j from interventions i where id = $1", [m]))[0].j;
    expect(live).toMatchObject({ title: "Boutique", cleaner: "Awa", moving: true, pos: [48.95, 2.45], eta_minutes: 25, mode: "transports", eta_traffic: false, agent: true });
    await fails("select agent_trip_ping($1,$2,48.9,2.4)", ["f".repeat(64), m], /.+/);
    await fails("select agent_trip_ping($1,$2,10,2.4)", [TS, m], /ARGUMENT/);
  });
  it("une fois l'arrivée pointée, la position n'est plus montrée", async () => {
    await q("update interventions set arrived_at = now(), stage = 'arrivee' where id = $1", [m]);
    expect((await q("select agent_trip_ping($1,$2,48.99,2.52) j", [TS, m]))[0].j).toBeNull();
    const live = (await q("select mission_live(i) j from interventions i where id = $1", [m]))[0].j;
    expect([live.moving, live.pos, live.trail]).toEqual([false, null, []]);
  });
});

describe("0082 — deux fiches, une même entreprise", () => {
  const TS = "9".repeat(64);
  it("l'arrivée pointée chez l'une pointe la mission du jour chez l'autre, pas chez un tiers", async () => {
    await db.exec(read("supabase/migrations/0082_meme_entreprise.sql"));
    await db.exec(read("supabase/migrations/0082_meme_entreprise.sql")); // rejouable
    const staff = (await q("insert into staff(full_name, agent_token_hash) values ('Agent Lié',$1) returning id", [hash(TS)]))[0].id;
    const twin = (await q("insert into clients(name, same_as) values ('Jumelle SARL',$1) returning id", [owner]))[0].id;
    const other = (await q("insert into clients(name) values ('Tiers SAS') returning id"))[0].id;
    const mk = async (c: string) => (await q("insert into interventions(client_id, title, scheduled_date, staff_id, unit_price_ht, stage) values ($1,'Passage',$2,$3,100,'affectee') returning id", [c, parisToday(), staff]))[0].id;
    const a = await mk(owner), b = await mk(twin), c = await mk(other);
    await q("select agent_check_in($1,$2,48.9,2.4,10)", [TS, a]);
    const rows = await q("select id, arrived_at is not null arrived, stage::text stage from interventions where id = any($1)", [[a, b, c]]);
    const by = Object.fromEntries(rows.map((r: any) => [r.id, r]));
    expect([by[a].arrived, by[b].arrived, by[b].stage, by[c].arrived]).toEqual([true, true, "arrivee", false]);
  });
});
