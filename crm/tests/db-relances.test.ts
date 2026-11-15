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
const due = async () => (await q("select automation_due_reminders($1) r", [SECRET]))[0].r as any;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x >= "0044").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0061_relances_service.sql")); // rejouable
  await q("update app_settings set automation_secret = $1", [SECRET]);
  const pro = (await q("insert into clients(name, kind, email) values ('SARL Propre', 'entreprise', 'compta@propre.test') returning id"))[0].id;
  const perso = (await q("insert into clients(name, kind, email) values ('Mme Martin', 'particulier', 'martin@x.test') returning id"))[0].id;
  await q("insert into client_emails(client_id, email, for_invoices) values ($1, 'direction@propre.test', true), ($1, 'autre@propre.test', false)", [pro]);
  const inv = (await q("insert into invoices(client_id, number, status, issue_date, due_date, total_ht, total_vat, total_ttc, sent_at, sent_to, validated_at) values ($1,'F-R-1','en_retard','2026-10-01','2026-10-31',100,20,120,'2026-10-01','compta@propre.test','2026-10-01') returning id", [pro]))[0].id;
  // Les lignes d'une facture validée sont verrouillées : pour ce jeu d'essai, elles sont posées sans les déclencheurs.
  await db.exec("set session_replication_role = replica");
  await q("insert into invoice_lines(invoice_id, position, description, quantity, unit_price_ht, vat_rate) values ($1, 1, 'Deuxième ligne', 1, 40, 20), ($1, 0, 'Première ligne', 1, 60, 20)", [inv]);
  await db.exec("set session_replication_role = origin");
  await q("insert into invoices(client_id, number, status, issue_date, due_date, total_ht, total_vat, total_ttc, sent_at, validated_at) values ($1,'F-R-2','envoye','2026-11-01','2026-11-30',50,10,60,'2026-11-01','2026-11-01')", [perso]);
  await q("insert into invoices(client_id, number, status, total_ttc) values ($1, null, 'brouillon', 10)", [perso]);
  const paid = (await q("insert into invoices(client_id, number, status, issue_date, due_date, total_ht, total_vat, total_ttc, paid_amount, paid_at, sent_at, validated_at) values ($1,'F-R-0','paye','2026-09-01','2026-09-30',100,20,120,120,'2026-09-20','2026-09-01','2026-09-01') returning id", [pro]))[0].id;
  await q(`insert into payments(source, qonto_transaction_id, amount, received_at, counterparty, label, match_status, matched_invoice_id) values
    ('qonto','tx-rattache',120,now() - interval '20 days','SARL PROPRE','SARL PROPRE','rapproche',$1),
    ('qonto','tx-ecarte',15,now() - interval '5 days','DIVERS','DIVERS','ignore',null),
    ('qonto','tx-en-attente',120,now() - interval '2 days','SARL PROPRE','SARL PROPRE','non_rapproche',null),
    ('qonto','tx-ancien',99,now() - interval '200 days','VIEUX','VIEUX','ignore',null),
    ('manuel',null,30,now(),'ESPECES','ESPECES','ignore',null)`, [paid]);
});

describe("0061 — ce que reçoit le passage quotidien pour écrire les relances", () => {
  it("seules les factures émises et non payées, avec la nature du client, ses adresses de facturation et les lignes dans l'ordre", async () => {
    const d = await due();
    expect(d.items.map((x: any) => x.invoice.number).sort()).toEqual(["F-R-1", "F-R-2"]);
    const one = d.items.find((x: any) => x.invoice.number === "F-R-1");
    expect(one.client).toMatchObject({ name: "SARL Propre", kind: "entreprise", email: "compta@propre.test", is_reserved: false });
    expect(one.extra_emails).toEqual(["direction@propre.test"]);
    expect(one.lines.map((l: any) => l.description)).toEqual(["Première ligne", "Deuxième ligne"]);
    expect(one.invoice.sent_to).toBe("compta@propre.test");
    const two = d.items.find((x: any) => x.invoice.number === "F-R-2");
    expect(two.client.kind).toBe("particulier");
    expect(two.extra_emails).toEqual([]);
    expect(two.lines).toEqual([]);
  });
  it("les virements déjà rattachés ou écartés (récents) sont listés ; ceux en attente, trop anciens ou saisis à la main ne le sont pas", async () => {
    const d = await due();
    expect([...d.handled_transactions].sort()).toEqual(["tx-ecarte", "tx-rattache"]);
  });
  it("les réglages restent fournis, sans le secret ; un mauvais secret est refusé", async () => {
    const d = await due();
    expect(d.settings.company_name).toBeTruthy();
    expect(d.settings.automation_secret).toBeUndefined();
    await fails("select automation_due_reminders($1)", ["mauvais"], /ACCES_REFUSE/);
  });
});
