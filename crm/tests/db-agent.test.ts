import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const read = (p: string) => readFileSync(path.join(__dirname, "..", p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const fails = (sql: string, params: any[], re: RegExp) => expect(db.query(sql, params)).rejects.toThrow(re);

const TOKEN_A = "a".repeat(64), TOKEN_B = "b".repeat(64);
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const C = "00000000-0000-0000-0000-0000000000c1";
let sa: string, sb: string, mA: string, mB: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;`);
  for (const f of ["0001_schema", "0002_automation", "0003_automation_reminders", "0004_reliability", "0005_draft_clients", "0006_sites_staff_missions", "0007_process_links", "0008_agent_mobile"]) {
    await db.exec(read(`supabase/migrations/${f}.sql`));
  }
  await db.exec(read("supabase/seed.sql"));
  await q("insert into clients(id, name, address, city) values ($1,'Client Secret SA','1 rue A','Paris')", [C]);
  sa = (await q("insert into staff(full_name, agent_token_hash) values ('Fatou D',$1) returning id", [hash(TOKEN_A)]))[0].id;
  sb = (await q("insert into staff(full_name, agent_token_hash) values ('Karim B',$1) returning id", [hash(TOKEN_B)]))[0].id;
  const [s] = await q("insert into sites(client_id, name, address, city, access_notes, checklist) values ($1,'Bureaux A','1 rue A','Paris','Code 1234','[\"Poubelles\",\"Sols\"]') returning id", [C]);
  const today = (await q("select (now() at time zone 'Europe/Paris')::date d"))[0].d.toISOString().slice(0, 10);
  mA = (await q("insert into interventions(client_id, site_id, title, scheduled_date, staff_id, unit_price_ht, notes) values ($1,$2,'Passage A',$3,$4,350,'Sonner 2 fois') returning id", [C, s.id, today, sa]))[0].id;
  mB = (await q("insert into interventions(client_id, site_id, title, scheduled_date, staff_id, unit_price_ht) values ($1,$2,'Passage B',$3,$4,500) returning id", [C, s.id, today, sb]))[0].id;
});

describe("accès par lien privé", () => {
  it("refuse un jeton inconnu, vide, trop court ou un agent désactivé — même message", async () => {
    for (const t of ["x".repeat(64), "", "court"]) await fails("select agent_missions($1)", [t], /ACCES_REFUSE: lien invalide ou expiré/);
    await fails("select agent_missions(null)", [], /ACCES_REFUSE/);
    await q("update staff set active=false where id=$1", [sb]);
    await fails("select agent_missions($1)", [TOKEN_B], /ACCES_REFUSE/);
    await q("update staff set active=true where id=$1", [sb]);
  });
  it("l'empreinte seule est stockée : le jeton en clair n'existe nulle part en base", async () => {
    const rows = await q("select agent_token_hash from staff where full_name='Fatou D'");
    expect(rows[0].agent_token_hash).toBe(hash(TOKEN_A));
    expect(rows[0].agent_token_hash).not.toContain(TOKEN_A);
  });
  it("ne renvoie que SES missions", async () => {
    const r = (await q("select agent_missions($1) r", [TOKEN_A]))[0].r;
    expect(r.agent).toBe("Fatou D");
    expect(r.missions.map((m: any) => m.id)).toEqual([mA]);
  });
  it("ne divulgue AUCUNE donnée financière (ni prix, ni facture, ni montant)", async () => {
    const r = (await q("select agent_missions($1)::text r", [TOKEN_A]))[0].r;
    expect(r).not.toMatch(/350|unit_price|price|invoice|total|montant|iban/i);
    const m = (await q("select agent_missions($1) r", [TOKEN_A]))[0].r.missions[0];
    expect(Object.keys(m).sort()).toEqual(["access", "address", "checklist", "client", "contact_name", "contact_phone", "date", "hours", "id", "notes", "open_issues", "photos", "site", "stage", "time", "title"]);
    expect(m.access).toBe("Code 1234");
  });
  it("aucun accès direct aux tables par un rôle non-patron (la RLS reste fermée)", async () => {
    const pol = await q("select count(*)::int n from pg_policies where tablename in ('mission_photos','staff','interventions') and 'anon' = any(roles)");
    expect(pol[0].n).toBe(0);
  });
});

describe("actions de l'agent", () => {
  it("ne peut agir que sur ses propres missions", async () => {
    await fails("select agent_set_stage($1,$2,'en_route')", [TOKEN_A, mB], /MISSION_INTROUVABLE/);
    await fails("select agent_toggle_check($1,$2,0,true)", [TOKEN_A, mB], /MISSION_INTROUVABLE/);
    await fails("select agent_report_issue($1,$2,'Problème grave','haute')", [TOKEN_A, mB], /MISSION_INTROUVABLE/);
    await fails("select agent_add_photo($1,$2,'avant','image/jpeg','/9j/')", [TOKEN_A, mB], /MISSION_INTROUVABLE/);
  });
  it("avance dans l'ordre, jamais en arrière, et ne peut ni valider ni facturer", async () => {
    expect((await q("select agent_set_stage($1,$2,'en_route') s", [TOKEN_A, mA]))[0].s).toBe("en_route");
    await fails("select agent_set_stage($1,$2,'en_route')", [TOKEN_A, mA], /ETAPE_INTERDITE/);
    await fails("select agent_set_stage($1,$2,'validee')", [TOKEN_A, mA], /ETAPE_INTERDITE/);
    await fails("select agent_set_stage($1,$2,'facturee')", [TOKEN_A, mA], /ETAPE_INTERDITE/);
    await q("select agent_set_stage($1,$2,'en_cours')", [TOKEN_A, mA]);
  });
  it("refuse « terminée » tant que la check-list n'est pas cochée", async () => {
    await fails("select agent_set_stage($1,$2,'terminee')", [TOKEN_A, mA], /CHECKLIST_INCOMPLETE: 2 point/);
    await q("select agent_toggle_check($1,$2,0,true)", [TOKEN_A, mA]);
    await fails("select agent_set_stage($1,$2,'terminee')", [TOKEN_A, mA], /CHECKLIST_INCOMPLETE: 1 point/);
    await fails("select agent_toggle_check($1,$2,9,true)", [TOKEN_A, mA], /POINT_INTROUVABLE/);
    await q("select agent_toggle_check($1,$2,1,true)", [TOKEN_A, mA]);
    expect((await q("select agent_set_stage($1,$2,'terminee') s", [TOKEN_A, mA]))[0].s).toBe("terminee");
  });
  it("une mission terminée ne peut plus être modifiée par l'agent", async () => {
    await fails("select agent_set_stage($1,$2,'terminee')", [TOKEN_A, mA], /ETAPE_INTERDITE|CHECKLIST|étape impossible/i);
  });
  it("signaler une anomalie remet la mission « à vérifier » et bloque la validation côté patron", async () => {
    await q("select agent_report_issue($1,$2,'Clé introuvable au retour','haute')", [TOKEN_A, mA]);
    const [m] = await q("select stage from interventions where id=$1", [mA]);
    expect(m.stage).toBe("a_verifier");
    const [i] = await q("select kind, severity, reported_by, status from mission_issues where intervention_id=$1", [mA]);
    expect(i).toEqual({ kind: "anomalie", severity: "haute", reported_by: "Fatou D", status: "ouverte" });
    await fails("select agent_report_issue($1,$2,'  ','normale')", [TOKEN_A, mA], /DESCRIPTION_VIDE/);
    await fails("select agent_set_stage($1,$2,'terminee')", [TOKEN_A, mA], /ETAPE_INTERDITE/);
  });
  it("le journal attribue les changements à l'agent, pas à « automatisation »", async () => {
    const rows = await q("select distinct actor from change_log where table_name='interventions' and row_id=$1", [mA]);
    expect(rows.map((r) => r.actor)).toContain("Agent : Fatou D");
  });
});

describe("photos", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString("base64");
  it("enregistre une photo valide avec ses métadonnées (qui, quand, type, taille)", async () => {
    // mB (agent B) est encore planifiée : photo autorisée
    const id = (await q("select agent_add_photo($1,$2,'avant','image/jpeg',$3) id", [TOKEN_B, mB, jpeg]))[0].id;
    const [p] = await q("select kind, content_type, size_bytes, staff_id, taken_at is not null t from mission_photos where id=$1", [id]);
    expect(p).toEqual({ kind: "avant", content_type: "image/jpeg", size_bytes: 7, staff_id: sb, t: true });
    expect((await q("select agent_missions($1)->'missions'->0->>'photos' n", [TOKEN_B]))[0].n).toBe("1");
  });
  it("refuse format inconnu, type inconnu, photo vide ou trop lourde, au-delà de 20", async () => {
    await fails("select agent_add_photo($1,$2,'avant','application/pdf',$3)", [TOKEN_B, mB, jpeg], /PHOTO_INVALIDE: format/);
    await fails("select agent_add_photo($1,$2,'selfie','image/jpeg',$3)", [TOKEN_B, mB, jpeg], /PHOTO_INVALIDE: type/);
    await fails("select agent_add_photo($1,$2,'avant','image/jpeg','')", [TOKEN_B, mB], /PHOTO_INVALIDE: photo vide/);
    const big = Buffer.alloc(1_500_001, 1).toString("base64");
    await fails("select agent_add_photo($1,$2,'avant','image/jpeg',$3)", [TOKEN_B, mB, big], /PHOTO_INVALIDE: photo vide ou trop lourde/);
    for (let i = 0; i < 19; i++) await q("select agent_add_photo($1,$2,'apres','image/jpeg',$3)", [TOKEN_B, mB, jpeg]);
    await fails("select agent_add_photo($1,$2,'apres','image/jpeg',$3)", [TOKEN_B, mB, jpeg], /20 photos maximum/);
  });
});
