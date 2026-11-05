import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { sign, verifyInbound, TOLERANCE_SECONDS, allowedOrigin } from "@/lib/inbound-auth";
import { isRef, isTok } from "@/lib/public-api";

const read = (p: string) => readFileSync(path.join(__dirname, "..", p), "utf8");
const hdr = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });

describe("signature HMAC des requêtes du site", () => {
  const secret = "s3cret-partagé", body = '{"name":"Marie","email":"m@x.fr"}', now = 1_800_000_000_000, ts = String(now / 1000);
  it("accepte une requête correctement signée (avec ou sans préfixe sha256=)", () => {
    const sig = sign(secret, ts, body);
    expect(verifyInbound(hdr({ "x-timestamp": ts, "x-signature": sig }), body, secret, now)).toEqual({ ok: true, method: "hmac" });
    expect(verifyInbound(hdr({ "x-timestamp": ts, "x-signature": "sha256=" + sig.toUpperCase() }), body, secret, now).ok).toBe(true);
  });
  it("refuse un corps modifié, un autre secret ou une signature tronquée", () => {
    const sig = sign(secret, ts, body);
    expect(verifyInbound(hdr({ "x-timestamp": ts, "x-signature": sig }), body.replace("Marie", "Eve"), secret, now).ok).toBe(false);
    expect(verifyInbound(hdr({ "x-timestamp": ts, "x-signature": sign("autre", ts, body) }), body, secret, now).ok).toBe(false);
    expect(verifyInbound(hdr({ "x-timestamp": ts, "x-signature": sig.slice(0, 20) }), body, secret, now).ok).toBe(false);
  });
  it("refuse le rejeu d'une requête ancienne ou venue du futur", () => {
    const old = String(now / 1000 - TOLERANCE_SECONDS - 1), future = String(now / 1000 + TOLERANCE_SECONDS + 1);
    expect(verifyInbound(hdr({ "x-timestamp": old, "x-signature": sign(secret, old, body) }), body, secret, now)).toEqual({ ok: false, reason: "requête expirée" });
    expect(verifyInbound(hdr({ "x-timestamp": future, "x-signature": sign(secret, future, body) }), body, secret, now).ok).toBe(false);
    expect(verifyInbound(hdr({ "x-timestamp": "abc", "x-signature": "x" }), body, secret, now).ok).toBe(false);
  });
  it("accepte encore l'ancienne clé d'API ; une signature présente est toujours exigée si elle est fournie", () => {
    expect(verifyInbound(hdr({ "x-inbound-secret": secret }), body, secret, now)).toEqual({ ok: true, method: "cle" });
    expect(verifyInbound(hdr({ "x-inbound-secret": "faux" }), body, secret, now).ok).toBe(false);
    // clé correcte + signature fausse : refusé (pas de repli silencieux)
    expect(verifyInbound(hdr({ "x-inbound-secret": secret, "x-timestamp": ts, "x-signature": "00" }), body, secret, now).ok).toBe(false);
  });
  it("refuse tout si le secret n'est pas configuré", () => {
    expect(verifyInbound(hdr({ "x-inbound-secret": "" }), body, undefined, now).ok).toBe(false);
    expect(verifyInbound(hdr({}), body, secret, now).ok).toBe(false);
  });
  it("CORS : seules les origines déclarées sont autorisées", () => {
    expect(allowedOrigin("https://procleanempire.com")).toBe("https://procleanempire.com");
    expect(allowedOrigin("https://evil.example")).toBeNull();
    expect(allowedOrigin(null)).toBeNull();
  });
  it("formats de numéro et de jeton", () => {
    expect(isRef("DEM-2611-0001")).toBe(true);
    expect(isRef("DEM-2611-0001'; drop table")).toBe(false);
    expect(isTok("a".repeat(64))).toBe(true);
    expect(isTok("A".repeat(64))).toBe(false);
    expect(isTok(null)).toBe(false);
  });
});

describe("suivi public (base de données)", () => {
  let db: PGlite, secret: string;
  const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
  const fails = (sql: string, params: any[], re: RegExp) => expect(db.query(sql, params)).rejects.toThrow(re);
  let ref: string, tok: string;
  const lead = (o: any = {}) => ({ reference: "WEB-1", name: "Marie Durand", email: "m@x.fr", service: "Ménage bureaux", ...o });

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;`);
    for (const f of ["0001_schema", "0002_automation", "0003_automation_reminders", "0004_reliability", "0005_draft_clients", "0006_sites_staff_missions", "0007_process_links", "0008_agent_mobile", "0009_public_api"]) await db.exec(read(`supabase/migrations/${f}.sql`));
    await db.exec(read("supabase/seed.sql"));
    secret = (await q("select automation_secret s from app_settings"))[0].s;
  });
  const submit = async (p: any) => (await q("select submit_quote_request_v2($1,$2::jsonb) r", [secret, JSON.stringify(p)]))[0].r;
  const status = async (r: string, t: string) => (await q("select public_request_status($1,$2) r", [r, t]))[0].r;

  it("la réception exige le secret et renvoie numéro + jeton (64 hex)", async () => {
    await fails("select submit_quote_request_v2('mauvais', '{}'::jsonb)", [], /ACCES_REFUSE/);
    const r = await submit(lead());
    ref = r.request_number; tok = r.tracking_token;
    expect(ref).toMatch(/^DEM-\d{4}-\d{4}$/);
    expect(tok).toMatch(/^[0-9a-f]{64}$/);
    expect(r).toMatchObject({ status: "nouvelle", duplicate: false });
  });
  it("renvoyer la même référence est idempotent : même numéro, même jeton, aucun doublon", async () => {
    const again = await submit(lead());
    expect(again).toMatchObject({ request_number: ref, tracking_token: tok, duplicate: true });
    expect((await q("select count(*)::int n from quote_requests where reference='WEB-1'"))[0].n).toBe(1);
    const second = await submit(lead({ reference: "WEB-2" }));
    expect(second.request_number).not.toBe(ref);
    expect(second.tracking_token).not.toBe(tok);
  });
  it("statut : « reçue » au départ ; numéro inconnu et mauvais jeton sont indiscernables", async () => {
    const s = await status(ref, tok);
    expect(s).toMatchObject({ request_number: ref, status: "recue" });
    expect(s.quote).toBeUndefined();
    expect(await status(ref, "0".repeat(64))).toBeNull();
    expect(await status("DEM-9999-9999", tok)).toBeNull();
    expect(await status(ref.toLowerCase(), tok)).not.toBeNull();   // numéro insensible à la casse
    expect(await status(ref, "court")).toBeNull();
    expect(await status(null as any, null as any)).toBeNull();
  });
  it("ne publie jamais un devis brouillon ; publie le devis dès qu'il est envoyé", async () => {
    const [c] = await q("insert into clients(name) values ('Marie Durand') returning id");
    const [qt] = await q("insert into quotes(client_id, subject, status, number) values ($1,'Ménage','brouillon','DEV-1') returning id", [c.id]);
    await q("insert into quote_lines(quote_id, position, description, quantity, unit_price_ht) values ($1,0,'Ménage',1,100)", [qt.id]);
    await q("update quote_requests set status='traitee', client_id=$1, quote_id=$2 where request_number=$3", [c.id, qt.id, ref]);
    let s = await status(ref, tok);
    expect(s.quote).toBeUndefined();
    expect(s.status_label).toMatch(/préparation/);
    expect((await q("select public_request_doc($1,$2,'devis') r", [ref, tok]))[0].r).toBeNull();
    await q("update quotes set status='envoye' where id=$1", [qt.id]);
    s = await status(ref, tok);
    expect(s).toMatchObject({ status: "devis_envoye", quote: { number: "DEV-1", total_ttc: 120 } });
    const doc = (await q("select public_request_doc($1,$2,'devis') r", [ref, tok]))[0].r;
    expect(doc.lines).toHaveLength(1);
    expect(JSON.stringify(doc)).not.toContain(secret);                 // le secret d'automatisation ne sort jamais
    expect(doc.company.automation_secret).toBeUndefined();
    expect((await q("select public_request_doc($1,'0000000000000000000000000000000000000000000000000000000000000000','devis') r", [ref]))[0].r).toBeNull();
  });
  it("rendez-vous : missions du contrat, sans agent, accès ni notes ; invoice seulement une fois émise", async () => {
    const [qt] = await q("select quote_id id, client_id from quote_requests where request_number=$1", [ref]);
    const [k] = await q("insert into contracts(client_id, label, billing_mode, start_date) values ($1,'Contrat','mensuel','2026-01-01') returning id", [qt.client_id]);
    await q("update quotes set status='accepte', contract_id=$2 where id=$1", [qt.id, k.id]);
    const [st] = await q("insert into staff(full_name) values ('Agent Secret') returning id");
    await q("insert into sites(id, client_id, name, access_notes) values ('00000000-0000-0000-0000-0000000000aa',$1,'S','CODE 9999')", [qt.client_id]);
    await q("insert into interventions(client_id, contract_id, site_id, title, scheduled_date, start_time, staff_id, notes, checklist) values ($1,$2,'00000000-0000-0000-0000-0000000000aa','Ménage', current_date + 2,'09:00',$3,'note interne','[{\"label\":\"a\",\"done\":true},{\"label\":\"b\",\"done\":false}]')", [qt.client_id, k.id, st.id]);
    const s = await status(ref, tok);
    expect(s.status).toBe("planifie");
    expect(s.appointments).toHaveLength(1);
    expect(s.appointments[0]).toMatchObject({ label: "Confirmé", title: "Ménage", finished: false });
    const txt = JSON.stringify(s);
    expect(txt).not.toMatch(/Agent Secret|CODE 9999|note interne/);
    const [inv] = await q("insert into invoices(client_id) values ($1) returning id", [qt.client_id]);
    await q("update quotes set invoice_id=$1 where id=$2", [inv.id, qt.id]);
    expect((await status(ref, tok)).invoice).toBeUndefined();          // brouillon de facture : invisible
    expect((await q("select public_request_doc($1,$2,'facture') r", [ref, tok]))[0].r).toBeNull();
  });
  it("contact réservé : aucune information détaillée, aucun document", async () => {
    const [c] = await q("select client_id from quote_requests where request_number=$1", [ref]);
    await q("update clients set is_reserved=true where id=$1", [c.client_id]);
    const s = await status(ref, tok);
    expect(Object.keys(s).sort()).toEqual(["received_at", "request_number", "service", "status", "status_label"]);
    expect(s.status).toBe("en_traitement");
    expect((await q("select public_request_doc($1,$2,'devis') r", [ref, tok]))[0].r).toBeNull();
  });
  it("le public n'a aucun accès direct aux tables de demandes", async () => {
    await db.exec("begin; set local role anon;");
    const rows = await q("select count(*)::int n from quote_requests").catch(() => [{ n: -1 }]);
    await db.exec("rollback;");
    expect(rows[0].n).toBeLessThanOrEqual(0);
  });
});
