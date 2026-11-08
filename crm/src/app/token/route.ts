import { agentClient } from "@/lib/agent";
import { s256, sha256Hex, validVerifier } from "@/lib/oauth";

export const dynamic = "force-dynamic";
const H = { "cache-control": "no-store", pragma: "no-cache", "access-control-allow-origin": "*" };
const bad = (error: string, description?: string) => Response.json({ error, error_description: description }, { status: 400, headers: H });

/** Échange code + PKCE contre un jeton d'agent (le même que ceux des liens secrets : révocable dans Paramètres > Agents). */
export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  let f: Record<string, string> = {};
  try { f = ct.includes("json") ? await req.json() : Object.fromEntries(new URLSearchParams(await req.text())); } catch { return bad("invalid_request"); }
  if (f.grant_type !== "authorization_code") return bad("unsupported_grant_type");
  if (!f.code || !f.client_id || !f.redirect_uri || !f.code_verifier) return bad("invalid_request", "code, client_id, redirect_uri et code_verifier sont requis.");
  if (!validVerifier(f.code_verifier)) return bad("invalid_grant", "code_verifier invalide.");
  const { data, error } = await agentClient().rpc("oauth_exchange", { p_code_hash: sha256Hex(f.code), p_client: f.client_id, p_redirect: f.redirect_uri, p_challenge: s256(f.code_verifier) });
  if (error || !data) return bad("invalid_grant", "Code inconnu, expiré ou déjà utilisé.");
  return Response.json({ access_token: data, token_type: "Bearer", scope: "crm" }, { headers: H });
}
export async function OPTIONS() { return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "*" } }); }
