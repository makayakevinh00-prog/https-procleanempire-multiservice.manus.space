/**
 * Contrôle d'un ménage par l'IA à partir des photos du nettoyeur : « avant » = ce qu'il y a à nettoyer ; « après » = ce qui est fait, ce qui reste, verdict.
 * Actif seulement si ANTHROPIC_API_KEY est configurée ; sinon le ménage part à la direction avec la mention « analyse automatique indisponible ».
 * L'IA demande les reprises. Elle ne valide seule que si le réglage « validation automatique » est activé et qu'elle n'est pas peu sûre ; sinon la direction valide.
 */
export type Img = { content_type: string; b64: string; room?: string | null };
export type BeforeReport = { items: { zone: string; todo: string }[]; level: number | null; summary: string; state?: string; tidy?: string; minutes?: number | null; zones?: string[] };
export type AfterReport = { cleaned: string[]; remaining: { zone: string; why: string }[]; verdict: "ok" | "reprise"; summary: string; confidence: "haute" | "moyenne" | "faible"; missing?: string[]; rework_minutes?: number | null };

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY?.trim());

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, max) : "");
function json(text: string): any | null {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(text.slice(a, b + 1)); } catch { return null; }
}

export function parseBefore(text: string): BeforeReport | null {
  const j = json(text);
  if (!j || !Array.isArray(j.items)) return null;
  const items = j.items.map((x: any) => ({ zone: str(x?.zone, 80), todo: str(x?.todo, 160) })).filter((x: any) => x.zone || x.todo).slice(0, 14);
  const lv = Number(j.level);
  const mn = Number(j.minutes);
  return { items, level: Number.isFinite(lv) && lv >= 1 && lv <= 5 ? Math.round(lv) : null, summary: str(j.summary, 400), state: str(j.state, 300), tidy: str(j.tidy, 300),
    minutes: Number.isFinite(mn) && mn >= 5 && mn <= 720 ? Math.round(mn) : null, zones: (Array.isArray(j.zones) ? j.zones : []).map((x: any) => str(x, 60)).filter(Boolean).slice(0, 16) };
}

export function parseAfter(text: string): AfterReport | null {
  const j = json(text);
  if (!j || (j.verdict !== "ok" && j.verdict !== "reprise")) return null;
  const remaining = (Array.isArray(j.remaining) ? j.remaining : []).map((x: any) => ({ zone: str(x?.zone, 80), why: str(x?.why, 200) })).filter((x: any) => x.zone || x.why).slice(0, 12);
  // Zones filmées avant mais absentes de la vidéo d'après : le nettoyeur doit les refilmer (3 au plus, pour ne pas le bloquer sur un détail).
  const missing = (Array.isArray(j.missing) ? j.missing : []).map((x: any) => str(x, 60)).filter(Boolean).slice(0, 3);
  for (const z of missing) if (remaining.length < 12) remaining.push({ zone: z, why: "zone filmée à l'arrivée mais absente de la vidéo de fin : refilmez-la sous le même angle" });
  const rw = Number(j.rework_minutes);
  // Cohérence : une « reprise » sans aucun point restant n'a pas de sens ; des points restants sans verdict « reprise » non plus.
  const verdict: "ok" | "reprise" = remaining.length ? "reprise" : "ok";
  return {
    cleaned: (Array.isArray(j.cleaned) ? j.cleaned : []).map((x: any) => str(x, 120)).filter(Boolean).slice(0, 20), remaining, verdict,
    summary: str(j.summary, 500) || (verdict === "ok" ? "Le ménage paraît complet." : "Des points restent à nettoyer."),
    confidence: j.confidence === "haute" || j.confidence === "faible" ? j.confidence : "moyenne",
    missing, rework_minutes: remaining.length && Number.isFinite(rw) && rw >= 1 && rw <= 240 ? Math.round(rw) : null
  };
}

export type Guide = { summary: string; rooms: { room: string; steps: string[] }[]; attention: string[] };
export type AiResult<T> = { report: T | null; error: string | null };

export function parseGuide(text: string): Guide | null {
  const j = json(text);
  if (!j || !Array.isArray(j.rooms)) return null;
  const rooms = j.rooms.map((r: any) => ({ room: str(r?.room, 60), steps: (Array.isArray(r?.steps) ? r.steps : []).map((x: any) => str(x, 160)).filter(Boolean).slice(0, 10) })).filter((r: any) => r.room && r.steps.length).slice(0, 12);
  if (!rooms.length) return null;
  return { summary: str(j.summary, 300), rooms, attention: (Array.isArray(j.attention) ? j.attention : []).map((x: any) => str(x, 160)).filter(Boolean).slice(0, 8) };
}

/** Raison lisible d'un échec de l'IA (affichée au patron, jamais au client). */
export function aiErrorLabel(status: number, body: string): string {
  const detail = str((json(body)?.error?.message as string) ?? "", 140);
  if (/credit balance|billing/i.test(body)) return "le compte Anthropic n'a plus de crédit : ajoutez-en sur console.anthropic.com (Plans & Billing), puis relancez l'analyse";
  if (status === 401 || status === 403) return `clé d'API refusée par Anthropic (${status})${detail ? ` : ${detail}` : ""}`;
  if (status === 404) return `modèle introuvable${detail ? ` : ${detail}` : ""}`;
  if (status === 429) return "quota ou crédit Anthropic dépassé (429)";
  if (status === 413) return "photos trop lourdes pour l'analyse";
  if (status >= 500) return `service Anthropic indisponible (${status})`;
  return `réponse ${status}${detail ? ` : ${detail}` : ""}`;
}

type Part = { type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: string; data: string } };
const imgs = (images: Img[]): Part[] => images.flatMap((i): Part[] => [...(i.room ? [{ type: "text" as const, text: `Pièce : ${str(i.room, 60)}` }] : []), { type: "image", source: { type: "base64", media_type: i.content_type, data: i.b64 } }]);

export type AiPart = Part;
export const aiImages = imgs;
const CLEANING_SYSTEM = "Tu contrôles la propreté de logements de location courte durée pour une entreprise de ménage. Tu décris uniquement ce que tu vois sur les photos ; tu n'inventes rien. Réponds uniquement par un objet JSON valide, en français.";
async function ask(content: Part[]) { return askWith(CLEANING_SYSTEM, content, 1400); }

/** Appel Anthropic générique (photos + consigne) : même clé, mêmes messages d'erreur que le contrôle des ménages. */
export async function askWith(system: string, content: Part[], maxTokens: number): Promise<{ text: string | null; error: string | null }> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return { text: null, error: "clé d'API absente du serveur (ANTHROPIC_API_KEY)" };
  if (!content.some((c) => c.type === "image")) return { text: null, error: "aucune photo à analyser" };
  const body = JSON.stringify({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content }]
  });
  const call = (auth: Record<string, string>) => fetch("https://api.anthropic.com/v1/messages", { method: "POST", signal: AbortSignal.timeout(50_000), headers: { ...auth, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body });
  try {
    let res = await call({ "x-api-key": key });
    // Certaines clés s'envoient en « Bearer » : second essai avant d'abandonner.
    if (res.status === 401 && !key.startsWith("sk-ant-api")) res = await call({ authorization: `Bearer ${key}` });
    if (!res.ok) return { text: null, error: aiErrorLabel(res.status, await res.text().catch(() => "")) };
    const j: any = await res.json();
    const text = (j.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
    return text ? { text, error: null } : { text: null, error: "réponse vide de l'IA" };
  } catch (e) { return { text: null, error: (e as Error).name === "TimeoutError" ? "l'IA n'a pas répondu à temps" : "service Anthropic injoignable" }; }
}

/** Relevé à l'arrivée : ce qu'il y a à nettoyer, l'état général, le rangement, et la durée de ménage estimée. `memory` = ce que l'IA sait déjà de ce logement. */
export async function analyzeBefore(images: Img[], memory = ""): Promise<AiResult<BeforeReport>> {
  const r = await ask([...imgs(images), { type: "text", text: `Ces images, tirées de la vidéo du nettoyeur, montrent le logement À SON ARRIVÉE, avant le ménage.${memory} Liste ce qu'il faut nettoyer (pièce ou élément, et quoi faire), au maximum 12 points, du plus sale au moins sale, en signalant les coins très sales. Donne un niveau de saleté global de 1 (propre) à 5 (très sale), l'état général du logement en une phrase, la façon dont les pièces sont rangées en une phrase (ce qui traîne, ce qui est déplacé), la liste des zones visibles, et le temps de ménage que tu estimes pour une personne, en minutes. Ne décris que ce qui est visible. Réponds : {"items":[{"zone":"...","todo":"..."}],"level":3,"state":"...","tidy":"...","zones":["Cuisine","Salon"],"minutes":120,"summary":"une ou deux phrases"}` }]);
  if (!r.text) return { report: null, error: r.error };
  const report = parseBefore(r.text);
  return { report, error: report ? null : "réponse de l'IA illisible" };
}

/**
 * Contrôle à la fin du ménage. L'IA compare la vidéo de fin aux images de l'arrivée (mêmes zones, mêmes angles) et à la référence du propriétaire
 * (logement propre et rangé) : propreté, rien qui traîne, rangement conforme.
 */
export async function analyzeAfter(images: Img[], before: BeforeReport | null, ref?: { guide: Guide | null; images: Img[] }, beforeImages: Img[] = []): Promise<AiResult<AfterReport>> {
  const list = before?.items.length ? `Points relevés à l'arrivée : ${before.items.map((i) => `${i.zone} (${i.todo})`).join(" ; ")}.` : "Aucun relevé d'arrivée n'est disponible.";
  const guide = ref?.guide ? ` Guide de ce logement : ${ref.guide.rooms.map((r) => `${r.room} — ${r.steps.join(", ")}`).join(" ; ")}.${ref.guide.attention.length ? ` Points d'attention : ${ref.guide.attention.join(" ; ")}.` : ""}` : "";
  const content: Part[] = [];
  if (ref?.images.length) content.push({ type: "text", text: "RÉFÉRENCE DU PROPRIÉTAIRE — le logement propre et rangé, tel qu'il doit être rendu :" }, ...imgs(ref.images));
  if (beforeImages.length) content.push({ type: "text", text: "À L'ARRIVÉE — images de la vidéo du nettoyeur avant le ménage :" }, ...imgs(beforeImages));
  if (ref?.images.length || beforeImages.length) content.push({ type: "text", text: "À LA FIN — images de la vidéo du nettoyeur après le ménage :" });
  content.push(...imgs(images), { type: "text", text: `Ces ${ref?.images.length || beforeImages.length ? "dernières " : ""}images montrent le logement APRÈS le ménage. ${list}${guide}`
    + (beforeImages.length ? " Reprends chaque zone filmée à l'arrivée et vérifie-la sur les images de fin, sous le même angle : ce qui était sale est-il propre ? Si une zone filmée à l'arrivée n'apparaît sur aucune image de fin, cite-la dans \"missing\" (ne la compte pas comme sale)." : " Si une zone n'est pas filmée, ne la compte pas comme sale.")
    + (ref?.images.length ? " Compare aussi à la référence du propriétaire : signale ce qui n'est pas rendu comme sur la référence (lit non fait, coussins ou objets déplacés ou manquants, meuble mal replacé)." : "")
    + ` Vérifie trois choses : la propreté, que rien ne traîne (linge, déchets, vaisselle, produits ou matériel de ménage oubliés), et que tout est rangé. Dis ce qui est propre, et ce qui ne l'est CLAIREMENT pas. Ne demande une reprise que pour des défauts visibles. Quand une pièce est indiquée avant une image, cite cette pièce. S'il y a des points à reprendre, estime le temps de reprise en minutes. Réponds : {"cleaned":["..."],"remaining":[{"zone":"...","why":"..."}],"missing":["zone non refilmée"],"rework_minutes":15,"verdict":"ok" ou "reprise","summary":"une ou deux phrases","confidence":"haute|moyenne|faible"}` });
  const r = await ask(content);
  if (!r.text) return { report: null, error: r.error };
  const report = parseAfter(r.text);
  return { report, error: report ? null : "réponse de l'IA illisible" };
}

/** Référence d'un logement : à partir de photos du logement propre, l'IA rédige le guide de ménage (pièce par pièce) et les points d'attention. */
export async function analyzeReference(images: Img[], name: string): Promise<AiResult<Guide>> {
  const r = await ask([...imgs(images), { type: "text", text: `Ces photos montrent le logement « ${name.replace(/[«»"]/g, "")} » propre et prêt pour des voyageurs : c'est l'état de référence. Rédige le guide de ménage pour un nettoyeur qui ne connaît pas les lieux : pour chaque pièce visible, les étapes concrètes dans l'ordre (ce qu'il faut nettoyer, ranger, remettre en place comme sur les photos), puis les points d'attention propres à ce logement (matériaux fragiles, objets à replacer, zones qui se salissent). Ne décris que ce qui est visible. Réponds : {"summary":"une phrase qui décrit le logement","rooms":[{"room":"Cuisine","steps":["..."]}],"attention":["..."]}` }]);
  if (!r.text) return { report: null, error: r.error };
  const report = parseGuide(r.text);
  return { report, error: report ? null : "réponse de l'IA illisible" };
}
