import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { requestType } from "@/lib/request-type";

const read = (p: string) => readFileSync(path.join(__dirname, "..", p), "utf8");
const migrations = () => readdirSync(path.join(__dirname, "..", "supabase/migrations")).filter((n) => n.endsWith(".sql")).sort();
const AUTH = `create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;`;

async function boot(upTo?: string) {
  const db = new PGlite();
  await db.exec(AUTH);
  await db.exec(read("supabase/migrations/0001_schema.sql"));
  await db.exec(read("supabase/seed.sql"));
  for (const f of migrations().slice(1)) {
    if (upTo && f > upTo) break;
    await db.exec(read(`supabase/migrations/${f}`));
  }
  return db;
}

describe("type de demande", () => {
  it("reconnaît les 6 types du site, avec alias, accents et majuscules", () => {
    expect(requestType("Rendez-vous", "")).toBe("rendez_vous");
    expect(requestType("RDV", "")).toBe("rendez_vous");
    expect(requestType("copro", "")).toBe("copropriete");
    expect(requestType("Copropriété", "")).toBe("copropriete");
    expect(requestType("airbnb", "")).toBe("airbnb");
    expect(requestType("conciergerie", "")).toBe("conciergerie");
    expect(requestType("professionnel", "")).toBe("professionnel");
    expect(requestType("devis", "")).toBe("devis");
  });
  it("déduit le type du libellé du service quand le site n'envoie pas de type", () => {
    expect(requestType(undefined, "Ménage Airbnb Studio (Essentiel)")).toBe("airbnb");
    expect(requestType(undefined, "Nettoyage des parties communes — résidence")).toBe("copropriete");
    expect(requestType(undefined, "Entretien de bureaux")).toBe("professionnel");
    expect(requestType(undefined, "Conciergerie location courte durée")).toBe("conciergerie");
    expect(requestType(undefined, "Ménage à domicile")).toBe("devis");
    expect(requestType("n'importe quoi", undefined)).toBe("devis");     // valeur inconnue : jamais d'erreur
    expect(requestType(42, null)).toBe("devis");
  });
});

describe("prospects automatiques (base de données)", () => {
  let db: PGlite, secret: string;
  const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
  let n = 0;
  const submit = async (o: any = {}) => (await q("select submit_quote_request_v2($1,$2::jsonb) r", [secret, JSON.stringify({ reference: `W-${++n}`, name: "Marie Durand", email: "marie@x.fr", phone: "06 12 34 56 78", service: "Ménage bureaux", message: "Bonjour", ...o })]))[0].r;
  const clients = async () => (await q("select count(*)::int n from clients"))[0].n;

  beforeAll(async () => { db = await boot(); secret = (await q("select automation_secret s from app_settings"))[0].s; });

  it("une demande crée une fiche prospect complète, une action « nouveau prospect » et une entrée d'historique", async () => {
    const before = await clients();
    const r = await submit({ company: "Durand SARL", city: "Paris", postcode: "75016", address: "1 rue A" });
    expect(r).toMatchObject({ duplicate: false, new_prospect: true, reserved: false, request_type: "devis" });
    expect(await clients()).toBe(before + 1);
    const [c] = await q("select * from clients where id=$1", [r.client_id]);
    expect(c).toMatchObject({ name: "Durand SARL", kind: "entreprise", status: "prospect", pipeline: "nouveau_prospect", source: "site web", email: "marie@x.fr", city: "Paris", postal_code: "75016" });
    expect(c.notes).toMatch(/Contact : Marie Durand/);
    const h = await q("select kind, summary from interactions where client_id=$1", [r.client_id]);
    expect(h).toHaveLength(1);
    expect(h[0].kind).toBe("demande");
    expect(h[0].summary).toMatch(/DEM-\d{4}-\d{4}/);
    expect((await q("select client_id from quote_requests where request_number=$1", [r.request_number]))[0].client_id).toBe(r.client_id);
  });

  it("aucun doublon : même e-mail (casse et espaces ignorés), même téléphone (autre format) — l'échange s'ajoute à l'historique", async () => {
    const first = await submit({ reference: "D-0", email: "paul@x.fr", phone: "07 11 22 33 44", name: "Paul Martin" });
    const before = await clients();
    const byMail = await submit({ email: "  PAUL@X.FR ", phone: null, name: "P. Martin" });
    const byPhone = await submit({ email: "autre@x.fr", phone: "+33 7 11 22 33 44", name: "Paul M." });
    expect(byMail).toMatchObject({ client_id: first.client_id, new_prospect: false });
    expect(byPhone).toMatchObject({ client_id: first.client_id, new_prospect: false });
    expect(await clients()).toBe(before);
    expect((await q("select count(*)::int n from interactions where client_id=$1 and kind='demande'", [first.client_id]))[0].n).toBe(3);
  });

  it("renvoyer la même demande (même référence) ne crée ni fiche ni ligne d'historique de plus", async () => {
    const a = await submit({ reference: "SAME", email: "same@x.fr", phone: "06 00 00 00 01", name: "Same" });
    const before = await clients(), hist = (await q("select count(*)::int n from interactions"))[0].n;
    const b = await submit({ reference: "SAME", email: "same@x.fr", name: "Same" });
    expect(b).toMatchObject({ duplicate: true, request_number: a.request_number, new_prospect: false });
    expect(await clients()).toBe(before);
    expect((await q("select count(*)::int n from interactions"))[0].n).toBe(hist);
  });

  it("deux personnes homonymes aux coordonnées différentes : deux fiches distinctes, nom désambiguïsé", async () => {
    const a = await submit({ name: "Jean Dupont", email: "j1@x.fr", phone: "06 55 55 55 01", city: "Lyon" });
    const b = await submit({ name: "Jean Dupont", email: "j2@x.fr", phone: "06 55 55 55 02", city: "Lyon" });
    expect(a.client_id).not.toBe(b.client_id);
    const names = (await q("select name from clients where id = any($1::uuid[]) order by name", [[a.client_id, b.client_id]])).map((x) => x.name);
    expect(new Set(names).size).toBe(2);
    expect(names.some((x) => /Jean Dupont \(Lyon\)|Jean Dupont \(DEM-/.test(x))).toBe(true);
  });

  it("demande de rendez-vous → « À contacter » ; elle n'est jamais une prestation confirmée (aucun contrat, devis ni mission créé)", async () => {
    const r = await submit({ type: "rendez_vous", name: "Rdv Client", email: "rdv@x.fr", phone: "06 66 66 66 66" });
    expect((await q("select pipeline from clients where id=$1", [r.client_id]))[0].pipeline).toBe("a_contacter");
    for (const t of ["quotes", "contracts", "interventions"]) expect((await q(`select count(*)::int n from ${t} where client_id=$1`, [r.client_id]))[0].n).toBe(0);
  });

  it("type de demande inconnu refusé par la base ; les 6 types sont enregistrés", async () => {
    for (const t of ["devis", "rendez_vous", "airbnb", "copropriete", "professionnel", "conciergerie"]) {
      expect((await submit({ type: t, email: `${t}@x.fr`, phone: null, name: `T ${t}` })).request_type).toBe(t);
    }
    await expect(submit({ type: "pirate", email: "p@x.fr", phone: null })).rejects.toThrow(/request_type/);
  });

  it("contact réservé : la demande est rattachée et tracée, signalée, sans aucune action automatique", async () => {
    const c = (await q("insert into clients(name, email, phone, is_reserved, status, pipeline) values ('Réservé SA','res@x.fr','06 99 99 99 99',true,'actif','client_actif') returning id"))[0].id;
    const r = await submit({ email: "res@x.fr", name: "Quelqu'un" });   // le téléphone par défaut du test correspond à une AUTRE fiche : l'e-mail doit l'emporter
    expect(r).toMatchObject({ client_id: c, reserved: true, new_prospect: false });
    expect((await q("select summary from interactions where client_id=$1", [c]))[0].summary).toMatch(/CONTACT RÉSERVÉ/);
    expect((await q("select pipeline from clients where id=$1", [c]))[0].pipeline).toBe("client_actif");
    expect((await q("select count(*)::int n from quotes where client_id=$1", [c]))[0].n).toBe(0);
  });

  it("un prospect refusé qui revient repart en « nouveau prospect » ; un client actif reste actif", async () => {
    const r = await submit({ email: "back@x.fr", phone: null, name: "Back" });
    await q("update clients set pipeline='devis_refuse' where id=$1", [r.client_id]);
    await submit({ email: "back@x.fr", phone: null, name: "Back" });
    expect((await q("select pipeline from clients where id=$1", [r.client_id]))[0].pipeline).toBe("nouveau_prospect");
    await q("update clients set pipeline='client_actif', status='actif' where id=$1", [r.client_id]);
    await submit({ email: "back@x.fr", phone: null, name: "Back" });
    expect((await q("select pipeline from clients where id=$1", [r.client_id]))[0].pipeline).toBe("client_actif");
  });

  it("le pipeline suit le devis (envoyé → accepté), jamais en arrière, puis le contrat actif rend client actif", async () => {
    const r = await submit({ email: "flow@x.fr", phone: null, name: "Flow" });
    const cid = r.client_id;
    const [qt] = await q("insert into quotes(client_id, subject, status) values ($1,'S','brouillon') returning id, number", [cid]);
    expect((await q("select pipeline from clients where id=$1", [cid]))[0].pipeline).toBe("nouveau_prospect");     // un brouillon ne change rien
    await q("update quotes set status='envoye' where id=$1", [qt.id]);
    expect((await q("select pipeline from clients where id=$1", [cid]))[0].pipeline).toBe("devis_envoye");
    await q("update quotes set status='accepte' where id=$1", [qt.id]);
    expect((await q("select pipeline from clients where id=$1", [cid]))[0].pipeline).toBe("devis_accepte");
    await q("update quotes set status='envoye' where id=$1", [qt.id]);                                              // renvoi : pas de recul
    expect((await q("select pipeline from clients where id=$1", [cid]))[0].pipeline).toBe("devis_accepte");
    await q("insert into contracts(client_id, label, billing_mode, start_date, status) values ($1,'Contrat flow','mensuel','2026-01-01','actif')", [cid]);
    expect(await q("select pipeline, status from clients where id=$1", [cid])).toEqual([{ pipeline: "client_actif", status: "actif" }]);
    const [q2] = await q("insert into quotes(client_id, subject, status) values ($1,'S2','envoye') returning id", [cid]);
    await q("update quotes set status='refuse' where id=$1", [q2.id]);
    expect((await q("select pipeline from clients where id=$1", [cid]))[0].pipeline).toBe("client_actif");           // un client actif ne régresse jamais
    const hist = (await q("select summary from interactions where client_id=$1 order by occurred_at, id", [cid])).map((x) => x.summary).join(" | ");
    expect(hist).toMatch(/Demande de devis/);
    expect(hist).toMatch(/envoyé/);
    expect(hist).toMatch(/accepté/);
    expect(hist).toMatch(/Contrat activé/);
  });

  it("le changement manuel d'étape est daté dans l'historique", async () => {
    const r = await submit({ email: "manual@x.fr", phone: null, name: "Manual" });
    await q("update clients set pipeline='rdv_programme' where id=$1", [r.client_id]);
    expect((await q("select summary from interactions where client_id=$1 and kind='statut'", [r.client_id]))[0].summary).toBe("Étape commerciale : nouveau_prospect → rdv_programme");
  });

  it("protection anti-déluge : au-delà de 30 demandes en une heure, la demande est conservée mais aucune fiche n'est créée", async () => {
    const results = [];
    for (let i = 0; i < 40; i++) results.push(await submit({ email: `flood${i}@x.fr`, phone: null, name: `Flood ${i}` }));
    expect(results.some((r) => r.client_id === null)).toBe(true);
    expect((await q("select count(*)::int n from quote_requests where reference like 'W-%'"))[0].n).toBeGreaterThanOrEqual(40);    // aucune demande perdue
  });
});

describe("reprise des clients existants (migration compatible)", () => {
  it("donne une étape commerciale aux clients existants sans rien supprimer", async () => {
    const db = await boot("0012_hardening.sql");
    await db.query("insert into clients(name, status) values ('Ancien actif','actif'),('Ancien prospect','prospect'),('Ancien inactif','inactif')");
    const total = (await db.query<{ n: number }>("select count(*)::int n from clients")).rows[0].n;
    await db.exec(read("supabase/migrations/0013_prospects_pipeline.sql"));
    await db.exec(read("supabase/migrations/0013_prospects_pipeline.sql"));     // rejouable
    const rows = (await db.query<any>("select name, pipeline from clients where name like 'Ancien%' order by name")).rows;
    expect(rows).toEqual([{ name: "Ancien actif", pipeline: "client_actif" }, { name: "Ancien inactif", pipeline: null }, { name: "Ancien prospect", pipeline: "nouveau_prospect" }]);
    expect((await db.query<{ n: number }>("select count(*)::int n from clients")).rows[0].n).toBe(total);
  });
});
