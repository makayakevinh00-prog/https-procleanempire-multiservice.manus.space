import { NextResponse } from "next/server";
import { checkStorage, deliveryConfigured } from "@/lib/server/lead-delivery";

export const dynamic = "force-dynamic";

/** Diagnostic du formulaire de devis (n'affiche aucun secret) : ouvrir /api/quote/health. */
export async function GET() {
  const config = deliveryConfigured();
  return NextResponse.json(
    {
      formulaire:
        config.storage || config.email
          ? "devis → sauvegarde + e-mail à contact@procleanempire.com"
          : "devis → transmission directe par le visiteur (e-mail pré-rempli ou WhatsApp) : aucune variable configurée",
      sauvegarde: await checkStorage(),
      emailInterne: config.email ? "configuré (RESEND_API_KEY)" : "non configuré",
      accuseClient: config.clientEmail ? "configuré (RESEND_FROM)" : "non configuré",
      environnement: process.env.VERCEL_ENV ?? "local"
    },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } }
  );
}
