import { mcpPost, methodNotAllowed } from "@/lib/mcp/http";

export const dynamic = "force-dynamic";

/** Connecteur MCP par lien secret (Claude Code, ou tout client qui accepte un jeton dans l'adresse). */
export async function POST(req: Request, { params }: { params: { token: string } }) { return mcpPost(req, params.token, "lien"); }
export async function GET() { return methodNotAllowed(); }
export async function DELETE() { return methodNotAllowed(); }
