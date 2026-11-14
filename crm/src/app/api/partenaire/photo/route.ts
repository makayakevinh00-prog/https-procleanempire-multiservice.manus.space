import { NextResponse } from "next/server";
import { agentClient, agentMessage, isToken } from "@/lib/agent";

export const runtime = "nodejs";
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Photo de référence d'un logement, envoyée par la conciergerie depuis son espace (la base revérifie que le logement est le sien). */
export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  const token = String(fd?.get("token") ?? ""), listing = String(fd?.get("listing") ?? ""), file = fd?.get("file");
  if (!isToken(token) || !/^[0-9a-f-]{36}$/i.test(listing) || !(file instanceof File)) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  if (!TYPES.has(file.type)) return NextResponse.json({ error: "Format non accepté (JPEG, PNG ou WebP)." }, { status: 415 });
  if (file.size > 1_500_000) return NextResponse.json({ error: "Photo trop lourde (1,5 Mo maximum)." }, { status: 413 });
  const { error } = await agentClient().rpc("partner_ref_add_photo", { p_secret: token, p_listing: listing, p_content_type: file.type, p_data_b64: Buffer.from(await file.arrayBuffer()).toString("base64") });
  if (error) return NextResponse.json({ error: agentMessage(error.message) }, { status: /ACCES_REFUSE/.test(error.message) ? 403 : 422 });
  return NextResponse.json({ ok: true });
}
