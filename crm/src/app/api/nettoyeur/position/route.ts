import { isToken } from "@/lib/agent";
import { tripPing } from "@/lib/marketplace/trip";

export const dynamic = "force-dynamic";

/**
 * Position envoyée par l'application mobile, y compris en arrière-plan (téléphone verrouillé).
 * En-tête « Authorization: Bearer <lien personnel du nettoyeur> », corps JSON { lat, lng }.
 * Réponse : { ok, tracking, eta_minutes }. `tracking: false` = aucun ménage à rejoindre, l'application peut arrêter le suivi.
 */
export async function POST(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!isToken(token)) return Response.json({ ok: false, error: "Lien personnel invalide." }, { status: 401 });
  let body: { lat?: unknown; lng?: unknown };
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "Corps JSON attendu : { lat, lng }." }, { status: 400 }); }
  const lat = Number(body.lat), lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Response.json({ ok: false, error: "Position invalide." }, { status: 400 });
  const r = await tripPing(token, lat, lng);
  if (!r) return Response.json({ ok: false, error: "Position refusée (lien invalide ou hors de France)." }, { status: 400 });
  return Response.json({ ok: true, tracking: r.tracking, eta_minutes: r.eta_minutes });
}
