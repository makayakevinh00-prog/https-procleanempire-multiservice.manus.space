import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (p: string) => readFileSync(path.join(__dirname, "..", p), "utf8");

// Stubs de l'environnement Supabase (schéma auth + rôle authenticated)
const SUPABASE_STUBS = `
  create schema auth;
  create function auth.uid() returns uuid language sql as $$ select '11111111-1111-1111-1111-111111111111'::uuid $$;
  create function auth.jwt() returns jsonb language sql as $$ select '{"email":"contact@procleanempire.com"}'::jsonb $$;
  create role authenticated;
  create role anon;
`;

let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const fails = async (sql: string, params: any[], re: RegExp) => {
  await expect(db.query(sql, params)).rejects.toThrow(re);
};

async function client(name: string, reserved = false) {
  const [c] = await q<{ id: string }>(
    "insert into clients(name, is_reserved) values ($1,$2) returning id", [name, reserved]);
  return c.id;
}
async function draft(clientId: string, price: number, qty = 1) {
  const [i] = await q<{ id: string }>("insert into invoices(client_id) values ($1) returning id", [clientId]);
  await q("insert into invoice_lines(invoice_id, description, quantity, unit_price_ht) values ($1,'Prestation',$2,$3)", [i.id, qty, price]);
  return i.id;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(read("supabase/migrations/0001_schema.sql"));
  await db.exec(read("supabase/seed.sql"));
  await db.exec(read("supabase/seed.sql")); // idempotent
});

describe("seed", () => {
  it("est idempotent et complet", async () => {
    expect((await q("select count(*)::int n from clients"))[0].n).toBe(9);
    expect((await q("select count(*)::int n from contracts"))[0].n).toBe(7);
    expect((await q("select count(*)::int n from quotes"))[0].n).toBe(4);
  });
  it("marque exactement les contacts réservés", async () => {
    const r = await q<{ name: string }>("select name from clients where is_reserved order by name");
    expect(r.map((x) => x.name)).toEqual(["Ahmed El Youssfi", "RNB OPTIQUE"]);
  });
  it("calcule les totaux des devis (129,17 € HT = 155,00 € TTC)", async () => {
    const [d] = await q("select total_ht::float h, total_ttc::float t from quotes where number='DEV-108'");
    expect(d).toEqual({ h: 129.17, t: 155 });
  });
  it("continue la numérotation après DEV-110", async () => {
    const c = await client("Nouveau");
    const [n] = await q("insert into quotes(client_id) values ($1) returning number", [c]);
    expect(n.number).toBe("DEV-111");
  });
});

describe("contrats", () => {
  it("calcule les heures hebdo automatiquement", async () => {
    const c = await client("Site test");
    const [k] = await q(
      "insert into contracts(client_id,label,hours_per_visit,visits_per_week) values ($1,'x',2.5,2) returning weekly_hours::float w", [c]);
    expect(k.w).toBe(5);
  });
});

describe("factures — règle bloquante de validation manuelle", () => {
  it("refuse de sortir du brouillon sans validation (update direct)", async () => {
    const id = await draft(await client("C1"), 100);
    await fails("update invoices set status='envoye' where id=$1", [id], /invoice_requires_validation/);
    await fails("update invoices set status='paye' where id=$1", [id], /invoice_requires_validation/);
  });
  it("refuse une facture insérée directement hors brouillon", async () => {
    const c = await client("C2");
    await fails("insert into invoices(client_id,status) values ($1,'envoye')", [c], /invoice_requires_validation/);
  });
  it("valide, numérote F-AAAA-001 sans trou, fixe l'échéance", async () => {
    const yr = new Date().getFullYear();
    const a = await draft(await client("C3"), 100);
    const b = await draft(await client("C4"), 200);
    const [v1] = await q("select number, status, validated_by from validate_invoice($1)", [a]);
    const [v2] = await q("select number from validate_invoice($1)", [b]);
    expect(v1.number).toBe(`F-${yr}-001`);
    expect(v2.number).toBe(`F-${yr}-002`);
    expect(v1.status).toBe("envoye");
    expect(v1.validated_by).toBeTruthy();
  });
  it("ne revalide pas une facture déjà validée", async () => {
    const id = await draft(await client("C5"), 50);
    await q("select validate_invoice($1)", [id]);
    await fails("select validate_invoice($1)", [id], /FACTURE_DEJA_VALIDEE/);
  });
  it("verrouille les lignes et interdit la suppression après validation", async () => {
    const id = await draft(await client("C6"), 50);
    await q("select validate_invoice($1)", [id]);
    await fails("insert into invoice_lines(invoice_id,description,unit_price_ht) values ($1,'x',1)", [id], /FACTURE_VERROUILLEE/);
    await fails("delete from invoices where id=$1", [id], /FACTURE_NON_SUPPRIMABLE/);
  });
  it("supprime un brouillon avec ses lignes", async () => {
    const id = await draft(await client("C7"), 50);
    await q("delete from invoices where id=$1", [id]);
    expect((await q("select count(*)::int n from invoice_lines where invoice_id=$1", [id]))[0].n).toBe(0);
  });
  it("refuse une facture vide", async () => {
    const [i] = await q("insert into invoices(client_id) values ($1) returning id", [await client("C8")]);
    await fails("select validate_invoice($1)", [i.id], /FACTURE_VIDE/);
  });
});

describe("règle 1 — contacts réservés", () => {
  it("exige la confirmation explicite du patron pour valider", async () => {
    const id = await draft(await client("Réservé A", true), 100);
    await fails("select validate_invoice($1)", [id], /CONTACT_RESERVE/);
    const [ok] = await q("select number from validate_invoice($1, false, true)", [id]);
    expect(ok.number).toMatch(/^F-\d{4}-\d{3}$/);
  });
  it("interdit TOUTE relance automatique, même avec confirmation", async () => {
    const id = await draft(await client("Réservé B", true), 100);
    await q("select validate_invoice($1, false, true)", [id]);
    await fails("select register_reminder($1,'email','auto',null,true,true)", [id], /CONTACT_RESERVE: relance automatique interdite/);
  });
  it("exige la confirmation pour convertir un devis de contact réservé", async () => {
    const [d] = await q("select id from quotes where number='DEV-108'");
    await fails("select convert_quote_to_invoice($1)", [d.id], /CONTACT_RESERVE/);
  });
});

describe("règle 4 — montants > 1500 € HT", () => {
  it("bloque sans confirmation, passe avec", async () => {
    const id = await draft(await client("Gros"), 1500.01);
    await fails("select validate_invoice($1)", [id], /MONTANT_ELEVE/);
    await q("select validate_invoice($1, true)", [id]);
  });
  it("n'alerte pas à exactement 1500 € HT", async () => {
    const id = await draft(await client("Pile"), 1500);
    await q("select validate_invoice($1)", [id]);
  });
});

describe("devis → facture", () => {
  it("crée un BROUILLON (jamais émis) avec les lignes du devis", async () => {
    const [d] = await q("select id from quotes where number='DEV-110'");
    const [r] = await q("select convert_quote_to_invoice($1) id", [d.id]);
    const [i] = await q("select status, number, total_ht::float h from invoices where id=$1", [r.id]);
    expect(i).toEqual({ status: "brouillon", number: null, h: 120 });
    await fails("select convert_quote_to_invoice($1)", [d.id], /DEVIS_DEJA_FACTURE/);
  });
  it("refuse un devis non accepté", async () => {
    const c = await client("Devis KO");
    const [qq] = await q("insert into quotes(client_id) values ($1) returning id", [c]);
    await fails("select convert_quote_to_invoice($1)", [qq.id], /DEVIS_NON_ACCEPTE/);
  });
  it("permet de refaire une facture annulée (cas DEV-109)", async () => {
    const [d] = await q("select id from quotes where number='DEV-109'");
    const [r1] = await q("select convert_quote_to_invoice($1) id", [d.id]);
    await q("select cancel_invoice($1,'à refaire')", [r1.id]);
    const [r2] = await q("select convert_quote_to_invoice($1) id", [d.id]);
    expect(r2.id).not.toBe(r1.id);
  });
});

describe("règle 3 — relances", () => {
  it("refuse une seconde relance trop proche, sauf forçage manuel", async () => {
    const id = await draft(await client("Relance"), 100);
    await q("select validate_invoice($1)", [id]);
    const [r1] = await q("select level from register_reminder($1)", [id]);
    expect(r1.level).toBe(1);
    await fails("select register_reminder($1)", [id], /RELANCE_DEJA_ENVOYEE/);
    await fails("select register_reminder($1,'email','auto')", [id], /RELANCE_DEJA_ENVOYEE/);
    const [r2] = await q("select level from register_reminder($1,'telephone','manuel',null,true)", [id]);
    expect(r2.level).toBe(2);
    expect((await q("select reminder_count n from invoices where id=$1", [id]))[0].n).toBe(2);
  });
  it("annule une relance et restaure compteur et date", async () => {
    const id = await draft(await client("Relance undo"), 100);
    await q("select validate_invoice($1)", [id]);
    const [r] = await q("select id from register_reminder($1)", [id]);
    await q("select undo_reminder($1)", [r.id]);
    const [i] = await q("select reminder_count n, last_reminder_at l from invoices where id=$1", [id]);
    expect(i).toEqual({ n: 0, l: null });
    await q("select register_reminder($1)", [id]); // à nouveau possible
  });
  it("refuse de relancer un brouillon", async () => {
    const id = await draft(await client("Relance brouillon"), 100);
    await fails("select register_reminder($1)", [id], /RELANCE_IMPOSSIBLE/);
  });
});

describe("paiements", () => {
  it("passe en retard puis rapproche un virement jusqu'à 'payé'", async () => {
    const id = await draft(await client("Payeur"), 100);
    await q("select validate_invoice($1)", [id]);
    await q("update invoices set due_date = current_date - 3 where id=$1", [id]);
    expect((await q("select refresh_overdue() n"))[0].n).toBeGreaterThanOrEqual(1);
    expect((await q("select status from invoices where id=$1", [id]))[0].status).toBe("en_retard");

    const [p] = await q("insert into payments(source, amount, received_at) values ('manuel', 120, now()) returning id");
    const [inv] = await q("select status, paid_amount::float a from reconcile_payment($1,$2)", [p.id, id]);
    expect(inv).toEqual({ status: "paye", a: 120 });
    await fails("select reconcile_payment($1,$2)", [p.id, id], /PAIEMENT_DEJA_RAPPROCHE/);

    await q("select unreconcile_payment($1)", [p.id]);
    expect((await q("select status from invoices where id=$1", [id]))[0].status).toBe("en_retard");
  });
  it("garde le statut ouvert en cas de paiement partiel", async () => {
    const id = await draft(await client("Partiel"), 100);
    await q("select validate_invoice($1)", [id]);
    const [p] = await q("insert into payments(source, amount, received_at) values ('manuel', 50, now()) returning id");
    const [inv] = await q("select status from reconcile_payment($1,$2)", [p.id, id]);
    expect(inv.status).toBe("envoye");
  });
});
