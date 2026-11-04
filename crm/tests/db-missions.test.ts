import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (p: string) => readFileSync(path.join(__dirname, "..", p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;`);
  for (const f of ["0001_schema", "0002_automation", "0003_automation_reminders", "0004_reliability", "0005_draft_clients"]) {
    await db.exec(read(`supabase/migrations/${f}.sql`));
  }
  await db.exec(read("supabase/seed.sql"));
  // Données « historiques » avant la migration : un contrat avec intervenant texte, une intervention réalisée.
  await db.exec(`
    insert into clients(id, name, address, city) values ('00000000-0000-0000-0000-0000000000c1','Client A','1 rue A','Paris');
    insert into contracts(id, client_id, label, billing_mode, monthly_amount_ht, start_date, status, assignee)
      values ('00000000-0000-0000-0000-0000000000k1','00000000-0000-0000-0000-0000000000c1','Bureaux A','mensuel',500,'2026-01-01','actif','Fatou Diallo');
    insert into interventions(client_id, contract_id, title, scheduled_date, status, assignee)
      values ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000k1','Passage','2026-10-02','realise','Fatou Diallo');
  `.replace(/0000000000k1/g, "0000000000a1"));
  await db.exec(read("supabase/migrations/0006_sites_staff_missions.sql"));
  await db.exec(read("supabase/migrations/0006_sites_staff_missions.sql")); // rejouable sans doublon
  await db.exec(read("supabase/migrations/0007_process_links.sql"));
  await db.exec(read("supabase/migrations/0007_process_links.sql"));
});

describe("reprise des données (migration compatible)", () => {
  it("crée un site par contrat à l'adresse du client, sans doublon au second passage", async () => {
    const sites = await q("select name, address, city from sites where client_id='00000000-0000-0000-0000-0000000000c1'");
    expect(sites).toEqual([{ name: "Bureaux A", address: "1 rue A", city: "Paris" }]);
    expect((await q("select count(*)::int n from contracts where site_id is null"))[0].n).toBe(0);
  });
  it("transforme l'intervenant texte en fiche Équipe et relie contrat + intervention", async () => {
    expect(await q("select full_name from staff")).toEqual([{ full_name: "Fatou Diallo" }]);
    const [i] = await q("select stage, status, staff_id is not null s, site_id is not null si from interventions");
    expect(i).toEqual({ stage: "terminee", status: "realise", s: true, si: true });
  });
});

describe("étape (12 statuts) ⇄ statut historique", () => {
  let id: string;
  it("une insertion par l'ancien code reçoit une étape cohérente et hérite site, intervenant, check-list", async () => {
    await q("update sites set checklist = '[\"Vider les poubelles\",\"Aspirer\"]'");
    const [r] = await q("insert into interventions(client_id, contract_id, title, scheduled_date) values ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','Passage','2026-11-10') returning id, stage, status, assignee, checklist, site_address");
    id = r.id;
    expect(r.stage).toBe("affectee");
    expect(r.status).toBe("planifie");
    expect(r.assignee).toBe("Fatou Diallo");
    expect(r.checklist).toEqual([{ label: "Vider les poubelles", done: false }, { label: "Aspirer", done: false }]);
    expect(r.site_address).toBe("1 rue A, Paris");
  });
  it("changer l'étape met à jour le statut utilisé par la facturation", async () => {
    for (const [stage, status] of [["en_route", "planifie"], ["en_cours", "planifie"], ["a_verifier", "realise"], ["validee", "realise"], ["annulee", "annule"]]) {
      const [r] = await q("update interventions set stage=$2 where id=$1 returning status", [id, stage]);
      expect(r.status).toBe(status);
    }
  });
  it("l'ancien bouton « réalisé » fait passer l'étape à « terminée »", async () => {
    await q("update interventions set stage='en_cours' where id=$1", [id]);
    const [r] = await q("update interventions set status='realise' where id=$1 returning stage", [id]);
    expect(r.stage).toBe("terminee");
  });
  it("une mission facturée reste « facturée » et ne peut pas revenir en arrière", async () => {
    const [inv] = await q("insert into invoices(client_id) values ('00000000-0000-0000-0000-0000000000c1') returning id");
    const [r] = await q("update interventions set invoice_id=$2 where id=$1 returning stage, status", [id, inv.id]);
    expect(r).toEqual({ stage: "facturee", status: "realise" });
    const [r2] = await q("update interventions set stage='en_cours' where id=$1 returning stage, status", [id]);
    expect(r2).toEqual({ stage: "facturee", status: "realise" });
  });
  it("affecter un agent remplit le nom historique et passe l'étape à « affectée »", async () => {
    const [s] = await q("insert into staff(full_name, zone) values ('Karim B','Paris') returning id");
    const [m] = await q("insert into interventions(client_id, title, scheduled_date) values ('00000000-0000-0000-0000-0000000000c1','Ponctuel','2026-11-12') returning id, stage");
    expect(m.stage).toBe("planifiee");
    const [r] = await q("update interventions set staff_id=$2 where id=$1 returning assignee, stage", [m.id, s.id]);
    expect(r).toEqual({ assignee: "Karim B", stage: "affectee" });
    const [r2] = await q("update interventions set staff_id=null where id=$1 returning assignee, stage", [m.id]);
    expect(r2).toEqual({ assignee: null, stage: "planifiee" });
  });
  it("refuse une étape inconnue", async () => {
    const [m] = await q("insert into interventions(client_id, title, scheduled_date) values ('00000000-0000-0000-0000-0000000000c1','X','2026-11-20') returning id");
    await expect(q("update interventions set stage='nimporte' where id=$1", [m.id])).rejects.toThrow(/interventions_stage_check/);
  });
});

describe("contrat → site", () => {
  it("un nouveau contrat sans site reçoit son site (réutilise celui de même adresse)", async () => {
    const [k] = await q("insert into contracts(client_id, label, billing_mode, start_date) values ('00000000-0000-0000-0000-0000000000c1','Autre contrat','mensuel','2026-12-01') returning site_id");
    const [k2] = await q("insert into contracts(client_id, label, billing_mode, start_date, site_address) values ('00000000-0000-0000-0000-0000000000c1','Entrepôt','mensuel','2026-12-01','9 rue B') returning site_id");
    const [orig] = await q("select site_id from contracts where label='Bureaux A'");
    expect(k.site_id).toBe(orig.site_id);
    expect(k2.site_id).not.toBe(orig.site_id);
    expect((await q("select name, address from sites where id=$1", [k2.site_id]))[0]).toEqual({ name: "Entrepôt", address: "9 rue B" });
  });
});

describe("réglages du processus (0007)", () => {
  it("facturation depuis missions validées activée, action manuelle à J+30, lien devis → contrat", async () => {
    const [s] = await q("select billing_requires_validation b, reminder_manual_days d, unpaid_alert_days a from app_settings");
    expect(s).toEqual({ b: true, d: 30, a: 15 });
    const [c] = await q("insert into clients(name) values ('Devis Client') returning id");
    const [k] = await q("insert into contracts(client_id, label, billing_mode, start_date) values ($1,'Issu devis','mensuel','2026-12-01') returning id", [c.id]);
    const [d] = await q("insert into quotes(client_id, contract_id) values ($1,$2) returning contract_id", [c.id, k.id]);
    expect(d.contract_id).toBe(k.id);
    await q("delete from contracts where id=$1", [k.id]);
    expect((await q("select contract_id from quotes where client_id=$1", [c.id]))[0].contract_id).toBeNull();
  });
});

describe("anomalies", () => {
  it("une anomalie ouverte sur une mission terminée la repasse « à vérifier »", async () => {
    const [m] = await q("insert into interventions(client_id, title, scheduled_date, status) values ('00000000-0000-0000-0000-0000000000c1','Vitres','2026-11-03','realise') returning id, stage");
    expect(m.stage).toBe("terminee");
    await q("insert into mission_issues(kind, intervention_id, client_id, description) values ('anomalie',$1,'00000000-0000-0000-0000-0000000000c1','Clé introuvable')", [m.id]);
    expect((await q("select stage, status from interventions where id=$1", [m.id]))[0]).toEqual({ stage: "a_verifier", status: "realise" });
  });
});

describe("journal des modifications", () => {
  it("trace qui a modifié quoi (colonne avant/après), sans bruit sur updated_at", async () => {
    const [c] = await q("insert into clients(name) values ('Journal SA') returning id");
    await q("update clients set phone='0102030405' where id=$1", [c.id]);
    await q("update clients set phone='0102030405' where id=$1", [c.id]); // aucun changement réel
    const rows = await q("select action, actor, changes from change_log where table_name='clients' and row_id=$1 order by id", [c.id]);
    expect(rows.map((r) => r.action)).toEqual(["insert", "update"]);
    expect(rows[1].actor).toBe("automatisation");
    expect(rows[1].changes).toEqual({ phone: [null, "0102030405"] });
  });
  it("garde le contenu complet d'une ligne supprimée", async () => {
    const [s] = await q("insert into sites(client_id, name) values ('00000000-0000-0000-0000-0000000000c1','À supprimer') returning id");
    await q("delete from sites where id=$1", [s.id]);
    const [r] = await q("select changes->>'name' n from change_log where table_name='sites' and row_id=$1 and action='delete'", [s.id]);
    expect(r.n).toBe("À supprimer");
  });
});
