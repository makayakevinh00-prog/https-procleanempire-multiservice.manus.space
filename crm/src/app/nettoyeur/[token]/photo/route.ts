import { agentClient, isToken } from "@/lib/agent";

export const runtime = "nodejs";

/** Photo de profil du nettoyeur, servie comme une image (mise en cache par le téléphone) au lieu d'être recopiée dans chaque page. */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  if (!isToken(params.token)) return new Response(null, { status: 404 });
  const { data, error } = await agentClient().rpc("cleaner_avatar", { p_token: params.token });
  if (error || !data) return new Response(null, { status: 404, headers: { "cache-control": "private, max-age=60" } });
  return new Response(Buffer.from(String(data), "base64"), { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=600", "x-robots-tag": "noindex", "referrer-policy": "no-referrer" } });
}
