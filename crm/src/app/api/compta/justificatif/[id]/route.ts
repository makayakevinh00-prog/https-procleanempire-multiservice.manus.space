import { NextResponse } from "next/server";
import { isOwner, isAccountant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Ouvre le justificatif d'un paiement fournisseur via un lien temporaire (2 minutes). */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!(await isOwner()) && !(await isAccountant())) return new Response("Accès refusé", { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response("Identifiant invalide", { status: 400 });
  const sb = createClient();
  const { data: path } = await sb.rpc("compta_document_path", { p_payment_id: params.id });
  if (!path) return new Response("Aucun justificatif", { status: 404 });
  const { data, error } = await sb.storage.from("justificatifs").createSignedUrl(path as string, 120);
  if (error || !data) return new Response("Justificatif illisible", { status: 500 });
  return NextResponse.redirect(data.signedUrl, 302);
}
