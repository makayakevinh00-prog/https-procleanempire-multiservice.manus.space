import { syncMarketplace } from "@/lib/marketplace/sync";
import { dispatchTick } from "@/lib/marketplace/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Travail de fond de la place de marché (calendriers → ménages, vagues de distribution), hors de l'affichage. Cadencé en base : un appel de trop ne fait rien. */
export async function POST() {
  const sync = await syncMarketplace({ minutes: 30 }).catch(() => null);
  const tick = await dispatchTick().catch(() => null);
  return Response.json({ ok: true, synced: sync && !("skipped" in sync), ticked: tick && !("skipped" in tick) });
}
