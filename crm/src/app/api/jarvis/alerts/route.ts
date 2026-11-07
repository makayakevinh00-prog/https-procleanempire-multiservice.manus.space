import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/auth";
import { loadAlerts } from "@/lib/jarvis/load-alerts";

export const dynamic = "force-dynamic";

/** Résumé des alertes (ouvertes, prioritaires, par agent) pour les écrans des locaux. Réservé au patron. Lecture seule. */
export async function GET() {
  if (!(await isOwner()))
    return new NextResponse("Accès refusé", { status: 403 });
  try {
    const v = await loadAlerts(createClient());
    return NextResponse.json(
      { computedAt: v.computedAt, summary: v.summary, errors: v.errors },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Lecture impossible" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
