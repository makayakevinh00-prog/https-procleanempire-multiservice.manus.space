import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (p: string) => readFileSync(path.join(__dirname, "..", p), "utf8");
let db: PGlite;
let secret: string;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const fails = async (sql: string, params: any[], re: RegExp) => { await expect(db.query(sql, params)).rejects.toThrow(re); };

async function client(name: string, o: { reserved?: boolean; email?: string | null; auto?: boolean } = {}) {
  const [c] = await q("insert into clients(name,is_reserved,email,auto_send_invoices) values ($1,$2,$3,$4) returning id", [name, o.reserved ?? false, o.email === undefined ? `${name}@x.fr` : o.email, o.auto ?? true]);
  return c.id as string;
}
const lines = (ht: number) => JSON.stringify([{ description: "Prestation", quantity: 1, unit_price_ht: ht, vat_rate: 20 }]);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;`);
  await db.exec(read("supabase/migrations/0001_schema.sql"));
  await db.exec(read("supabase/seed.sql"));
  await db.exec(read("supabase/migrations/0002_automation.sql"));
  await db.exec(read("supabase/migrations/0003_automation_reminders.sql"));
  await db.exec(read("supabase/seed_services.sql"));
  secret = (await q("select automation_secret s from app_settings"))[0].s;
});

describe("secret d'automatisation", () => {
  it("est généré (64 caractères) et refuse tout autre appel", async () => {
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
    await fails("select automation_month_data($1,'2026-11')", ["mauvais"], /ACCES_REFUSE/);
    await fails("select automation_month_data(null,'2026-11')", [], /ACCES_REFUSE/);
    await fails("select submit_quote_request($1,'{}'::jsonb)", ["x"], /ACCES_REFUSE/);
  });
  it("le catalogue est chargé (38 prestations)", async () => {
    expect((await q("select count(*)::int n from services"))[0].n).toBe(38);
    const [s] = await q("select name, unit_price_ht::float p from services where code='AIR-STU-ESS'");
    expect(s).toEqual({ name: "Ménage Airbnb Studio (Essentiel)", p: 35 });
  });
  it("les informations légales de l'entreprise sont préremplies", async () => {
    const [s] = await q("select company_legal_form f, company_siret s from app_settings");
    expect(s).toEqual({ f: "SASU", s: "106 602 659 00018" });
  });
});

describe("facture mensuelle automatique", () => {
  it("crée un brouillon avec billing_month, lie les interventions, refuse le doublon", async () => {
    const c = await client("Auto1");
    const [i] = await q("insert into interventions(client_id,title,scheduled_date,status,unit_price_ht) values ($1,'Ménage','2026-11-05','realise',35) returning id", [c]);
    const [r] = await q("select automation_create_invoice($1,$2,'2026-11','Prestations de novembre 2026',$3::jsonb,array[$4]::uuid[],null) id", [secret, c, lines(35), i.id]);
    const [inv] = await q("select status, number, total_ht::float h, billing_month m from invoices where id=$1", [r.id]);
    expect(inv).toEqual({ status: "brouillon", number: null, h: 35, m: "2026-11" });
    expect((await q("select invoice_id from interventions where id=$1", [i.id]))[0].invoice_id).toBe(r.id);
    await fails("select automation_create_invoice($1,$2,'2026-11','x',$3::jsonb,array[]::uuid[],null)", [secret, c, lines(10)], /FACTURE_MENSUELLE_EXISTANTE/);
  });
  it("un mois annulé peut être refacturé", async () => {
    const c = await client("Auto2");
    const [r] = await q("select automation_create_invoice($1,$2,'2026-11','x',$3::jsonb,array[]::uuid[],null) id", [secret, c, lines(10)]);
    await q("select cancel_invoice($1,'erreur')", [r.id]);
    await q("select automation_create_invoice($1,$2,'2026-11','x',$3::jsonb,array[]::uuid[],null)", [secret, c, lines(10)]);
  });
  it("valide avec numérotation, mais REFUSE contact réservé et montant > 1500 € HT", async () => {
    const ok = await client("Auto3");
    const [a] = await q("select automation_create_invoice($1,$2,'2026-12','x',$3::jsonb,array[]::uuid[],null) id", [secret, ok, lines(100)]);
    const [n] = await q("select automation_validate_invoice($1,$2) n", [secret, a.id]);
    expect(n.n).toMatch(/^F-\d{4}-\d{3}$/);

    const res = await client("Auto4", { reserved: true });
    const [b] = await q("select automation_create_invoice($1,$2,'2026-12','x',$3::jsonb,array[]::uuid[],null) id", [secret, res, lines(100)]);
    await fails("select automation_validate_invoice($1,$2)", [secret, b.id], /CONTACT_RESERVE/);

    const big = await client("Auto5");
    const [c] = await q("select automation_create_invoice($1,$2,'2026-12','x',$3::jsonb,array[]::uuid[],null) id", [secret, big, lines(1500.01)]);
    await fails("select automation_validate_invoice($1,$2)", [secret, c.id], /MONTANT_ELEVE/);
    expect((await q("select status from invoices where id=$1", [c.id]))[0].status).toBe("brouillon");
  });
  it("liste à envoyer : validées, non envoyées, auto, non réservées, avec e-mail — puis marque envoyée", async () => {
    const c = await client("Auto6");
    const [a] = await q("select automation_create_invoice($1,$2,'2027-01','x',$3::jsonb,array[]::uuid[],null) id", [secret, c, lines(100)]);
    await q("select automation_validate_invoice($1,$2)", [secret, a.id]);
    const noEmail = await client("Auto7", { email: null });
    const [b] = await q("select automation_create_invoice($1,$2,'2027-01','x',$3::jsonb,array[]::uuid[],null) id", [secret, noEmail, lines(100)]);
    await q("select automation_validate_invoice($1,$2)", [secret, b.id]);
    const manual = await client("Auto8", { auto: false });
    const [m] = await q("select automation_create_invoice($1,$2,'2027-01','x',$3::jsonb,array[]::uuid[],null) id", [secret, manual, lines(100)]);
    await q("select automation_validate_invoice($1,$2)", [secret, m.id]);

    const [p] = await q("select automation_pending_send($1) r", [secret]);
    const ids = p.r.items.map((x: any) => x.invoice.id);
    expect(ids).toContain(a.id);
    expect(ids).not.toContain(b.id); // pas d'e-mail
    expect(ids).not.toContain(m.id); // envoi auto non activé pour ce client
    expect(p.r.settings.automation_secret).toBeUndefined();

    await q("select automation_mark_sent($1,$2,'x@y.fr')", [secret, a.id]);
    const [after] = await q("select automation_pending_send($1) r", [secret]);
    expect(after.r.items.map((x: any) => x.invoice.id)).not.toContain(a.id);
    expect((await q("select count(*)::int n from interactions i join clients c on c.id=i.client_id where c.name='Auto6' and i.kind='facture'"))[0].n).toBe(1);
  });
});

describe("planning et demandes", () => {
  it("une intervention facturée est verrouillée (modif et suppression)", async () => {
    const c = await client("Plan1");
    const [i] = await q("insert into interventions(client_id,title,scheduled_date,status,unit_price_ht) values ($1,'M','2027-02-03','realise',35) returning id", [c]);
    const [r] = await q("select automation_create_invoice($1,$2,'2027-02','x',$3::jsonb,array[$4]::uuid[],null) id", [secret, c, lines(35), i.id]);
    await fails("update interventions set unit_price_ht=1 where id=$1", [i.id], /INTERVENTION_FACTUREE/);
    await fails("delete from interventions where id=$1", [i.id], /INTERVENTION_FACTUREE/);
    await q("delete from invoices where id=$1", [r.id]); // brouillon supprimé → intervention libérée
    await q("update interventions set unit_price_ht=36 where id=$1", [i.id]);
  });
  it("les données du mois exposent interventions libres, contrats et clients facturés", async () => {
    const c = await client("Plan2");
    await q("insert into interventions(client_id,title,scheduled_date,unit_price_ht) values ($1,'A','2027-03-10',10)", [c]);
    const [d] = await q("select automation_month_data($1,'2027-03') d", [secret]);
    expect(d.d.interventions.some((x: any) => x.client_id === c)).toBe(true);
    expect(Array.isArray(d.d.invoiced_clients)).toBe(true);
    expect(d.d.settings.automation_secret).toBeUndefined();
  });
  it("la demande de devis est enregistrée une seule fois par référence", async () => {
    const p = JSON.stringify({ reference: "D1", name: "Test", email: "t@x.fr", service: "Bureaux" });
    const [a] = await q("select submit_quote_request($1,$2::jsonb) id", [secret, p]);
    const [b] = await q("select submit_quote_request($1,$2::jsonb) id", [secret, p]);
    expect(a.id).toBeTruthy();
    expect(b.id).toBeNull();
  });
  it("relance de devis : seulement si activée, sans réservé, sans doublon", async () => {
    const c = await client("Suivi1");
    const [qq] = await q("insert into quotes(client_id,status,sent_at) values ($1,'envoye', now() - interval '10 days') returning id", [c]);
    expect((await q("select automation_quotes_to_follow($1) r", [secret]))[0].r).toEqual([]); // désactivé par défaut
    await q("update app_settings set quote_followup_enabled=true");
    const [r] = await q("select automation_quotes_to_follow($1) r", [secret]);
    expect(r.r.map((x: any) => x.id)).toContain(qq.id);
    await q("select automation_quote_followup_done($1,$2)", [secret, qq.id]);
    expect((await q("select automation_quotes_to_follow($1) r", [secret]))[0].r.map((x: any) => x.id)).not.toContain(qq.id);
  });
});

describe("relances automatiques de factures", () => {
  it("liste les factures ouvertes, enregistre une relance auto, refuse les réservés et les doublons", async () => {
    const c = await client("Rel1");
    const [a] = await q("select automation_create_invoice($1,$2,'2027-04','x',$3::jsonb,array[]::uuid[],null) id", [secret, c, lines(100)]);
    await q("select automation_validate_invoice($1,$2)", [secret, a.id]);
    const [d] = await q("select automation_due_reminders($1) r", [secret]);
    expect(d.r.items.map((x: any) => x.invoice.id)).toContain(a.id);
    expect(d.r.settings.automation_secret).toBeUndefined();

    const [r] = await q("select automation_register_reminder($1,$2) r", [secret, a.id]);
    expect(r.r.level).toBe(1);
    await fails("select automation_register_reminder($1,$2)", [secret, a.id], /RELANCE_DEJA_ENVOYEE/);
    await q("select automation_undo_reminder($1,$2)", [secret, r.r.id]);
    await q("select automation_register_reminder($1,$2)", [secret, a.id]); // à nouveau possible

    const res = await client("Rel2", { reserved: true });
    const [b] = await q("select automation_create_invoice($1,$2,'2027-04','x',$3::jsonb,array[]::uuid[],null) id", [secret, res, lines(100)]);
    await q("select validate_invoice($1,false,true)", [b.id]);
    await fails("select automation_register_reminder($1,$2)", [secret, b.id], /CONTACT_RESERVE/);
    await fails("select automation_due_reminders($1)", ["mauvais"], /ACCES_REFUSE/);
  });
  it("passe en retard les factures échues", async () => {
    const c = await client("Rel3");
    const [a] = await q("select automation_create_invoice($1,$2,'2027-05','x',$3::jsonb,array[]::uuid[],null) id", [secret, c, lines(100)]);
    await q("select automation_validate_invoice($1,$2)", [secret, a.id]);
    await q("update invoices set due_date = current_date - 2 where id=$1", [a.id]);
    expect((await q("select automation_refresh_overdue($1) n", [secret]))[0].n).toBeGreaterThanOrEqual(1);
    expect((await q("select status from invoices where id=$1", [a.id]))[0].status).toBe("en_retard");
  });
});
