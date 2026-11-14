import { apiError, apiFail, apiKey, partnerDb } from "@/lib/partner-api";

export const dynamic = "force-dynamic";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * POST /api/partenaire/reservations — envoyer, modifier ou annuler une réservation d'un logement.
 * Corps JSON : { "logement": "<id>", "reference": "ABC123", "arrivee": "2026-12-01", "depart": "2026-12-05", "annulee": false }
 * Le ménage du jour du départ est créé, déplacé ou annulé, exactement comme avec un calendrier relié.
 */
export async function POST(req: Request) {
  const key = apiKey(req);
  if (!key) return apiError("Clé d'API manquante ou mal formée (en-tête Authorization: Bearer pk_…).", 401);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return apiError("Corps JSON attendu.", 400);
  const listing = String(b.logement ?? ""), uid = String(b.reference ?? ""), a = String(b.arrivee ?? ""), d = String(b.depart ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(listing)) return apiError("« logement » : identifiant du logement attendu (voir GET /api/partenaire/menages).", 422);
  if (!DATE.test(a) || !DATE.test(d)) return apiError("« arrivee » et « depart » : dates au format AAAA-MM-JJ.", 422);
  const { data, error } = await partnerDb().rpc("partner_push_stay", { p_secret: key, p_listing: listing, p_uid: uid, p_check_in: a, p_check_out: d, p_cancelled: b.annulee === true });
  if (error) return apiFail(error.message);
  const r = (data ?? {}) as { created?: number; moved?: number; cancelled?: number };
  return Response.json({ ok: true, menages_crees: r.created ?? 0, menages_deplaces: r.moved ?? 0, menages_annules: r.cancelled ?? 0 });
}
