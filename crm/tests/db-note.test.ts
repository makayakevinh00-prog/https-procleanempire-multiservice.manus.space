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
const TA = "a".repeat(64);
let A: string, owner: string, n = 0;

const booked = async (jobStatus: string) => {
  n++;
  const p = JSON.stringify({ name: `Client ${n}`, email: `c${n}@exemple.test`, phone: "0600000000", address: "12 rue de la Paix", postal_code: "95300", city: "Pontoise", job_date: addDays(parisToday(), 3), kind: "t2" });
  const token = (await q("select book_cleaning_tracked($1::jsonb) t", [p]))[0].t as string;
  const id = (await q("select id from cleaning_bookings where track_token = $1", [token]))[0].id as string;
  const job = (await q("insert into cleaning_jobs(client_id, title, job_date, window_start, window_end, postal_code, city, price_ht, status, cleaner_id) values ($1,'Ménage', (now() at time zone 'Europe/Paris')::date, '11:00','14:00','95300','Pontoise',60,$2,$3) returning id", [owner, jobStatus, A]))[0].id;
  await q("update cleaning_bookings set status = 'acceptee', job_id = $1 where id = $2", [job, id]);
  return { token, id };
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of ["0044_nettoyeurs.sql", "0045_nettoyeurs_suite.sql", "0046_reservations.sql", "0047_nettoyeurs_uber.sql", "0048_nettoyeurs_en_ligne.sql", "0049_vapid.sql", "0050_nettoyeurs_automatismes.sql", "0069_application_plus_rapide.sql", "0071_paiement_et_note.sql", "0072_carte_reglable.sql", "0073_suppression_carte.sql"]) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0073_suppression_carte.sql")); // rejouable
  owner = (await q("insert into clients(name, postal_code, city, address) values ('Propriétaire','95300','Pontoise','1 rue A') returning id"))[0].id;
  A = (await q("insert into cleaners(full_name, email, siret, departments, status, token_hash, online) values ('Léa Martin','lea@x.test','12345678900011','{95}','actif',$1,true) returning id", [hash(TA)]))[0].id;
});

describe("0073 — plus aucun paiement par carte", () => {
  it("colonnes, réglage et fonctions de carte ont disparu", async () => {
    expect((await q("select count(*)::int n from information_schema.columns where (table_name = 'cleaning_bookings' and (column_name like 'stripe%' or column_name like 'payment%' or column_name in ('paid_at','charge_started_at'))) or (table_name = 'marketplace_settings' and column_name = 'card_payments')"))[0].n).toBe(0);
    expect((await q("select count(*)::int n from pg_proc where proname in ('automation_set_booking_card','automation_claim_booking_charges','automation_set_booking_payment','booking_card_enabled')"))[0].n).toBe(0);
  });
});

describe("note du client", () => {
  it("pas de note avant la fin du ménage", async () => {
    const b = await booked("acceptee");
    await fails("select booking_rate($1, 5, null)", [b.token], /ARGUMENT/);
  });
  it("ménage validé : une note de 1 à 5, une seule fois ; visible dans le suivi, sans état de paiement", async () => {
    const b = await booked("validee");
    await fails("select booking_rate($1, 6, null)", [b.token], /ARGUMENT/);
    await q("select booking_rate($1, 4, '  Très bien  ')", [b.token]);
    expect((await q("select rating, rating_comment from cleaning_bookings where id = $1", [b.id]))[0]).toEqual({ rating: 4, rating_comment: "Très bien" });
    await fails("select booking_rate($1, 1, 'changement')", [b.token], /ARGUMENT/);
    const t = (await q("select booking_track($1) r", [b.token]))[0].r;
    expect(t.rating).toBe(4); expect("payment_status" in t).toBe(false);
  });
  it("le nettoyeur voit sa note moyenne", async () => {
    const b = await booked("validee");
    await q("select booking_rate($1, 5, null)", [b.token]);
    const r = (await q("select cleaner_overview($1) r", [TA]))[0].r.reliability;
    expect(r.ratings).toBe(2); expect(Number(r.stars)).toBe(4.5);
  });
});
