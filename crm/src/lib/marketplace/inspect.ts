import "server-only";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { aiConfigured, analyzeAfter, analyzeBefore, type BeforeReport, type Guide, type Img } from "@/lib/ai-inspect";

export type AfterOutcome = { status: "validee" | "a_reprendre" | "a_verifier"; verdict: "ok" | "reprise" | "indisponible"; summary: string; by: "ia" | "regles" | null; reason: string | null };

/** Relevé « avant » : ce qu'il y a à nettoyer, d'après les photos du nettoyeur. Renvoie la raison si l'IA n'a pas pu analyser. */
export async function runBeforeAnalysis(jobId: string): Promise<string | null> {
  if (!aiConfigured()) return "clé d'API absente du serveur (ANTHROPIC_API_KEY)";
  const a = automationClient(), secret = automationSecret();
  const { data } = await a.rpc("automation_job_photos", { p_secret: secret, p_job: jobId, p_kind: "avant" });
  const r = await analyzeBefore((data ?? []) as Img[]);
  if (r.report) await a.rpc("automation_set_job_analysis", { p_secret: secret, p_job: jobId, p_kind: "avant", p_report: r.report, p_verdict: null });
  return r.error;
}

/** Contrôle « après » : photos du nettoyeur, relevé avant, et référence du logement si elle existe. Applique le verdict (validation automatique, reprise ou attente de la direction). */
export async function runAfterAnalysis(jobId: string): Promise<AfterOutcome> {
  const a = automationClient(), secret = automationSecret();
  let verdict: AfterOutcome["verdict"] = "indisponible", summary = "", report: unknown;
  if (!aiConfigured()) summary = "Analyse automatique impossible : clé d'API absente du serveur (ANTHROPIC_API_KEY).";
  else {
    const [ctx, photos, ref] = await Promise.all([a.rpc("automation_job_context", { p_secret: secret, p_job: jobId }), a.rpc("automation_job_photos", { p_secret: secret, p_job: jobId, p_kind: "apres" }), a.rpc("automation_job_ref_photos", { p_secret: secret, p_job: jobId })]);
    const c = (ctx.data ?? {}) as { before_report?: BeforeReport | null; guide?: Guide | null };
    const r = await analyzeAfter((photos.data ?? []) as Img[], c.before_report ?? null, { guide: c.guide ?? null, images: (ref.data ?? []) as Img[] });
    if (r.report) { verdict = r.report.verdict; summary = r.report.summary; report = r.report; }
    else summary = `Analyse automatique impossible : ${r.error ?? "raison inconnue"}.`;
  }
  await a.rpc("automation_set_job_analysis", { p_secret: secret, p_job: jobId, p_kind: "apres", p_report: report ?? { summary }, p_verdict: verdict });
  // Sans avis de l'IA : validation par règles (pointage, tâches, photos, durée, confiance, contrôle au hasard).
  let reason: string | null = null, byRules = false;
  if (verdict === "indisponible") {
    const r = await a.rpc("automation_rules_validate", { p_secret: secret, p_job: jobId });
    const d = (r.data ?? {}) as { validated?: boolean; reason?: string | null };
    byRules = d.validated === true; reason = d.reason ?? null;
  }
  const after = await a.rpc("automation_job_context", { p_secret: secret, p_job: jobId });
  const st = (after.data as { status?: string } | null)?.status;
  const status = st === "validee" || st === "a_reprendre" ? st : "a_verifier";
  return { status, verdict, summary, by: status === "validee" ? (byRules ? "regles" : "ia") : null, reason };
}
