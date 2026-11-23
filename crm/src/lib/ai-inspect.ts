/**
 * Contrôle d'un ménage par l'IA à partir des photos du nettoyeur : « avant » = ce qu'il y a à nettoyer ; « après » = ce qui est fait, ce qui reste, verdict.
 * Actif seulement si ANTHROPIC_API_KEY est configurée ; sinon le ménage part à la direction avec la mention « analyse automatique indisponible ».
 * L'IA demande les reprises. Elle ne valide seule que si le réglage « validation automatique » est activé et qu'elle n'est pas peu sûre ; sinon la direction valide.
 */
export type Img = { content_type: string; b64: string; room?: string | null };
export type BeforeReport = { items: { zone: string; todo: string }[]; level: number | null; summary: string; state?: string; tidy?: string; minutes?: number | null; zones?: string[]; tasks?: string[]; frame_rooms?: string[]; seen?: string; refilm?: { zone: string; why: string }[]; tips?: { surface: string; product: string; how: string }[] };
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
  if (!j || (!Array.isArray(j.items) && !Array.isArray(j.tasks))) return null;
  const items = (Array.isArray(j.items) ? j.items : []).map((x: any) => ({ zone: str(x?.zone, 80), todo: str(x?.todo, 160) })).filter((x: any) => x.zone || x.todo).slice(0, 14);
  const lv = Number(j.level);
  const mn = Number(j.minutes);
  // Tâches dans l'ordre à faire : si l'IA n'en donne pas, elles viennent des points relevés.
  const given = (Array.isArray(j.tasks) ? j.tasks : []).map((x: any) => str(x, 160)).filter(Boolean).slice(0, 14);
  const tasks = given.length ? given : items.map((x: any) => (x.zone && x.todo ? `${x.zone} : ${x.todo}` : x.zone || x.todo)).slice(0, 14);
  return { items, level: Number.isFinite(lv) && lv >= 1 && lv <= 5 ? Math.round(lv) : null, summary: str(j.summary, 400), state: str(j.state, 300), tidy: str(j.tidy, 300),
    minutes: Number.isFinite(mn) && mn >= 5 && mn <= 720 ? Math.round(mn) : null, zones: (Array.isArray(j.zones) ? j.zones : []).map((x: any) => str(x, 60)).filter(Boolean).slice(0, 16),
    tasks, seen: str(j.seen, 500), refilm: (Array.isArray(j.refilm) ? j.refilm : []).map((x: any) => ({ zone: str(x?.zone, 60), why: str(x?.why, 120) })).filter((x: any) => x.zone).slice(0, 3), tips: (Array.isArray(j.tips) ? j.tips : []).map((x: any) => ({ surface: str(x?.surface, 60), product: str(x?.product, 120), how: str(x?.how, 200) })).filter((x: any) => x.surface && (x.product || x.how)).slice(0, 6), frame_rooms: (Array.isArray(j.frame_rooms) ? j.frame_rooms : []).map((x: any) => str(x, 40)).slice(0, 16) };
}

export function parseAfter(text: string, labels: string[] = []): AfterReport | null {
  const j = json(text);
  if (!j || (j.verdict !== "ok" && j.verdict !== "reprise")) return null;
  const remaining = (Array.isArray(j.remaining) ? j.remaining : []).map((x: any) => ({ zone: str(x?.zone, 80), why: str(x?.why, 200) })).filter((x: any) => x.zone || x.why).slice(0, 12);
  // Zones filmées avant mais absentes de la vidéo d'après : le nettoyeur doit les refilmer (3 au plus, pour ne pas le bloquer sur un détail).
  const missing = (Array.isArray(j.missing) ? j.missing : []).map((x: any) => str(x, 60)).filter(Boolean).slice(0, 3);
  for (const z of missing) if (remaining.length < 12) remaining.push({ zone: z, why: "zone filmée à l'arrivée mais absente de la vidéo de fin : refilmez-la sous le même angle" });
  // Tâches données au nettoyeur : celles que la vidéo de fin ne montre pas faites sont à reprendre, avec le numéro de la tâche.
  for (const t of Array.isArray(j.tasks) ? j.tasks : []) {
    const n = Math.round(Number(t?.n));
    if (t?.ok !== false || !(n >= 1) || remaining.length >= 12) continue;
    const zone = labels[n - 1] ? str(labels[n - 1], 80) : `Tâche ${n}`;
    if (!remaining.some((r: any) => r.zone === zone)) remaining.push({ zone, why: str(t?.why, 200) || "pas faite d'après la vidéo de fin" });
  }
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
const CLEANING_SYSTEM = "Tu contrôles la propreté de lieux (logements, bureaux, commerces, parties communes) pour une entreprise de ménage. Tu regardes attentivement chaque image et tu décris uniquement ce que tu y vois réellement ; tu n'inventes rien et tu ne supposes jamais l'existence d'une pièce ou d'un objet qui n'apparaît sur aucune image. Réponds uniquement par un objet JSON valide, en français.";
async function ask(content: Part[]) { return askWith(CLEANING_SYSTEM, content, 4000); }

/** Appel Anthropic générique (photos + consigne) : même clé, mêmes messages d'erreur que le contrôle des ménages. */
export async function askWith(system: string, content: Part[], maxTokens: number, model?: string): Promise<{ text: string | null; error: string | null }> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return { text: null, error: "clé d'API absente du serveur (ANTHROPIC_API_KEY)" };
  if (!content.some((c) => c.type === "image")) return { text: null, error: "aucune photo à analyser" };
  // La base renvoie le base64 coupé par des retours à la ligne : Anthropic le refuse (« invalid base64 data »). On les retire ici, pour toutes les analyses.
  const clean = content.map((c) => (c.type === "image" ? { ...c, source: { ...c.source, data: c.source.data.replace(/\s+/g, "") } } : c));
  const body = JSON.stringify({
    model: model || process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: clean }]
  });
  const call = (auth: Record<string, string>) => fetch("https://api.anthropic.com/v1/messages", { method: "POST", signal: AbortSignal.timeout(50_000), headers: { ...auth, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body });
  try {
    let res = await call({ "x-api-key": key });
    // Certaines clés s'envoient en « Bearer » : second essai avant d'abandonner.
    if (res.status === 401 && !key.startsWith("sk-ant-api")) res = await call({ authorization: `Bearer ${key}` });
    if (!res.ok) return { text: null, error: aiErrorLabel(res.status, await res.text().catch(() => "")) };
    const j: any = await res.json();
    const text = (j.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
    if (j.stop_reason === "max_tokens") console.error("[ia] réponse coupée (max_tokens)", { model: j.model, fin: text.slice(-200) });
    return text ? { text, error: null } : { text: null, error: "réponse vide de l'IA" };
  } catch (e) { return { text: null, error: (e as Error).name === "TimeoutError" ? "l'IA n'a pas répondu à temps" : "service Anthropic injoignable" }; }
}

/** Relevé à l'arrivée : ce qu'il y a à nettoyer, l'état général, le rangement, et la durée de ménage estimée. `memory` = ce que l'IA sait déjà de ce logement. */
export async function analyzeBefore(images: Img[], memory = ""): Promise<AiResult<BeforeReport>> {
  // Chaque image est numérotée : l'IA indique de quelle pièce elle vient (les captures sont tirées de la vidéo, sans que le nettoyeur ait rien à choisir).
  const shots: Part[] = images.flatMap((im, i): Part[] => [{ type: "text", text: `Image ${i + 1}${im.room ? ` (pièce : ${str(im.room, 60)})` : ""}` }, { type: "image", source: { type: "base64", media_type: im.content_type, data: im.b64 } }]);
  const content: Part[] = [...shots, { type: "text", text: `Ces ${images.length} images, tirées dans l'ordre de la vidéo du nettoyeur, montrent le lieu À SON ARRIVÉE, avant le ménage.${memory} Regarde chaque image en détail avant de répondre. RÈGLE ABSOLUE : tout ce que tu écris doit venir de ces images. Ne cite aucune pièce, aucun meuble, aucun objet qui n'apparaît pas sur une image (pas de cuisine, de lit, de salle de bain ou de WC s'ils ne sont pas filmés) et ne donne aucune tâche « habituelle » ou générique : seulement ce que ces images justifient. Fais le compte rendu : (0) "seen" : en UNE phrase de 25 mots au plus, ce que tu vois précisément — le type de lieu (bureau, chambre, salon, cuisine…), les meubles et objets reconnaissables avec leur nombre et leur position, et ce qui est en désordre (par exemple « Un bureau avec deux écrans et quatre chaises, dont deux écartées de la table ; des papiers et une tasse sur le plateau ; un carton au sol près de la fenêtre ») ; (1) "items" : ce qu'il faut nettoyer ou ranger (l'élément précis vu à l'image, et quoi faire), au maximum 8 points courts, du plus sale au moins sale ; (2) "tasks" : la liste des tâches à donner au nettoyeur, DANS L'ORDRE où il doit les faire (3 à 10 tâches à l'impératif, de 10 mots au plus chacune, sans parenthèses ni explication, chacune nommant un élément visible sur les images et ce qu'il faut en faire, par exemple « Bureau : replacer les quatre chaises autour de la table » ou « Plan de travail : jeter les emballages et essuyer les traces ») ; s'il y a peu à faire, donne peu de tâches ; (3) "frame_rooms" : pour CHAQUE image, dans l'ordre, la pièce ou le lieu (Bureau, Cuisine, Salon, Chambre, Salle de bain, WC, Entrée, Autre) — exactement ${images.length} valeurs ; (4) un niveau de saleté global de 1 (propre) à 5 (très sale), l'état général en une phrase, le rangement en une phrase (ce qui traîne, ce qui est déplacé), la liste des zones réellement visibles, et le temps de ménage estimé pour une personne pour ces seules zones, en minutes. (5) "tips" : 2 à 6 conseils de nettoyage adaptés aux sols et matériaux RÉELLEMENT visibles (carrelage, parquet, stratifié, moquette, tapis, bois verni ou brut, verre, inox, marbre ou pierre, tissu, cuir, écrans…) : pour chacun, la surface vue, le type de produit à utiliser (sans marque : par exemple « nettoyant sol neutre dilué », « microfibre humide sans produit », « vinaigre blanc dilué », « aspirateur brosse douce ») et le geste ou la précaution (par exemple « serpillière bien essorée, jamais d'eau stagnante sur du parquet », « pas de vinaigre ni d'anticalcaire sur le marbre », « pas de produit sur un écran : microfibre sèche »). Ne recommande jamais de mélanger des produits (jamais javel avec un autre produit). Si tu n'es pas sûr du matériau, dis-le et propose le geste le plus doux. (6) "refilm" : les zones que le nettoyeur doit filmer à nouveau pour que le relevé soit précis, 3 au plus, chacune avec la raison en 10 mots au plus : une image floue, trop sombre ou filmée trop vite ; une zone vue seulement en partie (le sol, un coin, un meuble coupé) ; une pièce qu'on devine par une porte ouverte mais qui n'est pas filmée ; une zone connue des visites précédentes absente des images d'aujourd'hui. Nomme la zone clairement (« Coin canapé », « Sol sous la table », « Pièce derrière la porte du fond »). Si tout est bien filmé, renvoie une liste vide : ne demande jamais de refilmer sans raison. Si les images sont floues, trop sombres ou ne montrent presque rien, dis-le dans "seen" et ne donne que les tâches dont tu es sûr. STYLE : le nettoyeur lit sur son téléphone, debout, en quelques secondes. Écris des points clés, des mots simples, aucune phrase longue : "todo" en 8 mots au plus, "product" en 5 mots au plus, "how" en 10 mots au plus, "state" et "tidy" en 12 mots au plus chacun, "summary" en une phrase de 15 mots au plus. Réponds : {"seen":"...","items":[{"zone":"...","todo":"..."}],"tasks":["..."],"refilm":[{"zone":"...","why":"..."}],"tips":[{"surface":"Sol carrelé","product":"...","how":"..."}],"frame_rooms":["Bureau"],"level":3,"state":"...","tidy":"...","zones":["Bureau"],"minutes":30,"summary":"une ou deux phrases"}` }];
  const r = await ask(content);
  if (!r.text) return { report: null, error: r.error };
  let report = parseBefore(r.text);
  if (!report) {
    // Réponse inexploitable du modèle rapide : on la consigne et on redemande une fois au modèle habituel.
    console.error("[ia] relevé d'arrivée illisible", { debut: r.text.slice(0, 300), fin: r.text.slice(-300) });
    const again = await ask(content);
    if (!again.text) return { report: null, error: again.error };
    report = parseBefore(again.text);
    if (!report) console.error("[ia] relevé d'arrivée illisible (second essai)", { debut: again.text.slice(0, 300), fin: again.text.slice(-300) });
  }
  return { report, error: report ? null : "réponse de l'IA illisible" };
}

/**
 * Contrôle à la fin du ménage. L'IA compare la vidéo de fin aux images de l'arrivée (mêmes zones, mêmes angles) et à la référence du propriétaire
 * (logement propre et rangé) : propreté, rien qui traîne, rangement conforme.
 */
export async function analyzeAfter(images: Img[], before: BeforeReport | null, ref?: { guide: Guide | null; images: Img[] }, beforeImages: Img[] = []): Promise<AiResult<AfterReport>> {
  const list = before?.items.length ? `Points relevés à l'arrivée : ${before.items.map((i) => `${i.zone} (${i.todo})`).join(" ; ")}.` : "Aucun relevé d'arrivée n'est disponible.";
  const guide = ref?.guide ? ` Guide de ce logement : ${ref.guide.rooms.map((r) => `${r.room} — ${r.steps.join(", ")}`).join(" ; ")}.${ref.guide.attention.length ? ` Points d'attention : ${ref.guide.attention.join(" ; ")}.` : ""}` : "";
  const taskList = before?.tasks?.length ? ` Tâches données au nettoyeur, dans l'ordre : ${before.tasks.map((t, i) => `${i + 1}. ${t}`).join(" ; ")}.` : "";
  const content: Part[] = [];
  if (ref?.images.length) content.push({ type: "text", text: "RÉFÉRENCE DU PROPRIÉTAIRE — le logement propre et rangé, tel qu'il doit être rendu :" }, ...imgs(ref.images));
  if (beforeImages.length) content.push({ type: "text", text: "À L'ARRIVÉE — images de la vidéo du nettoyeur avant le ménage :" }, ...imgs(beforeImages));
  if (ref?.images.length || beforeImages.length) content.push({ type: "text", text: "À LA FIN — images de la vidéo du nettoyeur après le ménage :" });
  content.push(...imgs(images), { type: "text", text: `Ces ${ref?.images.length || beforeImages.length ? "dernières " : ""}images montrent le logement APRÈS le ménage. ${list}${taskList}${guide}`
    + (before?.tasks?.length ? " Pour chaque tâche numérotée, dis si la vidéo de fin la montre faite (« tasks » : n, ok, why) ; ok=false seulement si elle n'est CLAIREMENT pas faite ou si sa zone n'est pas filmée." : "")
    + (beforeImages.length ? " Reprends chaque zone filmée à l'arrivée et vérifie-la sur les images de fin, sous le même angle : ce qui était sale est-il propre ? Si une zone filmée à l'arrivée n'apparaît sur aucune image de fin, cite-la dans \"missing\" (ne la compte pas comme sale)." : " Si une zone n'est pas filmée, ne la compte pas comme sale.")
    + (ref?.images.length ? " Compare aussi à la référence du propriétaire : signale ce qui n'est pas rendu comme sur la référence (lit non fait, coussins ou objets déplacés ou manquants, meuble mal replacé)." : "")
    + ` Vérifie trois choses : la propreté, que rien ne traîne (linge, déchets, vaisselle, produits ou matériel de ménage oubliés), et que tout est rangé. Dis ce qui est propre, et ce qui ne l'est CLAIREMENT pas. Ne demande une reprise que pour des défauts visibles. Quand une pièce est indiquée avant une image, cite cette pièce. S'il y a des points à reprendre, estime le temps de reprise en minutes. Le nettoyeur lit ta réponse sur son téléphone : chaque \"why\" en 12 mots au plus, \"summary\" en une phrase de 20 mots au plus, des mots simples. Réponds : {"cleaned":["..."],"tasks":[{"n":1,"ok":true,"why":""}],"remaining":[{"zone":"...","why":"..."}],"missing":["zone non refilmée"],"rework_minutes":15,"verdict":"ok" ou "reprise","summary":"une ou deux phrases","confidence":"haute|moyenne|faible"}` });
  const r = await ask(content);
  if (!r.text) return { report: null, error: r.error };
  const report = parseAfter(r.text, before?.tasks ?? []);
  return { report, error: report ? null : "réponse de l'IA illisible" };
}

/** Référence d'un logement : à partir de photos du logement propre, l'IA rédige le guide de ménage (pièce par pièce) et les points d'attention. */
export async function analyzeReference(images: Img[], name: string): Promise<AiResult<Guide>> {
  const r = await ask([...imgs(images), { type: "text", text: `Ces photos montrent le logement « ${name.replace(/[«»"]/g, "")} » propre et prêt pour des voyageurs : c'est l'état de référence. Rédige le guide de ménage pour un nettoyeur qui ne connaît pas les lieux : pour chaque pièce visible, les étapes concrètes dans l'ordre (ce qu'il faut nettoyer, ranger, remettre en place comme sur les photos), puis les points d'attention propres à ce logement (matériaux fragiles, objets à replacer, zones qui se salissent). Ne décris que ce qui est visible. Réponds : {"summary":"une phrase qui décrit le logement","rooms":[{"room":"Cuisine","steps":["..."]}],"attention":["..."]}` }]);
  if (!r.text) return { report: null, error: r.error };
  const report = parseGuide(r.text);
  return { report, error: report ? null : "réponse de l'IA illisible" };
}
