import { NextResponse } from "next/server";
import { agentClient, agentMessage, isToken } from "@/lib/agent";

export const dynamic = "force-dynamic";

/** Messagerie de l'agent : lecture de sa conversation (GET) et envoi (POST). Jeton revérifié par la base. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!isToken(token)) return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  const { data, error } = await agentClient().rpc("agent_messages", { p_token: token });
  if (error) return NextResponse.json({ error: agentMessage(error.message) }, { status: 403 });
  return NextResponse.json({ messages: data ?? [] }, { headers: { "cache-control": "no-store" } });
}
export async function POST(req: Request) {
  const j = (await req.json().catch(() => null)) as { token?: string; body?: string } | null;
  if (!j || !isToken(String(j.token ?? ""))) return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  const { error } = await agentClient().rpc("agent_send_message", { p_token: j.token, p_body: String(j.body ?? "") });
  if (error) return NextResponse.json({ error: agentMessage(error.message) }, { status: 422 });
  return NextResponse.json({ ok: true });
}
