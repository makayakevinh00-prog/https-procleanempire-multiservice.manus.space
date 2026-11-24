import { NextResponse } from "next/server";
import { agentClient, agentMessage, isToken } from "@/lib/agent";
import { runStockCount } from "@/lib/marketplace/stock";

export const runtime = "nodejs";
export const maxDuration = 60;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Film du stock de produits, image par image (espace « agent » ou « nettoyeur », lien privé vérifié par la base).
 * À la dernière image (sans « defer »), l'IA fait l'inventaire et la prévision ; les images sont ensuite effacées.
 */
export async function POST(req: Request, { params }: { params: { space: string } }) {
  const space = params.space === "agent" ? "agent" : params.space === "nettoyeur" ? "nettoyeur" : null;
  const fd = await req.formData().catch(() => null);
  const token = String(fd?.get("token") ?? ""), ref = String(fd?.get("job") ?? ""), file = fd?.get("file");
  if (!space || !isToken(token) || !/^[0-9a-f-]{36}$/.test(ref) || !(file instanceof File)) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  if (!TYPES.has(file.type) || file.size > 1_500_000) return NextResponse.json({ error: "Image non acceptée." }, { status: 415 });
  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const { data, error } = await agentClient().rpc("stock_add_frame", { p_space: space, p_token: token, p_ref: ref, p_content_type: file.type, p_data_b64: b64, p_first: fd?.get("index") === "0" });
  if (error) return NextResponse.json({ error: agentMessage(error.message) }, { status: /ACCES_REFUSE/.test(error.message) ? 403 : 422 });
  if (fd?.get("defer") === "1") return NextResponse.json({ ok: true });
  const scope = data as { kind: "site" | "staff" | "cleaner"; id: string; by: string };
  let out: Awaited<ReturnType<typeof runStockCount>>;
  try { out = await runStockCount(scope); } catch (e) { out = { result: null, error: `erreur interne : ${(e as Error).message}` }; }
  if (out.error) { console.error("[stock] inventaire impossible :", out.error); return NextResponse.json({ error: `L'IA n'a pas pu compter le stock : ${out.error}.` }, { status: 422 }); }
  return NextResponse.json({ ok: true });
}
