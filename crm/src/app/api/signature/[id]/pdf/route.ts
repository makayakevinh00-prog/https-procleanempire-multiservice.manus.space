import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Document signé d'une demande de signature (accès patron). */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response("Introuvable", { status: 404 });
  const { data } = await createClient().from("signature_requests").select("doc_number, signed_pdf_b64").eq("id", params.id).eq("status", "signe").maybeSingle();
  if (!data?.signed_pdf_b64) return new Response("Document indisponible", { status: 404 });
  return new Response(new Uint8Array(Buffer.from(data.signed_pdf_b64, "base64")), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${data.doc_number}-signe.pdf"`, "Cache-Control": "private, no-store" } });
}
