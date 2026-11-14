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
const SECRET = "secret-de-test-123", TA = "a".repeat(64), TB = "b".repeat(64);
const PIX = Buffer.from("fake-jpeg-bytes").toString("base64");
let A: string, B: string, client: string;
// Dates et heures calculées à Paris par la base, pour ne dépendre ni du fuseau ni de l'heure du test.
const job = async (o: { day?: number; startMin?: number; endMin?: number; hours?: number; status?: string; cleaner?: string | null } = {}) =>
  (await q(`insert into cleaning_jobs(client_id, title, job_date, window_start, window_end, duration_hours, postal_code, city, price_ht, status, cleaner_id)
            values ($1,'Ménage test', (now() at time zone 'Europe/Paris')::date + $2::int, $3::time, $4::time, $5, '95300','Pontoise',100,$6,$7) returning id`,
    [client, o.day ?? 0, o.startMin != null ? null : "00:00", o.endMin != null ? null : "23:59", o.hours ?? 2, o.status ?? "acceptee", o.cleaner === undefined ? A : o.cleaner]))[0].id as string;
const st = async (id: string) => (await q("select status, validated_by, departure, cleaner_id, arrived_at is not null arrived from cleaning_jobs where id = $1", [id]))[0];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of ["0044_nettoyeurs.sql", "0045_nettoyeurs_suite.sql", "0046_reservations.sql", "0047_nettoyeurs_uber.sql", "0048_nettoyeurs_en_ligne.sql", "0049_vapid.sql", "0050_automatismes.sql"]) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0050_automatismes.sql")); // rejouable
  await q("update app_settings set automation_secret = $1", [SECRET]);
  client = (await q("insert into clients(name, postal_code, city, address) values ('Propriétaire','95300','Pontoise','1 rue A') returning id"))[0].id;
  const mk = async (n: string, e: string, t: string) => (await q("insert into cleaners(full_name, email, siret, departments, status, token_hash, online) values ($1,$2,'12345678900011','{95}','actif',$3,true) returning id", [n, e, hash(t)]))[0].id as string;
  A = await mk("Léa", "lea@x.test", TA); B = await mk("Karim", "karim@x.test", TB);
});

describe("0050 — validation automatique par l'IA", () => {
  it("verdict ok : validé automatiquement, le nettoyeur peut partir ; marqué « ia »", async () => {
    const j = await job({ status: "a_verifier" });
    await q("select automation_set_job_analysis($1,$2,'apres',$3::jsonb,'ok')", [SECRET, j, JSON.stringify({ summary: "Propre", confidence: "haute" })]);
    expect(await st(j)).toMatchObject({ status: "validee", validated_by: "ia", departure: "partir" });
  });
  it("IA peu sûre, analyse indisponible ou réglage coupé : la direction valide", async () => {
    const a = await job({ status: "a_verifier" });
    await q("select automation_set_job_analysis($1,$2,'apres',$3::jsonb,'ok')", [SECRET, a, JSON.stringify({ confidence: "faible" })]);
    expect((await st(a)).status).toBe("a_verifier");
    const b = await job({ status: "a_verifier" });
    await q("select automation_set_job_analysis($1,$2,'apres','{}'::jsonb,'indisponible')", [SECRET, b]);
    expect((await st(b)).status).toBe("a_verifier");
    await q("update marketplace_settings set auto_validate = false");
    const c = await job({ status: "a_verifier" });
    await q("select automation_set_job_analysis($1,$2,'apres',$3::jsonb,'ok')", [SECRET, c, JSON.stringify({ confidence: "haute" })]);
    expect((await st(c)).status).toBe("a_verifier");
    await q("update marketplace_settings set auto_validate = true");
  });
  it("verdict reprise : retour au nettoyeur qui reste sur place ; jamais de validation hors « à vérifier »", async () => {
    const j = await job({ status: "a_verifier" });
    await q("select automation_set_job_analysis($1,$2,'apres',$3::jsonb,'reprise')", [SECRET, j, JSON.stringify({ summary: "Sol sale", remaining: [{ zone: "Cuisine", why: "sol" }] })]);
    expect(await st(j)).toMatchObject({ status: "a_reprendre", departure: "rester", validated_by: null });
    const k = await job({ status: "acceptee" });
    await q("select automation_set_job_analysis($1,$2,'apres',$3::jsonb,'ok')", [SECRET, k, JSON.stringify({ confidence: "haute" })]);
    expect((await st(k)).status).toBe("acceptee");
    await fails("select automation_set_job_analysis('faux',$1,'apres','{}'::jsonb,'ok')", [j], /./);
  });
});

describe("0050 — pointage et photos", () => {
  it("« Je suis sur place » : le jour même seulement, son ménage seulement", async () => {
    const j = await job(), demain = await job({ day: 1 });
    await fails("select cleaner_arrive($1,$2)", [TB, j], /./);
    await fails("select cleaner_arrive($1,$2)", [TA, demain], /jour du ménage/);
    await q("select cleaner_arrive($1,$2)", [TA, j]);
    expect((await st(j)).arrived).toBe(true);
  });
  it("la première photo « avant » vaut pointage ; 40 photos au plus ; l'analyse lit les 10 plus récentes", async () => {
    const j = await job();
    await q("select cleaner_add_photo($1,$2,'avant','image/jpeg',$3)", [TA, j, PIX]);
    expect((await st(j)).arrived).toBe(true);
    for (let i = 0; i < 39; i++) await q("select cleaner_add_photo($1,$2,'apres','image/jpeg',$3)", [TA, j, PIX]);
    await fails("select cleaner_add_photo($1,$2,'apres','image/jpeg',$3)", [TA, j, PIX], /40 photos/);
    expect((await q("select automation_job_photos($1,$2,'apres') p", [SECRET, j]))[0].p).toHaveLength(10);
    const mine = (await q("select cleaner_my_jobs($1) m", [TA]))[0].m.jobs.find((x: any) => x.id === j);
    expect(mine.arrived_at).not.toBeNull(); expect(mine.photos_after).toBe(39);
  });
});

describe("0050 — rappels et remise en ligne", () => {
  it("rappel de la veille : une seule fois, à partir de 17 h (heure de Paris)", async () => {
    await q("delete from cleaning_jobs");
    const j = await job({ day: 1 });
    const after17 = (await q("select (now() at time zone 'Europe/Paris')::time >= time '17:00' ok"))[0].ok;
    const r = (await q("select automation_cleaning_reminders($1) r", [SECRET]))[0].r as any[];
    expect(r.filter((x) => x.kind === "veille")).toHaveLength(after17 ? 1 : 0);
    if (after17) { expect(r[0]).toMatchObject({ name: "Léa", email: "lea@x.test" }); expect((await q("select automation_cleaning_reminders($1) r", [SECRET]))[0].r).toHaveLength(0); }
    await fails("select automation_cleaning_reminders('faux')", [], /./);
    await q("delete from cleaning_jobs where id = $1", [j]);
  });
  it("rappel du jour : dans l'heure avant le créneau, une fois, pas si déjà arrivé", async () => {
    // Créneau qui commence dans 30 min et finit dans 3 h (heure de Paris), s'il tient dans la journée.
    const fits = (await q("select (now() at time zone 'Europe/Paris')::time < time '20:30' ok"))[0].ok;
    if (!fits) return;
    const mk = async () => (await q(`insert into cleaning_jobs(client_id, title, job_date, window_start, window_end, duration_hours, postal_code, city, price_ht, status, cleaner_id)
      values ($1,'Bientôt', (now() at time zone 'Europe/Paris')::date, ((now() at time zone 'Europe/Paris')::time + interval '30 minutes'), ((now() at time zone 'Europe/Paris')::time + interval '3 hours'), 2, '95300','Pontoise',100,'acceptee',$2) returning id`, [client, A]))[0].id as string;
    const j = await mk();
    const r = (await q("select automation_cleaning_reminders($1) r", [SECRET]))[0].r as any[];
    expect(r.filter((x) => x.kind === "heure")).toHaveLength(1);
    expect((await q("select automation_cleaning_reminders($1) r", [SECRET]))[0].r).toHaveLength(0);
    const k = await mk(); await q("select cleaner_arrive($1,$2)", [TA, k]);
    expect((await q("select automation_cleaning_reminders($1) r", [SECRET]))[0].r).toHaveLength(0);
    await q("delete from cleaning_jobs where id in ($1,$2)", [j, k]);
  });
  it("pas pointé à l'heure : remis en ligne, patron informé, le nettoyeur absent ne le revoit plus ; arrivé ou en avance = rien", async () => {
    await q("delete from cleaning_jobs");
    const ok = (await q("select (now() at time zone 'Europe/Paris')::time between time '01:30' and time '23:00' ok"))[0].ok;
    if (!ok) return;
    // Créneau commencé il y a 1 h, finit dans 30 min, ménage de 1 h : il aurait dû partir il y a 30 min au plus tard.
    const mk = async () => (await q(`insert into cleaning_jobs(client_id, title, job_date, window_start, window_end, duration_hours, postal_code, city, price_ht, status, cleaner_id, created_at)
      values ($1,'En retard', (now() at time zone 'Europe/Paris')::date, ((now() at time zone 'Europe/Paris')::time - interval '60 minutes'), ((now() at time zone 'Europe/Paris')::time + interval '30 minutes'), 1, '95300','Pontoise',100,'acceptee',$2, now() - interval '1 day') returning id`, [client, A]))[0].id as string;
    const late = await mk(), present = await mk();
    await q("select cleaner_arrive($1,$2)", [TA, present]);
    const future = await job({ day: 1 });
    const r = (await q("select automation_release_noshows($1) r", [SECRET]))[0].r as any[];
    expect(r).toHaveLength(1); expect(r[0]).toMatchObject({ name: "Léa", title: "En retard" });
    expect(await st(late)).toMatchObject({ status: "ouverte", cleaner_id: null });
    expect((await st(present)).status).toBe("acceptee"); expect((await st(future)).status).toBe("acceptee");
    const seen = async (t: string) => ((await q("select cleaner_open_jobs($1) o", [t]))[0].o.jobs as any[]).map((x) => x.id);
    await q("update cleaning_jobs set status = 'validee' where id = $1", [present]);     // Léa est libre sur le créneau : seule son absence l'exclut
    expect(await seen(TA)).not.toContain(late);
    expect(await seen(TB)).toContain(late);
    await fails("select cleaner_accept_job($1,$2)", [TA, late], /INDISPONIBLE/);
    expect((await q("select automation_release_noshows($1) r", [SECRET]))[0].r).toHaveLength(0);
    await fails("select automation_release_noshows('faux')", [], /./);
    await db.exec("set role anon");
    await fails("select * from cleaning_noshows", [], /permission denied/);
    await db.exec("reset role");
  });
});
