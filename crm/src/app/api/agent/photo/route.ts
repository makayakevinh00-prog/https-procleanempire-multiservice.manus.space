import { NextResponse } from "next/server";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { runMissionAfter, runMissionBefore } from "@/lib/marketplace/mission-inspect";

export const runtime = "nodejs";
export const maxDuration = 60;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX = 1_500_000;

/**
 * Reçoit une image de mission (déjà réduite par le téléphone) et la transmet à la base, qui revérifie jeton, mission et taille.
 * Avec « film=1 », l'image vient du film d'arrivée ou de fin : à la dernière (sans « defer »), l'IA analyse l'ensemble.
 */
export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  const token = String(fd?.get("token") ?? ""), id = String(fd?.get("mission") ?? fd?.get("job") ?? ""), kind = String(fd?.get("kind") ?? "");
  const file = fd?.get("file");
  if (!isToken(token) || !/^[0-9a-f-]{36}$/.test(id) || !(file instanceof File)) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  if (!TYPES.has(file.type)) return NextResponse.json({ error: "Format non accepté (JPEG, PNG ou WebP)." }, { status: 415 });
  if (file.size > MAX) return NextResponse.json({ error: "Photo trop lourde (1,5 Mo maximum)." }, { status: 413 });
  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const { error } = await agentClient().rpc("agent_add_photo", { p_token: token, p_id: id, p_kind: kind, p_content_type: file.type, p_data_b64: b64 });
  if (error) return NextResponse.json({ error: agentMessage(error.message) }, { status: /ACCES_REFUSE/.test(error.message) ? 403 : 422 });
  let aiError: string | null = null;
  if (fd?.get("film") === "1" && fd?.get("defer") !== "1" && (kind === "avant" || kind === "apres")) {
    try {
      if (kind === "avant") aiError = await runMissionBefore(id);
      else { const r = await runMissionAfter(id); aiError = r.status === "indisponible" ? r.summary : null; }
    } catch (e) { aiError = `erreur interne : ${(e as Error).message}`; }
    if (aiError) console.error("[agent] analyse du film impossible :", aiError);
  }
  return NextResponse.json({ ok: true, aiError });
}
