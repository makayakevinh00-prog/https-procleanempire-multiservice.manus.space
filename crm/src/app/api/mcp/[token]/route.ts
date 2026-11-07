import { agentClient, isToken } from "@/lib/agent";
import { handleMcp } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";
const H = { "cache-control": "no-store", "x-robots-tag": "noindex" };

/** Connecteur MCP des agents. Le lien secret est vérifié dans la base (empreinte) à chaque appel ; l'agent n'a accès qu'à agent_api(). */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!isToken(token)) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Lien invalide ou révoqué." } }, { status: 401, headers: H });
  const text = await req.text();
  if (text.length > 64_000) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Requête trop volumineuse." } }, { status: 413, headers: H });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON invalide." } }, { status: 400, headers: H }); }
  const sb = agentClient();
  // Vérifie le lien dès l'ouverture de session : un lien révoqué est refusé avant toute autre réponse.
  const probe = await sb.rpc("agent_api", { p_token: token, p_op: "overview", p_args: {} });
  if (probe.error) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Lien invalide ou révoqué." } }, { status: 401, headers: H });
  const r = await handleMcp(body, async (op, args) => {
    const { data, error } = await sb.rpc("agent_api", { p_token: token, p_op: op, p_args: args });
    if (error) throw new Error(error.message);
    return data;
  });
  if (r.status === 202) return new Response(null, { status: 202, headers: H });
  return Response.json(r.json, { status: r.status, headers: H });
}

export async function GET() { return new Response("Connecteur MCP ProClean : utilisez la méthode POST.", { status: 405, headers: { ...H, allow: "POST" } }); }
export async function DELETE() { return new Response(null, { status: 405, headers: { ...H, allow: "POST" } }); }
