/**
 * Contrôle d'un ménage par l'IA à partir des photos du nettoyeur : « avant » = ce qu'il y a à nettoyer ; « après » = ce qui est fait, ce qui reste, verdict.
 * Actif seulement si ANTHROPIC_API_KEY est configurée ; sinon le ménage part à la direction avec la mention « analyse automatique indisponible ».
 * L'IA demande les reprises. Elle ne valide seule que si le réglage « validation automatique » est activé et qu'elle n'est pas peu sûre ; sinon la direction valide.
 */
export type Img = { content_type: string; b64: string };
export type BeforeReport = { items: { zone: string; todo: string }[]; level: number | null; summary: string };
export type AfterReport = { cleaned: string[]; remaining: { zone: string; why: string }[]; verdict: "ok" | "reprise"; summary: string; confidence: "haute" | "moyenne" | "faible" };

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
  return { items, level: Number.isFinite(lv) && lv >= 1 && lv <= 5 ? Math.round(lv) : null, summary: str(j.summary, 400) };
}

export function parseAfter(text: string): AfterReport | null {
  const j = json(text);
  if (!j || (j.verdict !== "ok" && j.verdict !== "reprise")) return null;
  const remaining = (Array.isArray(j.remaining) ? j.remaining : []).map((x: any) => ({ zone: str(x?.zone, 80), why: str(x?.why, 200) })).filter((x: any) => x.zone || x.why).slice(0, 12);
  // Cohérence : une « reprise » sans aucun point restant n'a pas de sens ; des points restants sans verdict « reprise » non plus.
  const verdict: "ok" | "reprise" = remaining.length ? "reprise" : "ok";
  return {
    cleaned: (Array.isArray(j.cleaned) ? j.cleaned : []).map((x: any) => str(x, 120)).filter(Boolean).slice(0, 20), remaining, verdict,
    summary: str(j.summary, 500) || (verdict === "ok" ? "Le ménage paraît complet." : "Des points restent à nettoyer."),
    confidence: j.confidence === "haute" || j.confidence === "faible" ? j.confidence : "moyenne"
  };
}

async function ask(images: Img[], prompt: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key || !images.length) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: AbortSignal.timeout(45_000),
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", max_tokens: 900,
        system: "Tu contrôles la propreté de logements de location courte durée pour une entreprise de ménage. Tu décris uniquement ce que tu vois sur les photos ; tu n'inventes rien. Réponds uniquement par un objet JSON valide, en français.",
        messages: [{ role: "user", content: [...images.map((i) => ({ type: "image", source: { type: "base64", media_type: i.content_type, data: i.b64 } })), { type: "text", text: prompt }] }]
      })
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    return (j.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n") || null;
  } catch { return null; }
}

export async function analyzeBefore(images: Img[]): Promise<BeforeReport | null> {
  const t = await ask(images, 'Ces photos montrent le logement AVANT le ménage. Liste ce qu\'il faut nettoyer (pièce ou élément, et quoi faire), au maximum 12 points, du plus important au moins important, et donne un niveau de saleté global de 1 (propre) à 5 (très sale). Réponds : {"items":[{"zone":"...","todo":"..."}],"level":3,"summary":"une phrase"}');
  return t ? parseBefore(t) : null;
}

export async function analyzeAfter(images: Img[], before: BeforeReport | null): Promise<AfterReport | null> {
  const list = before?.items.length ? `Points relevés avant le ménage : ${before.items.map((i) => `${i.zone} (${i.todo})`).join(" ; ")}.` : "Aucun relevé avant le ménage n'est disponible.";
  const t = await ask(images, `Ces photos montrent le logement APRÈS le ménage. ${list} Dis ce qui est propre, et ce qui ne l'est CLAIREMENT pas (saleté, désordre, linge ou déchets visibles). Ne demande une reprise que pour des défauts visibles sur les photos : si une zone n'est pas photographiée, ne la compte pas comme sale. Réponds : {"cleaned":["..."],"remaining":[{"zone":"...","why":"..."}],"verdict":"ok" ou "reprise","summary":"une ou deux phrases","confidence":"haute|moyenne|faible"}`);
  return t ? parseAfter(t) : null;
}
