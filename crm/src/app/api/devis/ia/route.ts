import { NextResponse } from "next/server";
import { estimateQuote } from "@/lib/ai-advisor";
import { aiConfigured } from "@/lib/ai-inspect";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Estimation d'un site par l'IA à partir de photos (accès réservé au patron par le middleware). Si un client est choisi, l'analyse est gardée dans sa fiche en note. */
export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  const notes = String(fd?.get("notes") ?? ""), client = String(fd?.get("client") ?? "");
  const files = (fd?.getAll("file") ?? []).filter((f): f is File => f instanceof File).slice(0, 8);
  if (!files.length) return NextResponse.json({ error: "Ajoutez au moins une photo du site." }, { status: 400 });
  if (files.some((f) => !TYPES.has(f.type) || f.size > 1_500_000)) return NextResponse.json({ error: "Photo non acceptée (JPEG, PNG ou WebP, 1,5 Mo maximum)." }, { status: 415 });
  if (!aiConfigured()) return NextResponse.json({ error: "L'IA n'est pas configurée sur le serveur." }, { status: 503 });
  const images = await Promise.all(files.map(async (f) => ({ content_type: f.type, b64: Buffer.from(await f.arrayBuffer()).toString("base64") })));
  const r = await estimateQuote(images, notes);
  if (!r.estimate) return NextResponse.json({ error: `Analyse indisponible : ${r.error}` }, { status: 502 });
  if (/^[0-9a-f-]{36}$/.test(client)) {
    const e = r.estimate;
    await createClient().from("interactions").insert({ client_id: client, kind: "note", summary: ["Estimation IA du site (photos)", e.summary, e.area_m2 ? `Surface estimée : ${e.area_m2} m²` : "", e.hours_per_visit ? `Temps par passage : ${e.hours_per_visit} h × ${e.agents ?? 1} agent(s) — ${e.frequency}` : "", ...e.zones.map((z) => `• ${z.zone} : ${z.tasks}`), e.products.length ? `Produits : ${e.products.map((p) => `${p.name} (${p.qty})`).join(", ")}` : "", e.questions.length ? `À demander au client : ${e.questions.join(" ; ")}` : ""].filter(Boolean).join("\n") });
  }
  return NextResponse.json({ estimate: r.estimate });
}
