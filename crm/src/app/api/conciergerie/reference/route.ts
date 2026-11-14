import { NextResponse } from "next/server";
import { isOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Ajoute une photo de référence à un logement (patron seulement ; la base revérifie). */
export async function POST(req: Request) {
  if (!(await isOwner())) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const fd = await req.formData().catch(() => null);
  const listing = String(fd?.get("listing") ?? ""), file = fd?.get("file");
  if (!/^[0-9a-f-]{36}$/i.test(listing) || !(file instanceof File)) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  if (!TYPES.has(file.type)) return NextResponse.json({ error: "Format non accepté (JPEG, PNG ou WebP)." }, { status: 415 });
  if (file.size > 1_500_000) return NextResponse.json({ error: "Photo trop lourde (1,5 Mo maximum)." }, { status: 413 });
  const { error } = await createClient().rpc("listing_ref_add_photo", { p_listing: listing, p_content_type: file.type, p_data_b64: Buffer.from(await file.arrayBuffer()).toString("base64") });
  if (error) return NextResponse.json({ error: error.message.replace(/^ARGUMENT:\s*/, "") }, { status: 422 });
  return NextResponse.json({ ok: true });
}
