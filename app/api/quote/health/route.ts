import { NextResponse } from "next/server";
import { checkAxonaut } from "@/lib/server/axonaut";

export const dynamic = "force-dynamic";

/** Diagnostic du formulaire de devis (n'affiche aucun secret) : ouvrir /api/quote/health. */
export async function GET() {
  const result = await checkAxonaut();
  return NextResponse.json(
    { formulaire: "devis → Axonaut", ...result, environnement: process.env.VERCEL_ENV ?? "local" },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } }
  );
}
