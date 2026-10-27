import { createAdmin } from "@/lib/supabase/server";
import { syncQonto } from "@/lib/qonto";

export const dynamic = "force-dynamic";

/** Appelée par le cron Vercel (Authorization: Bearer CRON_SECRET). Le bouton de l'interface passe par une action serveur. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  try {
    return Response.json(await syncQonto(createAdmin()));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
