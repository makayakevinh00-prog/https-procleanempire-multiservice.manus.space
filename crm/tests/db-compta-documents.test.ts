import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const as = async (email: string, uid: string) => { await db.exec("reset role"); await q("select set_config('test.email',$1,false), set_config('test.uid',$2,false)", [email, uid]); await db.exec("set role authenticated"); };
const admin = () => db.exec("reset role");
const OWNER = "contact@procleanempire.com", ACC = "comptable@cabinet.test", U_ACC = "00000000-0000-0000-0000-00000000acc1", U_OWN = "00000000-0000-0000-0000-00000000aaaa", U_X = "00000000-0000-0000-0000-00000000eee1";

let inv: string, sp: string;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email', coalesce(current_setting('test.email', true), '')) $$;
    create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon;
    alter default privileges in schema public grant all on tables to authenticated, anon;
    alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0021_jarvis_core.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  await db.exec(read("supabase/migrations/0029_accountant.sql"));
  await db.exec(read("supabase/migrations/0039_compta_documents.sql"));
  await db.exec(read("supabase/migrations/0039_compta_documents.sql")); // rejouable
  await db.exec("alter table invoices disable trigger user; alter table invoice_lines disable trigger user; alter table contracts disable trigger user; delete from contracts");
  const c = (await q("insert into clients(name, email, phone, address, city, siret) values ('Client Exemple','secret@example.invalid','0600000000','1 rue Secrète','Pontoise','12345678900011') returning id"))[0].id;
  inv = (await q("insert into invoices(client_id, number, status, issue_date, due_date, total_ht, total_vat, total_ttc, sent_at, validated_at) values ($1,'F-2026-001','envoye','2026-11-03','2026-11-18',100,20,120,'2026-11-03','2026-11-03') returning id", [c]))[0].id;
  await q("insert into invoice_lines(invoice_id, description, quantity, unit_price_ht, vat_rate) values ($1,'Ménage',2,50,20)", [inv]);
  await q("insert into invoices(client_id, number, status, total_ttc) values ($1, null, 'brouillon', 50)", [c]);
  const s = (await q("insert into suppliers(name, category) values ('Fournisseur Test','autre') returning id"))[0].id;
  sp = (await q("insert into supplier_payments(supplier_id, paid_on, amount, label, source) values ($1,'2026-11-04',42,'achat','manuel') returning id", [s]))[0].id;
});

describe("0039 — documents de l'espace comptable", () => {
  it("personne d'autre que le patron ou un comptable invité n'y accède", async () => {
    await as("intrus@exemple.test", U_X);
    await expect(db.query("select compta_invoice('F-2026-001')")).rejects.toThrow(/ACCES_REFUSE/);
    await expect(db.query("select compta_document_path($1)", [sp])).rejects.toThrow(/ACCES_REFUSE/);
  });
  it("le patron obtient la facture avec lignes, client (sans e-mail ni téléphone) et coordonnées de l'entreprise", async () => {
    await as(OWNER, U_OWN);
    const d = (await q("select compta_invoice('F-2026-001') d"))[0].d;
    expect(d.invoice.number).toBe("F-2026-001");
    expect(d.lines).toHaveLength(1);
    expect(d.client.name).toBe("Client Exemple");
    expect(JSON.stringify(d.client)).not.toMatch(/secret@|0600000000/);
    expect(d.company.company_name).toBeTruthy();
  });
  it("un numéro inconnu reste introuvable", async () => {
    await as(OWNER, U_OWN);
        await expect(db.query("select compta_invoice('nope')")).rejects.toThrow(/FACTURE_INTROUVABLE/);
  });
  it("compta_data indique si un paiement fournisseur a un justificatif", async () => {
    await admin();
    await q("update supplier_payments set document_path = 'x/y.pdf' where id = $1", [sp]);
    await as(OWNER, U_OWN);
    const d = (await q("select compta_data('2026-11') d"))[0].d;
    expect(d.supplier_payments[0]).toMatchObject({ id: sp, has_doc: true });
    expect((await q("select compta_document_path($1) p", [sp]))[0].p).toBe("x/y.pdf");
  });
});
