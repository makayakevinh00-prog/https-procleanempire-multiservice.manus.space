import { NextResponse } from "next/server";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { adviseProblem } from "@/lib/ai-advisor";
import { aiConfigured } from "@/lib/ai-inspect";

export const runtime = "nodejs";
export const maxDuration = 60;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Aide de l'IA pour un agent sur place : jeton et mission revérifiés par la base, puis photos + question envoyées à l'IA. Rien n'est enregistré. */
export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  const token = String(fd?.get("token") ?? ""), id = String(fd?.get("mission") ?? ""), question = String(fd?.get("question") ?? "");
  const files = (fd?.getAll("file") ?? []).filter((f): f is File => f instanceof File).slice(0, 3);
  if (!isToken(token) || !/^[0-9a-f-]{36}$/.test(id) || !files.length) return NextResponse.json({ error: "Ajoutez au moins une photo." }, { status: 400 });
  if (files.some((f) => !TYPES.has(f.type) || f.size > 1_500_000)) return NextResponse.json({ error: "Photo non acceptée (JPEG, PNG ou WebP, 1,5 Mo maximum)." }, { status: 415 });
  if (!aiConfigured()) return NextResponse.json({ error: "L'aide automatique n'est pas encore activée : appelez votre responsable." }, { status: 503 });
  const { data, error } = await agentClient().rpc("agent_mission", { p_token: token, p_id: id });
  if (error) return NextResponse.json({ error: agentMessage(error.message) }, { status: 403 });
  const m = (data as { mission: { client: string; site: string | null; title: string } }).mission;
  const images = await Promise.all(files.map(async (f) => ({ content_type: f.type, b64: Buffer.from(await f.arrayBuffer()).toString("base64") })));
  const r = await adviseProblem(images, question, `${m.title} chez ${m.client}${m.site ? ` (${m.site})` : ""}`);
  if (!r.advice) return NextResponse.json({ error: `Aide indisponible : ${r.error}` }, { status: 502 });
  return NextResponse.json({ advice: r.advice });
}
