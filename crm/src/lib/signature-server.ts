import "server-only";
import { createClient } from "@/lib/supabase/server";
import { buildPdf } from "@/lib/pdf/load";
import { buildContractPdf } from "@/lib/pdf/contract-load";
import { SIGNATURE_VALID_DAYS, newSignatureToken, sha256Hex } from "@/lib/signature";

export const SITE = "https://proclean-crm.vercel.app";

/** Prépare une demande de signature : PDF figé + empreinte + lien secret valable 30 jours. Les demandes en attente du même document sont annulées. Le mail est envoyé par l'appelant. */
export async function createSignatureRequest(kind: "devis" | "contrat", id: string, to: string, contractType?: string | null): Promise<{ url: string; number: string; bytes: Uint8Array; filename: string; title: string | null } | { error: string }> {
  const sb = createClient();
  let bytes: Uint8Array, filename: string, number: string, title: string | null, clientId: string | null;
  if (kind === "devis") {
    const { data: q } = await sb.from("quotes").select("number, subject, client_id").eq("id", id).maybeSingle();
    const p = q ? await buildPdf("devis", id, { sent: true }) : null;
    if (!q || !p) return { error: "Devis introuvable." };
    bytes = p.bytes; filename = p.filename; number = q.number; title = q.subject ?? null; clientId = q.client_id;
  } else {
    const p = await buildContractPdf(id, contractType);
    if (!p) return { error: "Contrat introuvable." };
    bytes = p.bytes; filename = p.filename; number = p.ref; title = p.label; clientId = p.clientId;
  }
  const col = kind === "devis" ? "quote_id" : "contract_id";
  await sb.from("signature_requests").update({ status: "annule" }).eq(col, id).eq("status", "en_attente");
  const token = newSignatureToken();
  const { error } = await sb.from("signature_requests").insert({
    token, kind, [col]: id, client_id: clientId, doc_number: number, doc_title: title, signer_email: to,
    pdf_b64: Buffer.from(bytes).toString("base64"), doc_hash: sha256Hex(bytes), expires_at: new Date(Date.now() + SIGNATURE_VALID_DAYS * 864e5).toISOString()
  });
  if (error) return { error: error.message };
  return { url: `${SITE}/signer/${token}`, number, bytes, filename, title };
}

