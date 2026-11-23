import { syncMarketplace } from "@/lib/marketplace/sync";
import { dispatchTick } from "@/lib/marketplace/notify";
import { autoAcceptBookings } from "@/lib/marketplace/auto-accept";
import { chargeValidatedBookings } from "@/lib/marketplace/payments";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Travail de fond de la place de marché (calendriers → ménages, vagues de distribution), hors de l'affichage. Cadencé en base : un appel de trop ne fait rien. */
export async function POST() {
  const sync = await syncMarketplace({ minutes: 30 }).catch(() => null);
  await autoAcceptBookings().catch(() => null); // filet : une réservation simple restée en attente
  const tick = await dispatchTick().catch(() => null);
  await chargeValidatedBookings().catch(() => null); // ménages validés : débit de la carte enregistrée
  return Response.json({ ok: true, synced: sync && !("skipped" in sync), ticked: tick && !("skipped" in tick) });
}
