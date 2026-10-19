import { NextResponse } from "next/server";
import { checkAxonaut } from "@/lib/server/axonaut";

export const dynamic = "force-dynamic";

/** Diagnostic du formulaire de devis (n'affiche aucun secret) : ouvrir /api/quote/health. */
export async function GET() {
  if (!process.env.AXONAUT_API_KEY) {
    return NextResponse.json(
      {
        formulaire: "devis → transmission directe par le visiteur (e-mail pré-rempli vers contact@procleanempire.com ou WhatsApp)",
        axonaut: "non utilisé (aucune clé AXONAUT_API_KEY)",
        environnement: process.env.VERCEL_ENV ?? "local"
      },
      { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } }
    );
  }
  const result = await checkAxonaut();
  return NextResponse.json(
    { formulaire: "devis → Axonaut", ...result, environnement: process.env.VERCEL_ENV ?? "local" },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } }
  );
}
