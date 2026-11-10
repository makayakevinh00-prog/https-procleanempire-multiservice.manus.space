import { realDeps } from "@/lib/automation/deps";
import { runDaily } from "@/lib/automation/run";
import { syncQonto } from "@/lib/qonto";
import { createAdmin } from "@/lib/supabase/server";
import { runConcierge } from "@/lib/concierge/run";
import { parisToday } from "@/lib/domain/dates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tâche quotidienne unique (le plan Vercel gratuit n'autorise qu'un passage par jour) :
 *  - fin de mois : factures du mois (validées seulement si toutes les conditions sont remplies) ;
 *  - envoi des factures émises, relances de factures et de devis, récapitulatif au patron ;
 *  - synchronisation Qonto si la clé service_role est configurée.
 * Paramètres de test (avec le secret) : ?dry=1 (simulation) · ?month=2026-11&force=1 · ?send=1
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const p = new URL(req.url).searchParams;
  const opts = { month: p.get("month") ?? undefined, forceGenerate: p.get("force") === "1", forceSend: p.get("send") === "1", dryRun: p.get("dry") === "1" };

  let automation;
  try {
    automation = await runDaily(realDeps(), opts);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  let qonto: unknown = "non configuré";
  if (!opts.dryRun && process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.QONTO_ACCESS_TOKEN || process.env.QONTO_SECRET_KEY)) {
    try { qonto = await syncQonto(createAdmin()); } catch (e) { qonto = { error: (e as Error).message }; }
  }
  let concierge: unknown = "non configuré";
  if (!opts.dryRun && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try { concierge = await runConcierge(createAdmin(), parisToday()); } catch (e) { concierge = { error: (e as Error).message }; }
  }
  return Response.json({ automation, qonto, concierge });
}
