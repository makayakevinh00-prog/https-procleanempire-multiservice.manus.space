import { NextResponse } from "next/server";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { runBeforeAnalysis } from "@/lib/marketplace/inspect";

export const runtime = "nodejs";
export const maxDuration = 60;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX = 1_500_000;

/** Reçoit une photo avant / après d'un ménage (réduite par le téléphone). La base revérifie lien, ménage, jour et taille. Une photo « avant » déclenche le relevé des points à nettoyer si l'IA est activée. */
export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  const token = String(fd?.get("token") ?? ""), job = String(fd?.get("job") ?? ""), kind = String(fd?.get("kind") ?? "");
  const file = fd?.get("file");
  if (!isToken(token) || !/^[0-9a-f-]{36}$/.test(job) || !(file instanceof File)) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  if (!TYPES.has(file.type)) return NextResponse.json({ error: "Format non accepté (JPEG, PNG ou WebP)." }, { status: 415 });
  if (file.size > MAX) return NextResponse.json({ error: "Photo trop lourde (1,5 Mo maximum)." }, { status: 413 });
  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const { error } = await agentClient().rpc("cleaner_add_photo", { p_token: token, p_job: job, p_kind: kind, p_content_type: file.type, p_data_b64: b64, p_room: String(fd?.get("room") ?? "").slice(0, 60) || null });
  if (error) return NextResponse.json({ error: agentMessage(error.message) }, { status: /ACCES_REFUSE/.test(error.message) ? 403 : 422 });

  let analysed = false;
  if (kind === "avant" && fd?.get("defer") !== "1") {
    try { analysed = (await runBeforeAnalysis(job)) === null; } catch { /* l'analyse ne doit jamais empêcher l'envoi de la photo */ }
  }
  return NextResponse.json({ ok: true, analysed });
}
