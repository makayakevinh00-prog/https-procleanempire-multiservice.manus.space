import { isOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Photo d'un ménage, pour le patron seulement (jamais publique). */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!(await isOwner())) return new Response("Accès refusé", { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response("Identifiant invalide", { status: 400 });
  const { data } = await createClient().from("cleaning_job_photos").select("content_type, data").eq("id", params.id).maybeSingle();
  if (!data) return new Response("Introuvable", { status: 404 });
  const raw = (data as any).data as string;                              // bytea renvoyé par PostgREST au format « \x… »
  const bytes = Buffer.from(raw.startsWith("\\x") ? raw.slice(2) : raw, raw.startsWith("\\x") ? "hex" : "base64");
  return new Response(bytes, { headers: { "content-type": (data as any).content_type, "cache-control": "private, no-store" } });
}
