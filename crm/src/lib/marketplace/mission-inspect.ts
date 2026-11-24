import "server-only";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { aiConfigured, analyzeAfter, analyzeBefore, placePrompt, type AfterReport, type BeforeReport, type Guide, type Img } from "@/lib/ai-inspect";
import { mailConfigured, sendMail } from "@/lib/mail";
import { isMemory, memoryPrompt, updateMemory } from "@/lib/marketplace/memory";
import { parisToday } from "@/lib/domain/dates";

type Zone = { name?: string; tasks?: string[]; attention?: string[] };
type MissionBrief = { title: string | null; client: string | null; site: string | null; zones: Zone[]; specifics: string[]; site_notes: string | null; notes: string | null; before_report: BeforeReport | null; agent: string | null; rotation_item?: string | null; memory?: unknown; has_site?: boolean };

const admin = () => process.env.MAIL_ADMIN ?? "contact@procleanempire.com";
const link = (id: string) => `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "proclean-crm.vercel.app"}/missions/${id}`;

/** Le site tel que la direction l'a décrit dans le CRM (zones, tâches attendues, points d'attention, particularités) → le « plan du lieu » donné à l'IA. */
export function siteGuide(b: Pick<MissionBrief, "zones" | "specifics" | "site_notes" | "notes">): { rooms: string[]; guide: Guide | null } {
  const zones = (Array.isArray(b.zones) ? b.zones : []).filter((z) => typeof z?.name === "string" && z.name.trim());
  const attention = [...zones.flatMap((z) => (z.attention ?? []).map((a) => `${z.name} : ${a}`)), ...(b.specifics ?? []), ...(b.site_notes ? [b.site_notes] : []), ...(b.notes ? [b.notes] : [])].map((x) => String(x).trim()).filter(Boolean).slice(0, 8);
  const rooms = zones.map((z) => String(z.name).trim());
  if (!rooms.length && !attention.length) return { rooms: [], guide: null };
  return { rooms, guide: { summary: "", rooms: zones.map((z) => ({ room: String(z.name).trim(), steps: (z.tasks ?? []).map(String) })), attention } };
}

async function load(id: string, kind: "avant" | "apres") {
  const a = automationClient(), secret = automationSecret();
  const [photos, brief] = await Promise.all([a.rpc("automation_mission_photos", { p_secret: secret, p_id: id, p_kind: kind }), a.rpc("automation_mission_brief", { p_secret: secret, p_id: id })]);
  return { a, secret, photos: (photos.data ?? []) as Img[], brief: (brief.error ? null : brief.data) as MissionBrief | null, dbError: photos.error?.message ?? brief.error?.message ?? null };
}

/** Film d'arrivée d'un agent : ce que l'IA voit, ce qu'il y a à faire, les zones à refilmer, les conseils. Renvoie la raison si l'analyse a échoué. */
export async function runMissionBefore(id: string): Promise<string | null> {
  if (!aiConfigured()) return "clé d'API absente du serveur (ANTHROPIC_API_KEY)";
  const { a, secret, photos, brief, dbError } = await load(id, "avant");
  if (dbError) return "base pas encore à jour pour l'analyse des missions";
  if (!photos.length) return "aucune image d'arrivée";
  const g = brief ? siteGuide(brief) : { rooms: [], guide: null };
  const today = parisToday(), memory = brief && isMemory(brief.memory) ? brief.memory : null;
  const item = brief?.rotation_item?.trim();
  // Site à rotation (une étagère différente à chaque passage) : l'élément du jour passe en première tâche.
  const turn = item ? ` ÉLÉMENT DU JOUR sur ce site : « ${item.replace(/[«»"]/g, "")} ». C'est le travail prévu aujourd'hui en plus de l'entretien courant : mets-le en première tâche, et s'il n'apparaît pas sur les images, demande de le filmer dans "refilm".` : "";
  const r = await analyzeBefore(photos, memoryPrompt(memory, today), placePrompt(g.rooms, g.guide) + turn);
  if (!r.report) return r.error;
  const tasks = r.report.tasks ?? [];
  if (item && !tasks.some((t) => t.toLowerCase().includes(item.toLowerCase()))) tasks.unshift(`${item} : à faire aujourd'hui`);
  const saved = await a.rpc("automation_set_mission_analysis", { p_secret: secret, p_id: id, p_kind: "avant", p_report: { ...r.report, tasks }, p_status: null, p_tasks: tasks.length ? tasks : null, p_memory: brief?.has_site ? updateMemory(memory, r.report, today) : null });
  return saved.error ? "relevé non enregistré" : null;
}

/** Film de fin d'un agent : l'IA compare à l'arrivée et au plan du site. La direction reçoit le résultat (sans pièce jointe : tout est dans le CRM). */
export async function runMissionAfter(id: string): Promise<{ status: "ok" | "reprise" | "indisponible"; summary: string }> {
  let status: "ok" | "reprise" | "indisponible" = "indisponible", summary = "", report: AfterReport | { summary: string } | null = null;
  const { a, secret, photos, brief, dbError } = await load(id, "apres");
  if (dbError) return { status, summary: "Analyse impossible : base pas encore à jour." };
  if (!aiConfigured()) summary = "Analyse automatique impossible : clé d'API absente du serveur (ANTHROPIC_API_KEY).";
  else {
    const before = (await a.rpc("automation_mission_photos", { p_secret: secret, p_id: id, p_kind: "avant" })).data as Img[] | null;
    const rooms = brief?.before_report?.frame_rooms, bl = (before ?? []).map((p, i) => ({ ...p, room: rooms && rooms.length === (before ?? []).length ? rooms[i] || null : null })).slice(0, 12);
    const g = brief ? siteGuide(brief) : { rooms: [], guide: null };
    const r = await analyzeAfter(photos, brief?.before_report ?? null, { guide: g.guide, images: [] }, bl);
    if (r.report) { status = r.report.verdict; summary = r.report.summary; report = r.report; }
    else summary = `Analyse automatique impossible : ${r.error ?? "raison inconnue"}.`;
  }
  await a.rpc("automation_set_mission_analysis", { p_secret: secret, p_id: id, p_kind: "apres", p_report: report ?? { summary }, p_status: status, p_tasks: null, p_memory: null });
  if (mailConfigured() && brief) {
    const where = [brief.client, brief.site].filter(Boolean).join(" — ");
    const rem = report && "remaining" in report ? report.remaining.map((x) => `- ${x.zone} : ${x.why}`).join("\n") : "";
    await sendMail({
      to: admin(),
      subject: status === "ok" ? `Mission contrôlée : ${where}` : status === "reprise" ? `Points à reprendre : ${where}` : `Mission à vérifier : ${where}`,
      text: `${brief.agent ?? "L'agent"} a filmé la fin de la mission « ${brief.title ?? where} ».\n\n${status === "ok" ? "Avis de l'IA : rien à reprendre." : status === "reprise" ? `Avis de l'IA : des points sont à reprendre.\n${rem}` : "L'IA n'a pas pu donner d'avis : à vérifier par vous."}\n${summary ? `\n${summary}\n` : ""}\nCaptures et compte rendu dans le CRM : ${link(id)}\n\nL'équipe ProClean Empire`
    }).catch(() => undefined);
  }
  return { status, summary };
}
