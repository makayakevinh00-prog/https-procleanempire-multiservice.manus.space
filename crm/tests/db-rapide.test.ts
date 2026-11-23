import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { addDays, parisToday } from "../src/lib/domain/dates";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) =>
  (await db.query<T>(sql, params)).rows;
const fails = (sql: string, params: any[], re: RegExp) =>
  expect(db.query(sql, params)).rejects.toThrow(re);
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const SECRET = "secret-de-test-123",
  TA = "a".repeat(64),
  TB = "b".repeat(64);
const iso = (n: number) => addDays(parisToday(), n);
const booking = (o: object = {}) =>
  JSON.stringify({
    name: "Marie Durand",
    email: "marie@exemple.test",
    phone: "0600000000",
    address: "12 rue de la Paix",
    postal_code: "95300",
    city: "Pontoise",
    job_date: iso(3),
    kind: "t2",
    ...o,
  });
let A: string, B: string, owner: string;

/** Ménage ouvert, publié il y a `ago` secondes. */
const openJob = async (ago = 0) =>
  (
    await q(
      `insert into cleaning_jobs(client_id, title, job_date, window_start, window_end, duration_hours, postal_code, city, price_ht, status, created_at)
            values ($1,'Ménage test', (now() at time zone 'Europe/Paris')::date + 2, '11:00', '14:00', 2, '95300','Pontoise',100,'ouverte', now() - make_interval(secs => $2)) returning id`,
      [owner, ago],
    )
  )[0].id as string;
const seen = async (token: string, id: string) =>
  (
    (await q("select cleaner_open_jobs($1) r", [token]))[0].r.jobs as any[]
  ).find((j) => j.id === id);
/** Ménage terminé pour le nettoyeur A : validé du premier coup, ou avec une reprise. */
const doneJob = async (redo = false) =>
  q(
    `insert into cleaning_jobs(client_id, title, job_date, window_start, window_end, postal_code, city, price_ht, status, cleaner_id, review_note)
     values ($1,'Fait', (now() at time zone 'Europe/Paris')::date - 1, '11:00', '14:00', '95300','Pontoise',100,'validee',$2,$3)`,
    [owner, A, redo ? "Reprise demandée" : null],
  );

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations"))
    .filter(
      (x) =>
        x.endsWith(".sql") &&
        !x.endsWith("_down.sql") &&
        x <= "0038_conciergerie.sql",
    )
    .sort())
    await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of [
    "0044_nettoyeurs.sql",
    "0045_nettoyeurs_suite.sql",
    "0046_reservations.sql",
    "0047_nettoyeurs_uber.sql",
    "0048_nettoyeurs_en_ligne.sql",
    "0049_vapid.sql",
    "0050_nettoyeurs_automatismes.sql",
    "0069_application_plus_rapide.sql",
  ])
    await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0069_application_plus_rapide.sql")); // rejouable
  await q("update app_settings set automation_secret = $1", [SECRET]);
  owner = (
    await q(
      "insert into clients(name, postal_code, city, address) values ('Propriétaire','95300','Pontoise','1 rue A') returning id",
    )
  )[0].id;
  const mk = async (n: string, e: string, t: string, online: boolean) =>
    (
      await q(
        "insert into cleaners(full_name, email, siret, departments, status, token_hash, online) values ($1,$2,'12345678900011','{95}','actif',$3,$4) returning id",
        [n, e, hash(t), online],
      )
    )[0].id as string;
  A = await mk("Léa Martin", "lea@x.test", TA, true);
  B = await mk("Karim Benali", "karim@x.test", TB, false);
});

describe("0069 — offre réservée avec compte à rebours", () => {
  it("demande toute neuve : réservée aux 3 mieux placés pendant 2 minutes", async () => {
    const j = await seen(TA, await openJob(0));
    expect(j.reserved_for).toBe(3);
    const left = (new Date(j.reserved_until).getTime() - Date.now()) / 1000;
    expect(left).toBeGreaterThan(60);
    expect(left).toBeLessThanOrEqual(121);
  });
  it("entre 2 et 5 minutes : réservée aux 10 mieux placés ; après 5 minutes : ouverte à toute la zone", async () => {
    expect((await seen(TA, await openJob(180))).reserved_for).toBe(10);
    const late = await seen(TA, await openJob(400));
    expect(late.reserved_for).toBeNull();
    expect(late.reserved_until).toBeNull();
  });
  it("hors ligne : rien pendant la réserve, puis la demande apparaît sans compte à rebours", async () => {
    expect(await seen(TB, await openJob(30))).toBeUndefined();
    const j = await seen(TB, await openJob(400));
    expect(j).toBeDefined();
    expect(j.reserved_until).toBeNull();
  });
});

describe("0069 — score de fiabilité visible", () => {
  const rel = async () =>
    (await q("select cleaner_overview($1) r", [TA]))[0].r.reliability;
  it("pas de score avant 3 ménages comptés", async () => {
    await doneJob();
    await doneJob();
    expect(await rel()).toEqual({ clean: 2, redo: 0, missed: 0, score: null });
  });
  it("validés du premier coup sur l'ensemble : une reprise et une absence font baisser le score", async () => {
    await doneJob();
    expect((await rel()).score).toBe(100);
    await doneJob(true);
    expect(await rel()).toMatchObject({ clean: 3, redo: 1, score: 75 });
    const missed = await openJob(400);
    await q("insert into cleaning_noshows(job_id, cleaner_id) values ($1,$2)", [
      missed,
      A,
    ]);
    expect(await rel()).toMatchObject({
      clean: 3,
      redo: 1,
      missed: 1,
      score: 60,
    });
  });
  it("une demande simplement non acceptée ne compte pas", async () => {
    await openJob(400);
    await openJob(400);
    expect((await rel()).score).toBe(60);
  });
});

describe("0069 — suivi de la demande par le client", () => {
  let token: string;
  it("la réservation rend un lien de suivi ; il montre l'état sans rien de privé", async () => {
    token = (
      await q("select book_cleaning_tracked($1::jsonb) t", [
        booking({ access_notes: "Code 1234" }),
      ])
    )[0].t;
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const t = (await q("select booking_track($1) r", [token]))[0].r;
    expect(t).toMatchObject({
      status: "nouvelle",
      kind: "t2",
      city: "Pontoise",
      job_status: null,
      cleaner: null,
    });
    expect(JSON.stringify(t)).not.toMatch(/rue de la Paix|1234|marie@/);
  });
  it("les contrôles de la réservation restent les mêmes", async () => {
    await fails(
      "select book_cleaning_tracked($1::jsonb)",
      [booking({ job_date: iso(0), email: "autre@exemple.test" })],
      /ARGUMENT/,
    );
  });
  it("lien inconnu ou mal formé : refusé", async () => {
    await fails("select booking_track($1)", ["f".repeat(64)], /INTROUVABLE/);
    await fails("select booking_track($1)", ["' or 1=1 --"], /INTROUVABLE/);
  });
  it("chaque réservation a son propre lien", async () => {
    const other = (
      await q("select book_cleaning_tracked($1::jsonb) t", [
        booking({ email: "paul@exemple.test", name: "Paul Petit" }),
      ])
    )[0].t;
    expect(other).not.toBe(token);
    expect(
      (
        await q(
          "select count(distinct track_token)::int n, count(*)::int c from cleaning_bookings",
        )
      )[0],
    ).toMatchObject({ n: 2, c: 2 });
  });
  it("une fois le ménage accepté par un nettoyeur : son prénom seulement", async () => {
    const id = (
      await q("select id from cleaning_bookings where track_token = $1", [
        token,
      ])
    )[0].id;
    const job = (
      await q(
        "insert into cleaning_jobs(client_id, title, job_date, window_start, window_end, postal_code, city, price_ht, status, cleaner_id) values ($1,'Ménage', $2, '11:00','14:00','95300','Pontoise',60,'acceptee',$3) returning id",
        [owner, iso(3), A],
      )
    )[0].id;
    await q(
      "update cleaning_bookings set status = 'acceptee', job_id = $1 where id = $2",
      [job, id],
    );
    expect((await q("select booking_track($1) r", [token]))[0].r).toMatchObject(
      { status: "acceptee", job_status: "acceptee", cleaner: "Léa" },
    );
  });
});

describe("0069 — acceptation automatique des réservations simples", () => {
  const list = async () =>
    (await q("select automation_bookings_to_accept($1) r", [SECRET]))[0].r as {
      id: string;
    }[];
  const accept = async (
    id: string,
    lat: number | null = null,
    lng: number | null = null,
  ) =>
    (
      await q("select automation_accept_booking($1,$2,$3,$4) r", [
        SECRET,
        id,
        lat,
        lng,
      ])
    )[0].r;
  const book = async (o: object) => {
    const t = (
      await q("select book_cleaning_tracked($1::jsonb) t", [booking(o)])
    )[0].t;
    return (
      await q("select id from cleaning_bookings where track_token = $1", [t])
    )[0].id as string;
  };

  it("coupée par défaut : rien n'est accepté sans le patron", async () => {
    const id = await book({ email: "a1@exemple.test", name: "Alice Un" });
    expect(await list()).toEqual([]);
    expect(await accept(id)).toMatchObject({
      accepted: false,
      reason: "regles",
    });
  });
  it("activée : la demande simple est acceptée, le client créé, le ménage publié", async () => {
    await q("update marketplace_settings set auto_accept_bookings = true");
    const id = await book({
      email: "a2@exemple.test",
      name: "Bruno Deux",
      access_notes: "Boîte à clés",
    });
    expect((await list()).map((b) => b.id)).toContain(id);
    const r = await accept(id);
    expect(r).toMatchObject({
      accepted: true,
      email: "a2@exemple.test",
      label: "2 pièces",
      price_ht: 60,
    });
    expect(r.track_token).toMatch(/^[0-9a-f]{64}$/);
    expect(
      (
        await q(
          "select status, auto_accepted from cleaning_bookings where id = $1",
          [id],
        )
      )[0],
    ).toEqual({ status: "acceptee", auto_accepted: true });
    expect(
      (
        await q(
          "select status, price_ht::float p, access_notes, cleaner_id from cleaning_jobs where id = $1",
          [r.job_id],
        )
      )[0],
    ).toEqual({
      status: "ouverte",
      p: 60,
      access_notes: "Boîte à clés",
      cleaner_id: null,
    });
    expect(
      (
        await q(
          "select kind, status from clients where lower(email) = 'a2@exemple.test'",
        )
      )[0],
    ).toEqual({ kind: "particulier", status: "actif" });
  });
  it("jamais deux fois la même réservation", async () => {
    const id = await book({ email: "a3@exemple.test", name: "Chloé Trois" });
    expect((await accept(id)).accepted).toBe(true);
    expect(await accept(id)).toMatchObject({
      accepted: false,
      reason: "regles",
    });
    expect(
      (
        await q(
          "select count(*)::int n from cleaning_jobs j join cleaning_bookings b on b.job_id = j.id where b.id = $1",
          [id],
        )
      )[0].n,
    ).toBe(1);
  });
  it("une précision écrite par le client : le patron décide", async () => {
    const id = await book({
      email: "a4@exemple.test",
      name: "David Quatre",
      note: "Chien dans le jardin",
    });
    expect((await list()).map((b) => b.id)).not.toContain(id);
    expect(await accept(id)).toMatchObject({
      accepted: false,
      reason: "regles",
    });
  });
  it("hors zone : aucun nettoyeur dans le département, ou trop loin de tous", async () => {
    const far = await book({
      email: "a5@exemple.test",
      name: "Emma Cinq",
      postal_code: "13001",
      city: "Marseille",
    });
    expect((await list()).map((b) => b.id)).not.toContain(far);
    expect(await accept(far)).toMatchObject({
      accepted: false,
      reason: "zone",
    });
    await q(
      "update cleaners set lat = 49.05, lng = 2.10, radius_km = 10 where id = $1",
      [A],
    );
    await q("update cleaners set status = 'suspendu' where id = $1", [B]);
    const near = await book({ email: "a6@exemple.test", name: "Fanny Six" });
    expect(await accept(near, 48.4, 2.7)).toMatchObject({
      accepted: false,
      reason: "zone",
    });
    expect((await accept(near, 49.06, 2.11)).accepted).toBe(true);
  });
  it("client déjà connu : rattaché, sauf contact réservé", async () => {
    await q(
      "insert into clients(name, kind, email, is_reserved) values ('Société Réservée','entreprise','reserve@exemple.test', true)",
    );
    const r = await book({
      email: "reserve@exemple.test",
      name: "Gérard Sept",
    });
    expect(await accept(r, 49.06, 2.11)).toMatchObject({
      accepted: false,
      reason: "contact_reserve",
    });
    const again = await book({
      email: "a2@exemple.test",
      name: "Bruno Deux",
      job_date: iso(5),
    });
    expect((await accept(again, 49.06, 2.11)).accepted).toBe(true);
    expect(
      (
        await q(
          "select count(*)::int n from clients where lower(email) = 'a2@exemple.test'",
        )
      )[0].n,
    ).toBe(1);
  });
  it("même nom qu'un client existant avec un autre e-mail : le patron décide (aucune fusion automatique)", async () => {
    const id = await book({
      email: "autre-bruno@exemple.test",
      name: "Bruno Deux",
    });
    expect(await accept(id, 49.06, 2.11)).toMatchObject({
      accepted: false,
      reason: "client_existant",
    });
    expect(
      (await q("select status from cleaning_bookings where id = $1", [id]))[0]
        .status,
    ).toBe("nouvelle");
  });
  it("réservé au serveur : mauvais secret refusé", async () => {
    await fails(
      "select automation_bookings_to_accept('faux')",
      [],
      /ACCES_REFUSE/,
    );
    await fails(
      "select automation_accept_booking('faux', gen_random_uuid(), null, null)",
      [],
      /ACCES_REFUSE/,
    );
  });
});
