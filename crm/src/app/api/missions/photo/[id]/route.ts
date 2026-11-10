import { NextResponse } from "next/server";
import { canRead } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Photo de mission : réservée au patron connecté (la session et la RLS décident). Jamais d'URL publique. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await canRead("missions"))) return new NextResponse("Accès refusé", { status: 403 });
  if (!/^[0-9a-f-]{36}$/.test(params.id)) return new NextResponse("Introuvable", { status: 404 });
  const { data } = await createClient().from("mission_photos").select("data, content_type").eq("id", params.id).maybeSingle();
  if (!data) return new NextResponse("Introuvable", { status: 404 });
  const hex = String(data.data);
  const bytes = Buffer.from(hex.startsWith("\\x") ? hex.slice(2) : hex, "hex");
  return new NextResponse(bytes, { headers: { "Content-Type": data.content_type, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
}
