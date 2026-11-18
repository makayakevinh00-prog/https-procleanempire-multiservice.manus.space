import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Voix par défaut : grave, calme, posée (voix « majordome » de la bibliothèque ElevenLabs). Modifiable avec ELEVENLABS_VOICE_ID.
const DEFAULT_VOICE = "onwK4e9ZLuTAKqWW03F9";

/** Voix de Jarvis : le texte part vers ElevenLabs et revient en audio. Accès réservé au patron (middleware). Sans clé, le navigateur lit avec sa propre voix. */
export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "voix_non_configuree" }, { status: 503 });
  const j = (await req.json().catch(() => null)) as { text?: string } | null;
  const text = String(j?.text ?? "").replace(/\s+/g, " ").trim().slice(0, 900);
  if (text.length < 2) return NextResponse.json({ error: "texte_vide" }, { status: 400 });
  const voice = process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE;
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_96`, {
      method: "POST", signal: AbortSignal.timeout(25_000),
      headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true } })
    });
    if (!res.ok) return NextResponse.json({ error: "voix_indisponible", status: res.status }, { status: 502 });
    return new Response(res.body, { headers: { "content-type": "audio/mpeg", "cache-control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "voix_injoignable" }, { status: 502 });
  }
}
