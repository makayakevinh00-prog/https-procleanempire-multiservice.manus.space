import { NextResponse } from "next/server";
import { agentClient, isToken } from "@/lib/agent";
import { runMissionAfter, runMissionBefore } from "@/lib/marketplace/mission-inspect";

export const runtime = "nodejs";
export const maxDuration = 60;

/** L'agent relance l'analyse de son film (arrivée ou fin) quand l'IA n'a pas répondu. La base vérifie que la mission est la sienne et encore en cours. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { token?: string; mission?: string; kind?: string } | null;
  const token = String(b?.token ?? ""), id = String(b?.mission ?? ""), kind = b?.kind === "apres" ? "apres" : "avant";
  if (!isToken(token) || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  const can = await agentClient().rpc("agent_can_analyse", { p_token: token, p_id: id });
  if (can.error || can.data !== true) return NextResponse.json({ error: "Mission introuvable." }, { status: 403 });
  let error: string | null;
  try {
    if (kind === "avant") error = await runMissionBefore(id);
    else { const r = await runMissionAfter(id); error = r.status === "indisponible" ? r.summary : null; }
  } catch (e) { error = `erreur interne : ${(e as Error).message}`; }
  if (error) console.error("[agent] analyse relancée impossible :", error);
  return NextResponse.json({ ok: !error, error });
}
