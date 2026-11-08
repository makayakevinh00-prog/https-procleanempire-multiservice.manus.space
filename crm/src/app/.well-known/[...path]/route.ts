import { authServerMetadata, protectedResourceMetadata } from "@/lib/oauth";

export const dynamic = "force-dynamic";
const H = { "cache-control": "public, max-age=300", "access-control-allow-origin": "*" };
const notFound = () => Response.json({ error: "not_found" }, { status: 404, headers: { "cache-control": "no-store" } });

/** Découverte OAuth (RFC 9728 et RFC 8414) : Claude la lit pour savoir où inscrire le client et où demander l'autorisation. */
export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const origin = new URL(req.url).origin;
  const first = params.path[0];
  if (first === "oauth-protected-resource") return Response.json(protectedResourceMetadata(origin), { headers: H });
  if (first === "oauth-authorization-server" || first === "openid-configuration") return Response.json(authServerMetadata(origin), { headers: H });
  return notFound();
}
export async function OPTIONS() { return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS", "access-control-allow-headers": "*" } }); }
