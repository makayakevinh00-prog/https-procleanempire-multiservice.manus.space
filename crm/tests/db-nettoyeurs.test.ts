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
const TA = "a".repeat(64), TB = "b".repeat(64), TC = "c".repeat(64);
const iso = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
let A: string, B: string, C: string, client: string, other: string;
const job = async (o: { date?: string; postal?: string; client?: string; price?: number; priority?: string | null } = {}) =>
  (await q("insert into cleaning_jobs(client_id, title, job_date, postal_code, city, address, access_notes, price_ht, priority_until) values ($1,'Ménage Studio',$2,$3,'Pontoise','12 rue Secrète','Code 4821',$4,$5) returning id", [o.client ?? client, o.date ?? iso(5), o.postal ?? "95300", o.price ?? 100, o.priority ?? null]))[0].id as string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  await db.exec(read("supabase/migrations/0044_nettoyeurs.sql"));
  await db.exec(read("supabase/migrations/0044_nettoyeurs.sql")); // rejouable
  client = (await q("insert into clients(name) values ('Propriétaire Martin') returning id"))[0].id;
  other = (await q("insert into clients(name) values ('Autre propriétaire') returning id"))[0].id;
  const mk = async (name: string, email: string, tok: string, depts: string[]) => (await q("insert into cleaners(full_name, email, siret, departments, status, token_hash) values ($1,$2,'12345678900011',$3,'actif',$4) returning id", [name, email, depts, hash(tok)]))[0].id as string;
  A = await mk("Léa Étudiante", "lea@exemple.test", TA, ["95"]);
  B = await mk("Karim Indépendant", "karim@exemple.test", TB, ["95", "78"]);
  C = await mk("Sonia Paris", "sonia@exemple.test", TC, ["75"]);
});

describe("0044 — nettoyeurs indépendants", () => {
  it("inscription : valide les données, refuse les doublons, et ne donne aucun accès avant validation", async () => {
    expect((await q("select cleaner_signup($1::jsonb) r", [JSON.stringify({ full_name: "Nouvelle Recrue", email: "Nouvelle@Exemple.test", departments: "95, 78", siret: "123 456 789 00011", phone: "0600000000" })]))[0].r).toBe("ok");
    expect((await q("select cleaner_signup($1::jsonb) r", [JSON.stringify({ full_name: "Nouvelle Recrue", email: "nouvelle@exemple.test", departments: "95" })]))[0].r).toBe("deja");
    const row = (await q("select status, token_hash, departments, email from cleaners where lower(email)='nouvelle@exemple.test'"))[0];
    expect(row).toMatchObject({ status: "en_attente", token_hash: null, departments: ["78", "95"], email: "nouvelle@exemple.test" });
    for (const bad of [{ full_name: "X", email: "a@b.fr", departments: "95" }, { full_name: "Ok Ok", email: "pas-un-mail", departments: "95" }, { full_name: "Ok Ok", email: "a@b.fr", departments: "" }, { full_name: "Ok Ok", email: "a@b.fr", departments: "95", siret: "123" }, { full_name: "Ok Ok", email: "a@b.fr", departments: "abc" }])
      await fails("select cleaner_signup($1::jsonb)", [JSON.stringify(bad)], /ARGUMENT/);
  });
  it("un lien inconnu, mal formé ou d'un compte non validé est refusé", async () => {
    for (const t of ["x".repeat(64), "court", ""]) await fails("select cleaner_overview($1)", [t], /ACCES_REFUSE/);
    await q("update cleaners set token_hash = $1 where lower(email) = 'nouvelle@exemple.test'", [hash("d".repeat(64))]);
    await fails("select cleaner_overview($1)", ["d".repeat(64)], /ACCES_REFUSE/);   // toujours « en attente »
  });
  it("les parts sont figées à la publication : 75 / 10 / 15 par défaut, modifiables sans toucher aux ménages publiés", async () => {
    const j1 = await job({ price: 100 });
    expect((await q("select cleaner_amount a, platform_amount p, logistics_amount l from cleaning_jobs where id = $1", [j1]))[0]).toEqual({ a: "75.00", p: "10.00", l: "15.00" });
    await q("update marketplace_settings set cleaner_pct = 80, platform_pct = 10, logistics_pct = 10");
    const j2 = await job({ price: 100 });
    expect((await q("select cleaner_amount a from cleaning_jobs where id = $1", [j2]))[0].a).toBe("80.00");
    expect((await q("select cleaner_amount a from cleaning_jobs where id = $1", [j1]))[0].a).toBe("75.00");
    await expect(db.query("update marketplace_settings set cleaner_pct = 70, platform_pct = 10, logistics_pct = 10")).rejects.toThrow();   // ne fait pas 100
    await expect(db.query("update marketplace_settings set cleaner_pct = 95, platform_pct = 0, logistics_pct = 5")).rejects.toThrow();     // plafond 90 %
    await q("update marketplace_settings set cleaner_pct = 75, platform_pct = 10, logistics_pct = 15");
    await q("delete from cleaning_jobs");
  });
  it("les demandes ouvertes se limitent à ses départements et ne montrent jamais l'adresse", async () => {
    const j95 = await job({ postal: "95300" }), j75 = await job({ postal: "75011" });
    const a = (await q("select cleaner_open_jobs($1) r", [TA]))[0].r.jobs;
    expect(a.map((x: any) => x.id)).toEqual([j95]);
    const txt = JSON.stringify(a);
    expect(txt).not.toMatch(/Secrète|4821/);
    expect(a[0]).toMatchObject({ city: "Pontoise", postal_code: "95300", amount: 75 });
    expect((await q("select cleaner_open_jobs($1) r", [TC]))[0].r.jobs.map((x: any) => x.id)).toEqual([j75]);
    await q("delete from cleaning_jobs");
  });
  it("le premier qui accepte l'obtient ; l'adresse n'apparaît alors que chez lui", async () => {
    const j = await job();
    await q("select cleaner_accept_job($1, $2)", [TA, j]);
    await fails("select cleaner_accept_job($1, $2)", [TB, j], /INDISPONIBLE/);
    expect((await q("select cleaner_my_jobs($1) r", [TA]))[0].r.jobs[0]).toMatchObject({ id: j, address: "12 rue Secrète", access_notes: "Code 4821", status: "acceptee" });
    expect((await q("select cleaner_my_jobs($1) r", [TB]))[0].r.jobs).toEqual([]);
    expect((await q("select cleaner_open_jobs($1) r", [TB]))[0].r.jobs.map((x: any) => x.id)).not.toContain(j);
    await fails("select cleaner_accept_job($1, $2)", [TC, await job({ postal: "95300" })], /hors de vos départements/);
  });
  it("priorité aux favoris : les autres attendent la fin de la fenêtre", async () => {
    await q("delete from cleaning_jobs");
    await q("insert into cleaner_favorites(cleaner_id, client_id) values ($1, $2)", [B, client]);
    const j = await job({ priority: new Date(Date.now() + 3600e3).toISOString() });
    expect((await q("select cleaner_open_jobs($1) r", [TA]))[0].r.jobs).toEqual([]);
    expect((await q("select cleaner_open_jobs($1) r", [TB]))[0].r.jobs.map((x: any) => x.id)).toEqual([j]);
    await fails("select cleaner_accept_job($1, $2)", [TA, j], /favoris/);
    await q("select cleaner_accept_job($1, $2)", [TB, j]);
    const j2 = await job({ priority: new Date(Date.now() - 3600e3).toISOString() });     // priorité terminée : tout le monde
    expect((await q("select cleaner_open_jobs($1) r", [TA]))[0].r.jobs.map((x: any) => x.id)).toEqual([j2]);
  });
  it("désistement : possible 24 h avant, refusé après ; le ménage repart en ligne", async () => {
    await q("delete from cleaning_jobs");
    const far = await job({ date: iso(5) }), near = await job({ date: iso(0) });
    await q("select cleaner_accept_job($1, $2)", [TA, far]);
    await q("select cleaner_accept_job($1, $2)", [TA, near]);
    await q("select cleaner_release_job($1, $2)", [TA, far]);
    expect((await q("select status, cleaner_id from cleaning_jobs where id = $1", [far]))[0]).toEqual({ status: "ouverte", cleaner_id: null });
    await fails("select cleaner_release_job($1, $2)", [TA, near], /24 h/);
    await fails("select cleaner_release_job($1, $2)", [TB, near], /INDISPONIBLE/);      // pas son ménage
  });
  it("terminer : seulement son ménage, le jour même ou après ; il part à la direction", async () => {
    await q("delete from cleaning_jobs");
    const fut = await job({ date: iso(3) }), today = await job({ date: iso(0) });
    await q("select cleaner_accept_job($1, $2)", [TA, fut]); await q("select cleaner_accept_job($1, $2)", [TA, today]);
    await fails("select cleaner_finish_job($1, $2)", [TA, fut], /pas encore/);
    await fails("select cleaner_finish_job($1, $2)", [TB, today], /INDISPONIBLE/);
    await q("select cleaner_finish_job($1, $2, 'Tout est fait')", [TA, today]);
    expect((await q("select status, cleaner_note from cleaning_jobs where id = $1", [today]))[0]).toEqual({ status: "a_verifier", cleaner_note: "Tout est fait" });
  });
  it("profil : IBAN contrôlé, jamais renvoyé en entier", async () => {
    await fails("select cleaner_update_profile($1,'95','0600','FR00 1234')", [TA], /IBAN invalide/);
    await q("select cleaner_update_profile($1,'95, 78','0611223344','FR76 3000 6000 0112 3456 7890 189')", [TA]);
    const o = (await q("select cleaner_overview($1) r", [TA]))[0].r;
    expect(o).toMatchObject({ has_iban: true, iban_hint: "•••• 0189", departments: ["78", "95"] });
    expect(JSON.stringify(o)).not.toContain("FR7630006000");
    await fails("select cleaner_update_profile($1,'','0600')", [TA], /département/);
  });
  it("aucun accès direct aux tables pour un nettoyeur (rôle anonyme)", async () => {
    await db.exec("set role anon");
    for (const t of ["cleaners", "cleaning_jobs", "cleaning_payouts", "cleaner_favorites", "marketplace_settings"]) expect((await q(`select count(*)::int n from ${t}`))[0].n, t).toBe(0);
    await db.exec("reset role");
  });
});
