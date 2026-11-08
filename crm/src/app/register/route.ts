import { agentClient } from "@/lib/agent";
import { allowedRedirect } from "@/lib/oauth";

export const dynamic = "force-dynamic";
const H = { "cache-control": "no-store", "access-control-allow-origin": "*" };

/** Inscription dynamique du client (RFC 7591). Adresses de retour limitées à Claude et à localhost ; aucun secret n'est émis (client public + PKCE). */
export async function POST(req: Request) {
  let b: any; try { b = await req.json(); } catch { return Response.json({ error: "invalid_client_metadata" }, { status: 400, headers: H }); }
  const uris: string[] = Array.isArray(b?.redirect_uris) ? b.redirect_uris.filter((u: unknown) => typeof u === "string") : [];
  if (!uris.length || uris.length > 5 || !uris.every(allowedRedirect)) return Response.json({ error: "invalid_redirect_uri", error_description: "Adresse de retour non autorisée." }, { status: 400, headers: H });
  const name = typeof b?.client_name === "string" ? b.client_name.slice(0, 80) : "Claude";
  const { data, error } = await agentClient().rpc("oauth_register_client", { p_name: name, p_redirects: uris });
  if (error || !data) return Response.json({ error: "invalid_client_metadata", error_description: "Inscription refusée." }, { status: 400, headers: H });
  return Response.json({ client_id: data, client_name: name, redirect_uris: uris, token_endpoint_auth_method: "none", grant_types: ["authorization_code"], response_types: ["code"], scope: "crm" }, { status: 201, headers: H });
}
export async function OPTIONS() { return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "*" } }); }
