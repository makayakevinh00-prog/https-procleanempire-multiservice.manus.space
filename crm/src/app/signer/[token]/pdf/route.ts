import { isSignatureToken } from "@/lib/signature";
import { automationClient } from "@/lib/automation/deps";

export const dynamic = "force-dynamic";

/** Le document de la demande (?signe=1 : version signée). Le lien secret fait office d'accès ; rien n'est indexé. */
export async function GET(req: Request, { params }: { params: { token: string } }) {
  if (!isSignatureToken(params.token)) return new Response("Introuvable", { status: 404 });
  const signed = new URL(req.url).searchParams.get("signe") === "1";
  const { data } = await automationClient().rpc("signature_pdf", { p_token: params.token, p_signed: signed });
  if (typeof data !== "string") return new Response("Document indisponible", { status: 404 });
  return new Response(new Uint8Array(Buffer.from(data, "base64")), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="document${signed ? "-signe" : ""}.pdf"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}
