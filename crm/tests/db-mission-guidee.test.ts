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
