import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/auth";
import { loadKpis } from "@/lib/jarvis/load-kpis";

export const dynamic = "force-dynamic";

/** Indicateurs réels du CRM (lecture seule), actualisés par l'écran. Réservé au patron (middleware + contrôle explicite). */
export async function GET() {
  if (!(await isOwner())) return new NextResponse("Accès refusé", { status: 403 });
  try {
    return NextResponse.json(await loadKpis(createClient()), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Lecture impossible" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
