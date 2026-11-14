import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const fails = (sql: string, params: any[], re: RegExp) => expect(db.query(sql, params)).rejects.toThrow(re);
const SECRET = "secret-de-test-123";
let client: string, A: string, B: string;
// Un ménage « à vérifier » complet par défaut ; chaque option casse une règle.
async function job(o: { cleaner?: string; arrived?: boolean; minutes?: number; before?: number; after?: number; unchecked?: boolean; review?: string | null; status?: string } = {}) {
  const id = (await q(`insert into cleaning_jobs(client_id, title, job_date, postal_code, city, price_ht, status, cleaner_id, arrived_at, done_at, checklist, review_note)
    values ($1,'Ménage',(now() at time zone 'Europe/Paris')::date,'95300','Pontoise',100,$2,$3,$4,now(),$5::jsonb,$6) returning id`,
    [client, o.status ?? "a_verifier", o.cleaner ?? A, o.arrived === false ? null : new Date(Date.now() - (o.minutes ?? 60) * 60000).toISOString(), JSON.stringify([{ label: "Sols", done: true }, { label: "Lit", done: !o.unchecked }]), o.review ?? null]))[0].id as string;
  for (let i = 0; i < (o.before ?? 2); i++) await q("insert into cleaning_job_photos(job_id, cleaner_id, kind, content_type, size_bytes, data) values ($1,$2,'avant','image/jpeg',1,'\\x00')", [id, o.cleaner ?? A]);
  for (let i = 0; i < (o.after ?? 2); i++) await q("insert into cleaning_job_photos(job_id, cleaner_id, kind, content_type, size_bytes, data) values ($1,$2,'apres','image/jpeg',1,'\\x00')", [id, o.cleaner ?? A]);
  return id;
}
const run = async (id: string) => (await q("select automation_rules_validate($1,$2) r", [SECRET, id]))[0].r as { validated: boolean; reason: string | null };
const st = async (id: string) => (await q("select status, validated_by, departure, check_note from cleaning_jobs where id = $1", [id]))[0];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of ["0044_nettoyeurs.sql", "0045_nettoyeurs_suite.sql", "0046_reservations.sql", "0047_nettoyeurs_uber.sql", "0048_nettoyeurs_en_ligne.sql", "0049_vapid.sql", "0050_nettoyeurs_automatismes.sql", "0051_reference_logement.sql", "0052_suivi_linge.sql", "0053_espace_conciergerie.sql", "0054_taches_menage.sql", "0055_validation_regles.sql"]) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0055_validation_regles.sql")); // rejouable
  await q("update app_settings set automation_secret = $1", [SECRET]);
  await q("update marketplace_settings set spot_check_every = 0");   // le hasard est testé à part
  client = (await q("insert into clients(name, postal_code, city, address) values ('Propriétaire','95300','Pontoise','1 rue A') returning id"))[0].id;
  const mk = async (n: string) => (await q("insert into cleaners(full_name, email, siret, departments, status) values ($1,$2,'12345678900011','{95}','actif') returning id", [n, `${n}@x.test`]))[0].id as string;
  A = await mk("Eprouve"); B = await mk("Nouveau");
  for (let i = 0; i < 3; i++) await job({ status: "validee" });       // A a 3 ménages validés sans reprise
});

describe("0055 — validation par règles, sans IA", () => {
  it("nettoyeur éprouvé, ménage complet : validé tout seul, il peut partir", async () => {
    const j = await job();
    expect(await run(j)).toEqual({ validated: true, reason: null });
    expect(await st(j)).toMatchObject({ status: "validee", validated_by: "regles", departure: "partir", check_note: null });
  });
  it("chaque règle manquante envoie le ménage à la direction, avec la raison", async () => {
    const cases: [Parameters<typeof job>[0], RegExp][] = [
      [{ arrived: false }, /pas pointé/], [{ unchecked: true }, /tâches/], [{ before: 1 }, /trop peu de photos \(1 avant, 2 après/], [{ after: 0 }, /trop peu de photos/],
      [{ minutes: 10 }, /resté 10 min/], [{ review: "Refaire la cuisine" }, /repris/], [{ cleaner: B }, /période d'essai \(0 ménage/]
    ];
    for (const [o, re] of cases) {
      const j = await job(o), r = await run(j);
      expect(r.validated).toBe(false); expect(r.reason).toMatch(re);
      expect(await st(j)).toMatchObject({ status: "a_verifier", validated_by: null }); expect((await st(j)).check_note).toMatch(re);
    }
  });
  it("une reprise récente retire la confiance ; les réglages comptent", async () => {
    await job({ status: "validee", review: "Salle de bain à refaire" });
    expect((await run(await job())).reason).toMatch(/3 derniers ménages/);
    await q("update cleaning_jobs set review_note = null where review_note = 'Salle de bain à refaire'");
    await q("update marketplace_settings set rules_min_minutes = 90");
    expect((await run(await job())).reason).toMatch(/resté 60 min/);
    await q("update marketplace_settings set rules_min_minutes = 30, trust_jobs = 0");
    expect((await run(await job({ cleaner: B }))).validated).toBe(true);          // sans période d'essai
    await q("update marketplace_settings set trust_jobs = 3, rules_validate = false");
    expect((await run(await job())).reason).toMatch(/désactivée/);
    await q("update marketplace_settings set rules_validate = true");
  });
  it("contrôles au hasard : avec 1 sur 1, tout ménage va à la direction ; avec 1 sur 5, une partie seulement", async () => {
    await q("update marketplace_settings set spot_check_every = 1");
    expect((await run(await job())).reason).toBe("contrôle au hasard");
    await q("update marketplace_settings set spot_check_every = 5");
    let spot = 0;
    for (let i = 0; i < 40; i++) { const r = await run(await job()); if (!r.validated) { expect(r.reason).toBe("contrôle au hasard"); spot++; } }
    expect(spot).toBeGreaterThan(1); expect(spot).toBeLessThan(20);
  });
  it("jamais hors « à vérifier » ; secret exigé ; règle interne non appelable", async () => {
    const j = await job({ status: "acceptee" });
    expect((await run(j)).validated).toBe(false); expect((await st(j)).status).toBe("acceptee");
    await fails("select automation_rules_validate('faux',$1)", [j], /./);
    await db.exec("set role anon");
    await fails("select cleaning_rules_reason($1)", [j], /permission denied/);
    await db.exec("reset role");
  });
});
