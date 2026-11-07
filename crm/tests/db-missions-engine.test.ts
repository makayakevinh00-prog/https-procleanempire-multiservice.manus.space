import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
let db: PGlite;
const q = async <T = any>(sql: string, p: any[] = []) => (await db.query<T>(sql, p)).rows;
const fails = (sql: string, p: any[], re: RegExp) => expect(db.query(sql, p)).rejects.toThrow(re);
const asOwner = async () => { await q("select set_config('test.email','contact@procleanempire.com',false), set_config('test.uid','00000000-0000-0000-0000-00000000aaaa',false)"); await db.exec("set role authenticated"); };
const asOther = async () => { await q("select set_config('test.email','autre@x.fr',false), set_config('test.uid','00000000-0000-0000-0000-00000000bbbb',false)"); await db.exec("set role authenticated"); };
const asAdmin = async () => { await db.exec("reset role"); };
const plan = (n = 2) => JSON.stringify(Array.from({ length: n }, (_, i) => ({ agent: i % 2 ? "operations" : "finance", kind: "outil", label: `étape ${i + 1}` })));
const mission = async (dedupe: string | null = null, steps = 2) => {
  const id = (await q("select jarvis_enqueue_mission('Analyse du mois','Analyse la situation du mois','instruction',null,$1,5,'finance') id", [dedupe]))[0].id;
  await q("select jarvis_plan_mission($1,'finance',$2::jsonb)", [id, plan(steps)]);
  return id as string;
};
const stepIds = async (id: string) => (await q("select id from jarvis_mission_steps where mission_id=$1 order by seq", [id])).map((r) => r.id as string);
const events = async (id: string) => (await q("select type from jarvis_mission_events where mission_id=$1 order by id", [id])).map((r) => r.type as string);
const claim = async (w = "w1", secs = 120) => (await q("select * from jarvis_claim_next($1,$2)", [w, secs]))[0];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email', coalesce(current_setting('test.email', true), '')) $$;
    create role authenticated; create role anon;
    grant usage on schema public to authenticated, anon; grant usage on schema auth to authenticated, anon;
    alter default privileges in schema public grant all on tables to authenticated, anon;
    alter default privileges in schema public grant execute on functions to authenticated, anon;`);
  for (const f of readdirSync(path.join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql")).sort()) await db.exec(readFileSync(path.join(root, "supabase/migrations", f), "utf8"));
});
beforeEach(async () => { await asAdmin(); await db.exec("set jarvis.allow_purge = 'on'; delete from jarvis_mission_events; delete from jarvis_missions; reset jarvis.allow_purge"); await asOwner(); });

describe("moteur de missions : cycle de vie complet", () => {
  it("réception, compréhension, prise, étapes, résultat : chaque changement est journalisé", async () => {
    const id = await mission();
    expect((await q("select status from jarvis_missions where id=$1", [id]))[0].status).toBe("en_file");
    const m = await claim();
    expect(m).toMatchObject({ id, status: "en_cours", lease_owner: "w1" });
    const [s1, s2] = await stepIds(id);
    await q("select jarvis_step_start($1,'w1')", [s1]);
    expect(await q("select travaille from jarvis_agent_live where agent_key='finance'")).toEqual([{ travaille: true }]);
    expect((await q("select jarvis_step_finish($1,'{\"ok\":1}'::jsonb) s", [s1]))[0].s).toBe("en_cours");
    await q("select jarvis_step_start($1,'w1')", [s2]);
    expect((await q("select jarvis_step_finish($1,'{\"synthese\":\"ok\"}'::jsonb,'modele-test',100,50,12345) s", [s2]))[0].s).toBe("terminee");
    expect((await q("select status, result from jarvis_missions where id=$1", [id]))[0]).toMatchObject({ status: "terminee", result: { synthese: "ok" } });
    expect(await events(id)).toEqual(["mission.recue", "mission.comprise", "mission.demarree", "etape.debut", "etape.fin", "etape.debut", "etape.fin", "mission.terminee"]);
    expect(Number((await q("select cost_micros from jarvis_mission_steps where id=$1", [s2]))[0].cost_micros)).toBe(12345);
  });
  it("sans mission en cours, aucun agent n'est « au travail » : la vue ne ment pas", async () => {
    expect((await q("select count(*)::int n from jarvis_agent_live where travaille")) [0].n).toBe(0);
    const id = await mission();
    expect((await q("select count(*)::int n from jarvis_agent_live where travaille"))[0].n).toBe(0); // en file ≠ au travail
    await claim(); expect((await q("select count(*)::int n from jarvis_agent_live where travaille"))[0].n).toBe(0); // prise ≠ étape en cours
    const [s1] = await stepIds(id); await q("select jarvis_step_start($1,'w1')", [s1]);
    expect((await q("select agent_key from jarvis_agent_live where travaille"))).toEqual([{ agent_key: "finance" }]);
  });
  it("un même dedupe_key ne crée pas deux missions vivantes", async () => {
    const a = await mission("alerte:late:1"), b = (await q("select jarvis_enqueue_mission('x','y','alerte',null,'alerte:late:1') id"))[0].id;
    expect(b).toBe(a);
    await q("select jarvis_cancel_mission($1,'test')", [a]);
    const c = (await q("select jarvis_enqueue_mission('x','y','alerte',null,'alerte:late:1') id"))[0].id;
    expect(c).not.toBe(a);
  });
});

describe("erreurs, reprises, interruptions", () => {
  it("échec d'étape : nouvel essai avec délai croissant, puis échec visible après le maximum", async () => {
    const id = await mission(null, 1); await claim(); const [s] = await stepIds(id);
    await q("select jarvis_step_start($1,'w1')", [s]);
    expect((await q("select jarvis_step_fail($1,'réseau',30) r", [s]))[0].r).toBe("nouvel_essai");
    expect((await q("select status, attempts, next_run_at > now() + interval '20 seconds' tard from jarvis_missions where id=$1", [id]))[0]).toMatchObject({ status: "en_file", attempts: 1, tard: true });
    expect(await claim()).toBeUndefined(); // pas avant le délai
    await q("update jarvis_missions set next_run_at = now() where id=$1", [id]); await claim(); await q("select jarvis_step_start($1,'w1')", [s]);
    await q("select jarvis_step_fail($1,'réseau',30)", [s]);
    await q("update jarvis_missions set next_run_at = now() where id=$1", [id]); await claim(); await q("select jarvis_step_start($1,'w1')", [s]);
    expect((await q("select jarvis_step_fail($1,'réseau',30) r", [s]))[0].r).toBe("echouee");
    expect((await q("select status, error from jarvis_missions where id=$1", [id]))[0]).toEqual({ status: "echouee", error: "réseau" });
    expect((await q("select en_difficulte from jarvis_agent_live where agent_key='finance'"))[0].en_difficulte).toBe(true);
    expect((await events(id)).filter((t) => t === "etape.erreur")).toHaveLength(2);
    expect((await events(id)).at(-1)).toBe("mission.echec");
  });
  it("exécuteur disparu : bail expiré, un autre exécuteur reprend la mission et remet l'étape en attente", async () => {
    const id = await mission(); await claim("w1", 1); const [s1] = await stepIds(id);
    await q("select jarvis_step_start($1,'w1')", [s1]);
    expect(await claim("w2")).toBeUndefined(); // bail encore valide
    await q("update jarvis_missions set lease_until = now() - interval '1 second' where id=$1", [id]);
    expect((await q("select travaille from jarvis_agent_live where agent_key='finance'"))[0].travaille).toBe(false); // bail expiré : plus « au travail »
    const m = await claim("w2");
    expect(m).toMatchObject({ id, lease_owner: "w2" });
    expect((await q("select status from jarvis_mission_steps where id=$1", [s1]))[0].status).toBe("en_attente");
    expect(await events(id)).toContain("mission.reprise");
    await fails("select jarvis_step_start($1,'w1')", [s1], /ETAPE_ETAT/); // l'ancien exécuteur ne peut plus agir
  });
  it("deux exécuteurs simultanés ne prennent pas la même mission", async () => {
    await mission(); const a = await claim("w1"), b = await claim("w2");
    expect(a).toBeTruthy(); expect(b).toBeUndefined();
  });
  it("question de précision : la mission attend, sans bail, et le journal le dit", async () => {
    const id = (await q("select jarvis_enqueue_mission('Flou','fais quelque chose') id"))[0].id;
    await q("select jarvis_ask_clarification($1,'core','Quelle période ?')", [id]);
    expect((await q("select status, lease_owner from jarvis_missions where id=$1", [id]))[0]).toEqual({ status: "attente_precision", lease_owner: null });
    expect(await claim()).toBeUndefined();
    await q("select jarvis_plan_mission($1,'finance',$2::jsonb)", [id, plan(1)]); // la précision reçue relance
    expect((await q("select status from jarvis_missions where id=$1", [id]))[0].status).toBe("en_file");
  });
  it("une étape ne peut pas se terminer ni échouer si elle n'est pas en cours", async () => {
    const id = await mission(); const [s1] = await stepIds(id);
    await fails("select jarvis_step_finish($1,'{}'::jsonb)", [s1], /ETAPE_ETAT/);
    await fails("select jarvis_step_fail($1,'x')", [s1], /ETAPE_ETAT/);
  });
});

describe("collaboration et validation humaine", () => {
  it("un message entre deux agents n'existe que sur une mission en cours ; en attente = collaboration visible, traité = terminée", async () => {
    const id = await mission();
    await fails("select jarvis_send_message($1,'finance','operations','demande','{}'::jsonb)", [id], /MISSION_ETAT/);
    await claim();
    const msg = (await q("select jarvis_send_message($1,'finance','operations','demande','{\"q\":\"contrat\"}'::jsonb) id", [id]))[0].id;
    expect((await q("select collaborations from jarvis_agent_live where agent_key in ('finance','operations') order by agent_key")).map((r) => Number(r.collaborations))).toEqual([1, 1]);
    await q("select jarvis_handle_message($1)", [msg]);
    expect(Number((await q("select collaborations from jarvis_agent_live where agent_key='finance'"))[0].collaborations)).toBe(0);
    expect(await events(id)).toEqual(expect.arrayContaining(["collab.message", "collab.traite"]));
    await fails("select jarvis_send_message($1,'finance','finance','demande','{}'::jsonb)", [id], /check|violates/i);
  });
  it("validation L2 : la mission attend, l'approbation la relance (sans effet extérieur) ; le refus l'annule", async () => {
    const id = await mission(); await claim(); const [s1] = await stepIds(id); await q("select jarvis_step_start($1,'w1')", [s1]);
    const v = (await q("select jarvis_request_validation($1,$2,'finance','L2','{\"action\":\"contact_client\"}'::jsonb) id", [id, s1]))[0].id;
    expect((await q("select status, lease_owner from jarvis_missions where id=$1", [id]))[0]).toEqual({ status: "attente_validation", lease_owner: null });
    expect(Number((await q("select validations_en_attente n from jarvis_agent_live where agent_key='finance'"))[0].n)).toBe(1);
    expect(await claim()).toBeUndefined();
    expect((await q("select jarvis_decide_validation($1,true,'ok') r", [v]))[0].r).toBe("approuvee");
    expect((await q("select status from jarvis_missions where id=$1", [id]))[0].status).toBe("en_file");
    await fails("select jarvis_decide_validation($1,true)", [v], /VALIDATION_ETAT/);
    await q("select jarvis_cancel_mission($1)", [id]);
    const id2 = await mission(); await claim(); const [t1] = await stepIds(id2); await q("select jarvis_step_start($1,'w1')", [t1]);
    const v2 = (await q("select jarvis_request_validation($1,$2,'finance','L2','{}'::jsonb) id", [id2, t1]))[0].id;
    await q("select jarvis_decide_validation($1,false,'non')", [v2]);
    expect((await q("select status from jarvis_missions where id=$1", [id2]))[0].status).toBe("annulee");
    expect((await q("select status from jarvis_mission_steps where mission_id=$1 order by seq", [id2])).map((r) => r.status)).toEqual(["ignoree", "ignoree"]);
  });
  it("une proposition de niveau L3 ne peut jamais être approuvée par ce circuit, seulement refusée", async () => {
    const id = await mission(); await claim(); const [s1] = await stepIds(id); await q("select jarvis_step_start($1,'w1')", [s1]);
    const v = (await q("select jarvis_request_validation($1,$2,'finance','L3','{\"action\":\"issue_credit_note\"}'::jsonb) id", [id, s1]))[0].id;
    await fails("select jarvis_decide_validation($1,true)", [v], /NIVEAU_L3/);
    expect((await q("select jarvis_decide_validation($1,false) r", [v]))[0].r).toBe("refusee");
  });
});

describe("sécurité, journal et budget", () => {
  it("tout est réservé au dirigeant : un autre compte ne lit ni n'écrit rien", async () => {
    const id = await mission();
    await asOther();
    expect(await q("select * from jarvis_missions")).toEqual([]);
    expect(await q("select * from jarvis_mission_events")).toEqual([]);
    await fails("select jarvis_enqueue_mission('x','y')", [], /ACCES_REFUSE/);
    await fails("select * from jarvis_claim_next('w',10)", [], /ACCES_REFUSE/);
    await fails("select jarvis_cancel_mission($1)", [id], /ACCES_REFUSE/);
    await fails("select jarvis_decide_validation('00000000-0000-0000-0000-000000000000',true)", [], /ACCES_REFUSE/);
  });
  it("le journal est en ajout seul : ni modification ni suppression", async () => {
    const id = await mission();
    await fails("update jarvis_mission_events set type='x' where mission_id=$1", [id], /JOURNAL_EN_AJOUT_SEUL/);
    await fails("delete from jarvis_mission_events where mission_id=$1", [id], /JOURNAL_EN_AJOUT_SEUL/);
  });
  it("budget : plafond par défaut 0 = aucune dépense d'IA autorisée ; relevé par le dirigeant, le plafond du jour s'applique", async () => {
    expect((await q("select jarvis_budget_ok('finance', 1000) ok"))[0].ok).toBe(false);
    await q("update jarvis_budgets set daily_micros = 100000 where scope='global'");
    expect((await q("select jarvis_budget_ok('finance', 90000) ok"))[0].ok).toBe(true);
    await q("insert into jarvis_llm_calls(agent_key, provider, model, cost_micros) values ('finance','test','m',80000)");
    expect((await q("select jarvis_budget_ok('finance', 30000) ok"))[0].ok).toBe(false);
    expect((await q("select jarvis_budget_ok('finance', 15000) ok"))[0].ok).toBe(true);
    await q("update jarvis_budgets set daily_micros = 0 where scope='global'");
  });
  it("l'annulation arrête tout : étapes ignorées, plus de prise possible", async () => {
    const id = await mission(); await q("select jarvis_cancel_mission($1,'plus utile')", [id]);
    expect(await claim()).toBeUndefined();
    expect((await q("select status from jarvis_mission_steps where mission_id=$1", [id])).every((r) => r.status === "ignoree")).toBe(true);
  });
  it("retour arrière : 0022_down supprime le moteur sans toucher aux tables du CRM", async () => {
    await asAdmin();
    const before = (await q("select count(*)::int n from clients"))[0].n;
    await db.exec(readFileSync(path.join(root, "supabase/migrations/0022_down.sql"), "utf8"));
    expect((await q("select to_regclass('jarvis_missions') t"))[0].t).toBeNull();
    expect((await q("select count(*)::int n from clients"))[0].n).toBe(before);
    expect((await q("select to_regclass('jarvis_agents') t"))[0].t).not.toBeNull(); // le socle 0021 reste
  });
});
