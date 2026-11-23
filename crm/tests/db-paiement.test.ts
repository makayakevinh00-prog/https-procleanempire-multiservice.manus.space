import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { addDays, parisToday } from "../src/lib/domain/dates";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const fails = (sql: string, params: any[], re: RegExp) => expect(db.query(sql, params)).rejects.toThrow(re);
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const SECRET = "secret-de-test-123", TA = "a".repeat(64);
let A: string, owner: string, n = 0;

/** Réservation acceptée, avec son ménage dans l'état demandé. Rend le jeton de suivi et les identifiants. */
const booked = async (jobStatus: string | null = "acceptee") => {
  n++;
  const p = JSON.stringify({ name: `Client ${n}`, email: `c${n}@exemple.test`, phone: "0600000000", address: "12 rue de la Paix", postal_code: "95300", city: "Pontoise", job_date: addDays(parisToday(), 3), kind: "t2" });
  const token = (await q("select book_cleaning_tracked($1::jsonb) t", [p]))[0].t as string;
  const id = (await q("select id from cleaning_bookings where track_token = $1", [token]))[0].id as string;
  let job: string | null = null;
  if (jobStatus) {
    job = (await q("insert into cleaning_jobs(client_id, title, job_date, window_start, window_end, postal_code, city, price_ht, status, cleaner_id) values ($1,'Ménage', (now() at time zone 'Europe/Paris')::date, '11:00','14:00','95300','Pontoise',60,$2,$3) returning id", [owner, jobStatus, A]))[0].id;
    await q("update cleaning_bookings set status = 'acceptee', job_id = $1 where id = $2", [job, id]);
  }
  return { token, id, job };
};
const card = (token: string) => q("select automation_set_booking_card($1,$2,'cus_Test123','pm_Test456') ok", [SECRET, token]);
const claim = async () => (await q("select automation_claim_booking_charges($1) r", [SECRET]))[0].r as any[];
const pay = async (id: string) => (await q("select payment_status, payment_error, paid_at is not null paid, stripe_payment_intent pi from cleaning_bookings where id = $1", [id]))[0];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of ["0044_nettoyeurs.sql", "0045_nettoyeurs_suite.sql", "0046_reservations.sql", "0047_nettoyeurs_uber.sql", "0048_nettoyeurs_en_ligne.sql", "0049_vapid.sql", "0050_nettoyeurs_automatismes.sql", "0069_application_plus_rapide.sql", "0070_paiement_et_note.sql"]) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0070_paiement_et_note.sql")); // rejouable
  await q("update app_settings set automation_secret = $1", [SECRET]);
  owner = (await q("insert into clients(name, postal_code, city, address) values ('Propriétaire','95300','Pontoise','1 rue A') returning id"))[0].id;
  A = (await q("insert into cleaners(full_name, email, siret, departments, status, token_hash, online) values ('Léa Martin','lea@x.test','12345678900011','{95}','actif',$1,true) returning id", [hash(TA)]))[0].id;
});

describe("0070 — carte enregistrée, débit après le ménage validé", () => {
  it("la carte s'enregistre sur la réservation ; identifiants Stripe uniquement", async () => {
    const b = await booked();
    expect((await card(b.token))[0].ok).toBe(true);
    expect((await pay(b.id)).payment_status).toBe("carte");
    await fails("select automation_set_booking_card($1,$2,'4242424242424242','pm_x')", [SECRET, b.token], /ARGUMENT/);
    await fails("select automation_set_booking_card('faux',$1,'cus_a','pm_b')", [b.token], /ACCES_REFUSE/);
    expect((await q("select automation_set_booking_card($1,$2,'cus_a','pm_b') ok", [SECRET, "f".repeat(64)]))[0].ok).toBe(false);
  });
  it("rien n'est débité tant que le ménage n'est pas validé", async () => {
    const b = await booked("a_verifier"); await card(b.token);
    expect((await claim()).map((x) => x.id)).not.toContain(b.id);
    expect((await pay(b.id)).payment_status).toBe("carte");
  });
  it("ménage validé : la réservation est rendue une seule fois, puis marquée payée", async () => {
    const b = await booked("validee"); await card(b.token);
    const due = await claim();
    expect(due.find((x) => x.id === b.id)).toMatchObject({ customer: "cus_Test123", method: "pm_Test456", price_ht: 60 });
    expect((await claim()).map((x) => x.id)).not.toContain(b.id);
    await q("select automation_set_booking_payment($1,$2,true,'pi_123',null)", [SECRET, b.id]);
    expect(await pay(b.id)).toMatchObject({ payment_status: "payee", paid: true, pi: "pi_123", payment_error: null });
    expect((await claim()).map((x) => x.id)).not.toContain(b.id);
    expect((await card(b.token))[0].ok).toBe(false); // une réservation payée ne change plus de carte
  });
  it("paiement refusé : marqué en échec avec la raison ; le client peut enregistrer une autre carte, qui sera débitée", async () => {
    const b = await booked("validee"); await card(b.token); await claim();
    await q("select automation_set_booking_payment($1,$2,false,null,'Carte refusée')", [SECRET, b.id]);
    expect(await pay(b.id)).toMatchObject({ payment_status: "echec", payment_error: "Carte refusée", paid: false });
    expect((await claim()).map((x) => x.id)).not.toContain(b.id);
    expect((await card(b.token))[0].ok).toBe(true);
    expect((await claim()).map((x) => x.id)).toContain(b.id);
  });
  it("sans carte : jamais dans les débits (paiement sur facture, comme avant)", async () => {
    const b = await booked("validee");
    expect((await claim()).map((x) => x.id)).not.toContain(b.id);
    expect((await pay(b.id)).payment_status).toBeNull();
  });
  it("le résultat d'un débit ne s'applique qu'à une réservation en cours de débit", async () => {
    const b = await booked("validee"); await card(b.token);
    await q("select automation_set_booking_payment($1,$2,true,'pi_x',null)", [SECRET, b.id]);
    expect((await pay(b.id)).payment_status).toBe("carte");
  });
});

describe("0070 — note du client", () => {
  it("pas de note avant la fin du ménage", async () => {
    const b = await booked("acceptee");
    await fails("select booking_rate($1, 5, null)", [b.token], /ARGUMENT/);
  });
  it("ménage validé : une note de 1 à 5, une seule fois ; visible dans le suivi", async () => {
    const b = await booked("validee");
    await fails("select booking_rate($1, 6, null)", [b.token], /ARGUMENT/);
    await fails("select booking_rate($1, 0, null)", [b.token], /ARGUMENT/);
    await q("select booking_rate($1, 4, '  Très bien  ')", [b.token]);
    expect((await q("select rating, rating_comment from cleaning_bookings where id = $1", [b.id]))[0]).toEqual({ rating: 4, rating_comment: "Très bien" });
    await fails("select booking_rate($1, 1, 'changement')", [b.token], /ARGUMENT/);
    expect((await q("select booking_track($1) r", [b.token]))[0].r).toMatchObject({ rating: 4, payment_status: null });
    await fails("select booking_rate($1, 5, null)", ["f".repeat(64)], /ARGUMENT/);
    await fails("select booking_rate('x', 5, null)", [], /INTROUVABLE/);
  });
  it("le nettoyeur voit sa note moyenne", async () => {
    const b = await booked("validee");
    await q("select booking_rate($1, 5, null)", [b.token]);
    const r = (await q("select cleaner_overview($1) r", [TA]))[0].r.reliability;
    expect(r.ratings).toBe(2); expect(Number(r.stars)).toBe(4.5);
  });
  it("le suivi ne montre aucun identifiant de paiement", async () => {
    const b = await booked("validee"); await card(b.token);
    const t = JSON.stringify((await q("select booking_track($1) r", [b.token]))[0].r);
    expect(t).toMatch(/"payment_status":\s*"carte"/); expect(t).not.toMatch(/cus_|pm_/);
  });
});
