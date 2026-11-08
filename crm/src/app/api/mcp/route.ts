import { mcpPost, methodNotAllowed } from "@/lib/mcp/http";

export const dynamic = "force-dynamic";

/** Connecteur MCP par jeton OAuth (« Bearer »), obtenu par la connexion de Claude (bouton Connecter). */
export async function POST(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(h);
  return mcpPost(req, m ? m[1] : null, "bearer");
}
export async function GET() { return methodNotAllowed(); }
export async function DELETE() { return methodNotAllowed(); }
