import { agentClient } from "@/lib/agent";
import { handleMcp } from "@/lib/mcp/server";
import { resourceMetadataUrl } from "@/lib/oauth";

const H = { "cache-control": "no-store", "x-robots-tag": "noindex" };

/**
 * Traitement d'un appel MCP (JSON-RPC) pour un jeton d'agent déjà extrait (lien secret OU jeton OAuth « Bearer »).
 * Jeton absent : 401 + indication de découverte OAuth (le client Claude lance alors la connexion). Jeton invalide ou révoqué : 403 (une inscription OAuth n'y changerait rien).
 */
export async function mcpPost(req: Request, token: string | null, via: "lien" | "bearer"): Promise<Response> {
  const origin = new URL(req.url).origin;
  const log = (status: number, method?: unknown) => { try { console.log(JSON.stringify({ evt: "mcp", via, status, rpc: typeof method === "string" ? method : null, ua: (req.headers.get("user-agent") ?? "").slice(0, 80) })); } catch {} };
  const err = (status: number, message: string, extra: Record<string, string> = {}) => Response.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message } }, { status, headers: { ...H, ...extra } });
  if (!token) { log(401); return err(401, "Authentification requise.", { "www-authenticate": `Bearer resource_metadata="${resourceMetadataUrl(origin)}"` }); }
  if (!/^[0-9a-f]{64}$/.test(token)) { log(403); return err(403, "Lien invalide ou révoqué."); }
  const text = await req.text();
  if (text.length > 64_000) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Requête trop volumineuse." } }, { status: 413, headers: H });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON invalide." } }, { status: 400, headers: H }); }
  const sb = agentClient();
  const probe = await sb.rpc("agent_api", { p_token: token, p_op: "overview", p_args: {} });   // refuse un jeton révoqué avant toute autre réponse
  if (probe.error) { log(403, (body as any)?.method); return err(403, "Lien invalide ou révoqué."); }
  const r = await handleMcp(body, async (op, args, meta) => {
    const { data, error } = await sb.rpc(op.startsWith("db_") ? "agent_admin_api" : "agent_api", { p_token: token, p_op: op, p_args: args });
    if (error) throw new Error(error.message);
    // Présence pour l'Open space : au mieux, jamais bloquant (base pas encore migrée = on ignore).
    try { await sb.rpc("agent_presence_touch", { p_token: token, p_agent: meta?.agent ?? null, p_op: op }); } catch { /* sans effet sur la réponse */ }
    return data;
  }, origin);
  log(r.status, (body as any)?.method);
  if (r.status === 202) return new Response(null, { status: 202, headers: H });
  return Response.json(r.json, { status: r.status, headers: H });
}
export const methodNotAllowed = () => new Response("Connecteur MCP ProClean : utilisez la méthode POST.", { status: 405, headers: { ...H, allow: "POST" } });
