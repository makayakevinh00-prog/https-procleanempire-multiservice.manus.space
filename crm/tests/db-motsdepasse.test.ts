import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const fails = (sql: string, params: any[], re: RegExp) => expect(db.query(sql, params)).rejects.toThrow(re);
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const SECRET = "secret-de-test-123", T1 = "a".repeat(64), T2 = "b".repeat(64), AG = "c".repeat(64), H = "scrypt$" + "0".repeat(32) + "$" + "1".repeat(128);
const reg = async (p: any, token: string | null) => (await q("select automation_cleaner_register($1,$2,$3) r", [SECRET, JSON.stringify(p), token ? hash(token) : null]))[0].r;
let agent: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x <= "0038_conciergerie.sql").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/seed.sql"));
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql") && x >= "0044").sort()) await db.exec(read(`supabase/migrations/${f}`));
  await db.exec(read("supabase/migrations/0060_mots_de_passe_paie.sql")); // rejouable
  await q("update app_settings set automation_secret = $1", [SECRET]);
  agent = (await q("insert into staff(full_name, email, active, agent_token_hash) values ('Esma Test','esma@x.test',true,$1) returning id", [hash(AG)]))[0].id;
});

describe("0060 — inscription sans SIRET", () => {
  it("sans SIRET : compte en attente, avec son lien, espace « attente » à la connexion, aucun accès aux ménages", async () => {
    expect(await reg({ full_name: "Léo Étudiant", email: "leo@x.test", statut_pro: "etudiant", postal_code: "95300", radius_km: 10, verified: true }, T1)).toBe("sans_siret");
    expect((await q("select cleaner_pending($1) r", [T1]))[0].r.state).toBe("sans_siret");
    expect((await q("select login_roles('leo@x.test') r"))[0].r.map((x: any) => x.kind)).toEqual(["attente"]);
    await fails("select cleaner_by_token($1)", [T1], /ACCES_REFUSE/);
  });
  it("SIRET vérifié : le compte s'active et le même lien ouvre l'application", async () => {
    await fails("select automation_cleaner_set_siret($1,$2,$3,true)", [SECRET, T1, "123"], /14 chiffres/);
    expect((await q("select automation_cleaner_set_siret($1,$2,$3,true) r", [SECRET, T1, "12345678900011"]))[0].r).toBe("actif");
    expect((await q("select (cleaner_by_token($1)).full_name n", [T1]))[0].n).toBe("Léo Étudiant");
    expect((await q("select login_roles('leo@x.test') r"))[0].r.map((x: any) => x.kind)).toEqual(["nettoyeur"]);
  });
  it("annuaire indisponible : SIRET enregistré mais le patron valide ; un SIRET déjà pris est refusé", async () => {
    await reg({ full_name: "Mia Attente", email: "mia@x.test", postal_code: "95000" }, T2);
    await fails("select automation_cleaner_set_siret($1,$2,$3,true)", [SECRET, T2, "12345678900011"], /déjà utilisé/);
    expect((await q("select automation_cleaner_set_siret($1,$2,$3,false) r", [SECRET, T2, "98765432100012"]))[0].r).toBe("a_valider");
    expect((await q("select cleaner_pending($1) r", [T2]))[0].r.state).toBe("a_valider");
    await fails("select cleaner_by_token($1)", [T2], /ACCES_REFUSE/);
  });
  it("avec SIRET vérifié, l'inscription reste immédiate", async () => {
    expect(await reg({ full_name: "Zoé Pro", email: "zoe@x.test", siret: "11122233300044", postal_code: "95000", verified: true }, "d".repeat(64))).toBe("actif");
  });
});

describe("0060 — mot de passe", () => {
  it("bon mot de passe : les espaces ; 5 erreurs : blocage", async () => {
    expect((await q("select automation_password_get($1,'esma@x.test') r", [SECRET]))[0].r).toBeNull();
    await q("select automation_password_set($1,'Esma@x.test',$2)", [SECRET, H]);
    expect((await q("select automation_password_get($1,'esma@x.test') r", [SECRET]))[0].r).toBe(H);
    expect((await q("select automation_password_result($1,'esma@x.test',true) r", [SECRET]))[0].r.map((x: any) => x.kind)).toEqual(["agent"]);
    for (let i = 0; i < 5; i++) expect((await q("select automation_password_result($1,'esma@x.test',false) r", [SECRET]))[0].r).toBeNull();
    expect((await q("select automation_password_get($1,'esma@x.test') r", [SECRET]))[0].r).toBeNull();
    await q("select automation_password_set($1,'esma@x.test',$2)", [SECRET, H]);   // un nouveau code e-mail débloque
    expect((await q("select automation_password_get($1,'esma@x.test') r", [SECRET]))[0].r).toBe(H);
  });
  it("sans le secret du serveur : refusé", async () => {
    await fails("select automation_password_get('faux','esma@x.test')", [], /./);
  });
});

describe("0060 — fiches de paie", () => {
  it("l'agent voit ses fiches et seulement les siennes", async () => {
    const other = (await q("insert into staff(full_name, active) values ('Autre',true) returning id"))[0].id;
    const mine = (await q("insert into payslips(staff_id, period, file_name, data_b64, net_amount) values ($1,'2026-10-01','oct.pdf','QUJD',1450) returning id", [agent]))[0].id;
    const his = (await q("insert into payslips(staff_id, period, file_name, data_b64) values ($1,'2026-10-01','x.pdf','WFla') returning id", [other]))[0].id;
    const list = (await q("select agent_payslips($1) r", [AG]))[0].r;
    expect(list.length).toBe(1); expect(list[0].file_name).toBe("oct.pdf"); expect(list[0].data).toBeUndefined();
    expect((await q("select agent_payslip_file($1,$2) r", [AG, mine]))[0].r.data).toBe("QUJD");
    await fails("select agent_payslip_file($1,$2)", [AG, his], /introuvable/);
  });
});
