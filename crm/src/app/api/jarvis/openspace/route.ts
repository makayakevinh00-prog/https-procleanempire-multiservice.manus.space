import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/auth";
import { loadOpenSpaceState } from "@/lib/jarvis/load-openspace";

export const dynamic = "force-dynamic";

/** État de l'open space, actualisé par l'écran toutes les quelques secondes. Réservé au patron (middleware + contrôle explicite). */
export async function GET() {
  if (!(await isOwner())) return new NextResponse("Accès refusé", { status: 403 });
  try {
    const state = await loadOpenSpaceState(createClient());
    return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Lecture impossible" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
