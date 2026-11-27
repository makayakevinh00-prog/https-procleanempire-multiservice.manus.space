import "server-only";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { aiConfigured, analyzeAfter, analyzeBefore, placePrompt, type AfterReport, type BeforeReport, type Guide, type Img, type ObjFlag } from "@/lib/ai-inspect";
import { createAdmin } from "@/lib/supabase/server";
import { isMemory, memoryPrompt, updateMemory } from "@/lib/marketplace/memory";
import { outcomeNotice, startNotice, type JobBrief } from "@/lib/marketplace/job-notices";
import { mailConfigured, sendMail } from "@/lib/mail";
import { parisToday } from "@/lib/domain/dates";

const admin = () => process.env.MAIL_ADMIN ?? "contact@procleanempire.com";
const files = (photos: Img[], prefix: string, max = 6) => photos.slice(0, max).map((p, i) => ({ filename: `${prefix}-${i + 1}${p.room ? `-${p.room.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}` : ""}.${p.content_type === "image/png" ? "png" : p.content_type === "image/webp" ? "webp" : "jpg"}`, bytes: new Uint8Array(Buffer.from(p.b64, "base64")) }));
const crmLink = (jobId: string, n: number) => `${n ? `${n} capture${n > 1 ? "s" : ""} à voir` : "Détail"} dans le CRM : ${`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "proclean-crm.vercel.app"}`}/nettoyeurs?tab=demandes#job-${jobId}`;
/** Envoi à la direction et, séparément, au propriétaire ou à la conciergerie (jamais les deux dans le même message). */
async function tell(b: JobBrief, owner: { subject: string; text: string }, direction: { subject: string; text: string }, attachments: { filename: string; bytes: Uint8Array }[]) {
  if (!mailConfigured()) return;
  // La direction ne reçoit plus les captures en pièces jointes (boîte encombrée) : elles sont dans le CRM, le message donne le lien.
  await sendMail({ to: admin(), ...direction }).catch(() => undefined);
  const to = b.emails.filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e !== admin().toLowerCase()).slice(0, 4);
  if (to.length) await sendMail({ to, ...owner, attachments }).catch(() => undefined);
}

/**
 * Objets non retrouvés ou abîmés, d'après les films. « arrivee » : manque dès l'arrivée (avant le ménage, donc pas imputable au nettoyeur) ;
 * « fin » : présent à l'arrivée, plus vu à la fin, ou abîmé pendant le ménage. Une anomalie est ouverte (une seule par ménage et par moment) et la direction
 * et la conciergerie sont prévenues. L'IA décrit ce que le film montre : elle ne conclut jamais à un vol.
 */
async function flagObjects(jobId: string, moment: "arrivee" | "fin", missing: ObjFlag[], damage: ObjFlag[]): Promise<void> {
  if (!missing.length && !damage.length) return;
  const a = automationClient(), secret = automationSecret();
  const briefRes = await a.rpc("automation_job_brief", { p_secret: secret, p_job: jobId });
  const brief = (briefRes.error ? null : briefRes.data) as JobBrief | null;
  const title = brief ? (brief.listing ?? brief.title) : "Ménage";
  const line = (f: ObjFlag) => `- ${f.object}${f.room ? ` (${f.room})` : ""}${f.why ? ` : ${f.why}` : ""}`;
  const parts = [
    missing.length ? `${moment === "arrivee" ? "Objets de l'inventaire non vus sur le film d'arrivée (avant le ménage)" : "Objets vus à l'arrivée mais non retrouvés sur le film de fin"} :\n${missing.map(line).join("\n")}` : "",
    damage.length ? `Objets abîmés vus sur le film de fin, absents du film d'arrivée :\n${damage.map(line).join("\n")}` : ""
  ].filter(Boolean).join("\n\n");
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const sb = createAdmin(), by = `ia:${moment}:${jobId.slice(0, 8)}`;
    const { data: job } = await sb.from("cleaning_jobs").select("client_id, intervention_id").eq("id", jobId).maybeSingle();
    const { count } = await sb.from("mission_issues").select("id", { count: "exact", head: true }).eq("reported_by", by);
    if (job?.client_id && !count) {
      let site: string | null = null;
      if (job.intervention_id) site = ((await sb.from("interventions").select("site_id").eq("id", job.intervention_id).maybeSingle()).data?.site_id as string | null) ?? null;
      await sb.from("mission_issues").insert({ kind: "anomalie", intervention_id: job.intervention_id, site_id: site, client_id: job.client_id, severity: "haute", description: `Contrôle IA du film — ${parts}`.slice(0, 1500), status: "ouverte", reported_by: by });
    } else if (count) return; // déjà signalé pour ce ménage
  }
  if (!mailConfigured()) return;
  const when = moment === "arrivee" ? "à l'arrivée du nettoyeur, avant le ménage" : "à la fin du ménage";
  const text = `${title} : l'analyse des films relève ceci ${when}.\n\n${parts}\n\nL'IA décrit ce que les films montrent ; elle ne peut pas conclure seule. Les captures tirées des films sont dans le CRM (Nettoyeurs › Demandes). Merci de vérifier sur place.\n\nL'équipe ProClean Empire`;
  const subject = `Objet à vérifier — ${title}`;
  await sendMail({ to: admin(), subject, text }).catch(() => undefined);
  const to = (brief?.emails ?? []).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e !== admin().toLowerCase()).slice(0, 4);
  if (to.length) await sendMail({ to, subject, text }).catch(() => undefined);
}

export type AfterOutcome = { status: "validee" | "a_reprendre" | "a_verifier"; verdict: "ok" | "reprise" | "indisponible"; summary: string; by: "ia" | "regles" | null; reason: string | null };

/**
 * Relevé « avant » : ce qu'il y a à nettoyer, l'état et le rangement du logement, la durée estimée, d'après la vidéo d'arrivée.
 * Le logement est mémorisé pour les prochaines visites. La direction et le propriétaire reçoivent une fois « Ménage commencé » avec les captures.
 * Renvoie la raison si l'IA n'a pas pu analyser.
 */
export async function runBeforeAnalysis(jobId: string): Promise<string | null> {
  if (!aiConfigured()) return "clé d'API absente du serveur (ANTHROPIC_API_KEY)";
  const a = automationClient(), secret = automationSecret(), today = parisToday();
  const [{ data }, briefRes] = await Promise.all([a.rpc("automation_job_photos", { p_secret: secret, p_job: jobId, p_kind: "avant" }), a.rpc("automation_job_brief", { p_secret: secret, p_job: jobId })]);
  const photos = (data ?? []) as Img[], brief = (briefRes.error ? null : briefRes.data) as JobBrief | null;
  const memory = brief && isMemory(brief.memory) ? brief.memory : null;
  const r = await analyzeBefore(photos, memoryPrompt(memory, today), placePrompt(brief?.rooms, brief?.guide));
  if (!r.report) return r.error;
  await a.rpc("automation_set_job_analysis", { p_secret: secret, p_job: jobId, p_kind: "avant", p_report: r.report, p_verdict: null });
  await flagObjects(jobId, "arrivee", r.report.absent ?? [], []).catch(() => undefined);
  // La liste des tâches du nettoyeur devient celle de l'IA, dans l'ordre (sans effet si le ménage a déjà des tâches cochées ou si la base n'est pas à jour).
  if (r.report.tasks?.length) await a.rpc("automation_set_job_tasks", { p_secret: secret, p_job: jobId, p_tasks: r.report.tasks });
  const labelled = photos.map((p, i) => ({ ...p, room: p.room ?? (r.report!.frame_rooms?.length === photos.length ? r.report!.frame_rooms[i] || null : null) }));
  if (!brief) return r.error; // base pas encore à jour : relevé enregistré, sans mémoire ni message
  await a.rpc("automation_set_before_extras", { p_secret: secret, p_job: jobId, p_minutes: r.report.minutes ?? null, p_memory: brief.has_listing ? updateMemory(memory, r.report, today) : null });
  const claimed = await a.rpc("automation_claim_start_notice", { p_secret: secret, p_job: jobId });
  if (claimed.data === true) {
    const att = files(labelled, "arrivee");
    const n = startNotice({ ...brief, before_report: r.report, est_minutes: r.report.minutes ?? null }, att.length);
    const d = startNotice({ ...brief, before_report: r.report, est_minutes: r.report.minutes ?? null }, 0);
    await tell(brief, n, { subject: d.subject, text: `${brief.client ? `Client : ${brief.client}\n\n` : ""}${d.text}\n\n${crmLink(jobId, att.length)}` }, att);
  }
  return r.error;
}

/** Après le contrôle de fin : la direction et le propriétaire sont prévenus (reprise demandée ou ménage terminé), avec les captures de fin. */
export async function notifyOutcome(jobId: string, o: AfterOutcome, cleanerName: string): Promise<void> {
  if (!mailConfigured()) return;
  const a = automationClient(), secret = automationSecret();
  const [briefRes, photos] = await Promise.all([a.rpc("automation_job_brief", { p_secret: secret, p_job: jobId }), a.rpc("automation_job_photos", { p_secret: secret, p_job: jobId, p_kind: "apres" })]);
  const head = o.by === "regles" ? "Validé automatiquement par les règles (pointage, tâches, photos, durée, nettoyeur de confiance) : le nettoyeur est autorisé à partir. Les photos n'ont pas été analysées par l'IA." : o.status === "validee" ? "Validé automatiquement : le contrôle par l'IA ne relève rien, le nettoyeur est autorisé à partir." : o.verdict === "reprise" ? "Reprise demandée automatiquement : des points restent à nettoyer." : o.verdict === "ok" ? "Le contrôle automatique ne relève rien : à vous de valider." : `À vous de vérifier${o.reason ? ` : ${o.reason}` : ""}.`;
  const where = `${o.status === "validee" ? "Photos et détail" : "À vérifier"} dans le CRM : Nettoyeurs › Demandes.`;
  const brief = (briefRes.error ? null : briefRes.data) as JobBrief | null;
  if (!brief) { // base pas encore à jour : message à la direction seule, comme avant
    await sendMail({ to: admin(), subject: o.status === "validee" ? "Ménage validé automatiquement" : o.verdict === "reprise" ? "Ménage à reprendre — contrôle automatique" : "Ménage terminé à vérifier", text: `${cleanerName} a terminé un ménage.\n\n${head}\n${o.summary}\n\n${where}` }).catch(() => undefined);
    return;
  }
  const att = files((photos.data ?? []) as Img[], "fin");
  const owner = outcomeNotice(brief, o, att.length);
  const direction = outcomeNotice(brief, o, 0, `${crmLink(jobId, att.length)}\n` + `${brief.client ? `Client : ${brief.client}. ` : ""}Nettoyeur : ${cleanerName}.\n${head}\n${where}`);
  await tell(brief, owner, direction, att);
}

/** Contrôle « après » : photos du nettoyeur, relevé avant, et référence du logement si elle existe. Applique le verdict (validation automatique, reprise ou attente de la direction). */
export async function runAfterAnalysis(jobId: string): Promise<AfterOutcome> {
  const a = automationClient(), secret = automationSecret();
  let verdict: AfterOutcome["verdict"] = "indisponible", summary = "", report: unknown, rework: number | null = null;
  if (!aiConfigured()) summary = "Analyse automatique impossible : clé d'API absente du serveur (ANTHROPIC_API_KEY).";
  else {
    const [ctx, photos, ref, beforePhotos] = await Promise.all([a.rpc("automation_job_context", { p_secret: secret, p_job: jobId }), a.rpc("automation_job_photos", { p_secret: secret, p_job: jobId, p_kind: "apres" }), a.rpc("automation_job_ref_photos", { p_secret: secret, p_job: jobId }), a.rpc("automation_job_photos", { p_secret: secret, p_job: jobId, p_kind: "avant" })]);
    const c = (ctx.data ?? {}) as { before_report?: BeforeReport | null; guide?: Guide | null };
    // Les images d'arrivée portent la pièce reconnue par l'IA au relevé : elle les retrouve sous le même angle sur la vidéo de fin.
    const before = (beforePhotos.data ?? []) as Img[], rooms = c.before_report?.frame_rooms;
    const beforeLabelled = before.map((p, i) => ({ ...p, room: p.room ?? (rooms && rooms.length === before.length ? rooms[i] || null : null) })).slice(0, 12);
    const r = await analyzeAfter((photos.data ?? []) as Img[], c.before_report ?? null, { guide: c.guide ?? null, images: (ref.data ?? []) as Img[] }, beforeLabelled);
    if (r.report) { verdict = r.report.verdict; summary = r.report.summary; report = r.report; rework = (r.report as AfterReport).rework_minutes ?? null; }
    else summary = `Analyse automatique impossible : ${r.error ?? "raison inconnue"}.`;
  }
  await a.rpc("automation_set_job_analysis", { p_secret: secret, p_job: jobId, p_kind: "apres", p_report: report ?? { summary }, p_verdict: verdict });
  if (report) await flagObjects(jobId, "fin", (report as AfterReport).objects_missing ?? [], (report as AfterReport).damage ?? []).catch(() => undefined);
  await a.rpc("automation_set_rework", { p_secret: secret, p_job: jobId, p_minutes: verdict === "reprise" ? rework : null }); // sans effet tant que la base n'est pas à jour
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
