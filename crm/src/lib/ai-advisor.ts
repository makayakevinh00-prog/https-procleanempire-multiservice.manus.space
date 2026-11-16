import { askWith, aiImages, type Img } from "./ai-inspect";

const SYSTEM = "Tu es le conseiller technique d'une entreprise de nettoyage professionnel en Île-de-France (bureaux, commerces, logements). Tu réponds uniquement d'après ce que tu vois sur les photos et la question posée : tu n'inventes rien et tu dis quand tu n'es pas sûr. Tu es concret, court, et tu penses sécurité (produits à ne pas mélanger, surfaces fragiles). Réponds uniquement par un objet JSON valide, en français.";

const s = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, n) : "");
const arr = (v: unknown) => (Array.isArray(v) ? v : []);
function json(text: string): any | null { const a = text.indexOf("{"), b = text.lastIndexOf("}"); if (a < 0 || b <= a) return null; try { return JSON.parse(text.slice(a, b + 1)); } catch { return null; } }

export type Advice = { diagnostic: string; steps: string[]; products: { name: string; why: string }[]; warnings: string[]; escalate: boolean };
/** Un agent sur place photographie ce qui le gêne : l'IA dit ce que c'est, comment le nettoyer pas à pas, avec quels produits, et quand appeler le responsable. */
export async function adviseProblem(images: Img[], question: string, context: string): Promise<{ advice: Advice | null; error: string | null }> {
  const r = await askWith(SYSTEM, [...aiImages(images), { type: "text", text: `Contexte du chantier : ${s(context, 300)}. Question de l'agent : « ${s(question, 400) || "Que faire ici ?"} ». Dis ce que tu vois, comment le nettoyer étape par étape, quels produits ou outils utiliser (et lesquels éviter), et si c'est trop difficile ou risqué pour que l'agent le fasse seul. Réponds : {"diagnostic":"...","steps":["..."],"products":[{"name":"...","why":"..."}],"warnings":["..."],"escalate":false}` }], 1200);
  if (!r.text) return { advice: null, error: r.error };
  const j = json(r.text);
  if (!j) return { advice: null, error: "réponse de l'IA illisible" };
  return { advice: { diagnostic: s(j.diagnostic, 500), steps: arr(j.steps).map((x) => s(x, 240)).filter(Boolean).slice(0, 10), products: arr(j.products).map((p: any) => ({ name: s(p?.name, 80), why: s(p?.why, 160) })).filter((p) => p.name).slice(0, 8), warnings: arr(j.warnings).map((x) => s(x, 200)).filter(Boolean).slice(0, 5), escalate: j.escalate === true }, error: null };
}

export type QuoteEstimate = { summary: string; area_m2: number | null; zones: { zone: string; tasks: string }[]; hours_per_visit: number | null; agents: number | null; frequency: string; products: { name: string; qty: string }[]; questions: string[]; confidence: "haute" | "moyenne" | "faible" };
/** Le patron photographie un site pour un devis : l'IA estime surfaces, zones, temps, équipe, produits à prévoir et ce qu'il faut demander au client. Le prix est calculé par le CRM (plancher d'heure), pas par l'IA. */
export async function estimateQuote(images: Img[], notes: string): Promise<{ estimate: QuoteEstimate | null; error: string | null }> {
  const r = await askWith(SYSTEM, [...aiImages(images), { type: "text", text: `Ces photos montrent un site à nettoyer pour un devis. Notes du patron : « ${s(notes, 600) || "aucune"} ». Estime la surface nettoyable (m², null si impossible), les zones visibles avec les tâches à prévoir, le temps d'un passage en heures pour UNE personne, le nombre d'agents conseillé, une fréquence raisonnable, les produits et matériels à prévoir (avec quantité indicative), et les questions à poser au client pour chiffrer juste (surfaces non visibles, sols, vitres, accès, horaires). Réponds : {"summary":"...","area_m2":120,"zones":[{"zone":"Open space","tasks":"..."}],"hours_per_visit":3,"agents":1,"frequency":"2 passages par semaine","products":[{"name":"...","qty":"..."}],"questions":["..."],"confidence":"haute|moyenne|faible"}` }], 1500);
  if (!r.text) return { estimate: null, error: r.error };
  const j = json(r.text);
  if (!j) return { estimate: null, error: "réponse de l'IA illisible" };
  const num = (v: unknown, lo: number, hi: number) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
  return { estimate: { summary: s(j.summary, 400), area_m2: num(j.area_m2, 1, 50000), zones: arr(j.zones).map((z: any) => ({ zone: s(z?.zone, 80), tasks: s(z?.tasks, 240) })).filter((z) => z.zone).slice(0, 12), hours_per_visit: num(j.hours_per_visit, 0.5, 40), agents: num(j.agents, 1, 10), frequency: s(j.frequency, 80), products: arr(j.products).map((p: any) => ({ name: s(p?.name, 80), qty: s(p?.qty, 60) })).filter((p) => p.name).slice(0, 12), questions: arr(j.questions).map((x) => s(x, 200)).filter(Boolean).slice(0, 8), confidence: j.confidence === "haute" || j.confidence === "faible" ? j.confidence : "moyenne" }, error: null };
}
