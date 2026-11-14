import { apiError, apiFail, apiKey, partnerDb } from "@/lib/partner-api";

export const dynamic = "force-dynamic";

/** GET /api/partenaire/menages — les logements de la conciergerie (avec leur identifiant) et ses ménages récents et à venir. */
export async function GET(req: Request) {
  const key = apiKey(req);
  if (!key) return apiError("Clé d'API manquante ou mal formée (en-tête Authorization: Bearer pk_…).", 401);
  const { data, error } = await partnerDb().rpc("partner_overview", { p_secret: key });
  if (error) return apiFail(error.message);
  const o = data as { name: string; listings: any[]; jobs: any[] };
  return Response.json({
    conciergerie: o.name,
    logements: o.listings.map((l) => ({ id: l.id, nom: l.name, ville: l.city, calendrier_relie: l.has_ical, tarif_menage_ht: l.price, linge_propre: l.linen_clean, linge_sale: l.linen_dirty, prochain_depart: l.next_checkout })),
    menages: o.jobs.map((j) => ({ id: j.id, titre: j.title, date: j.date, statut: j.status, nettoyeur: j.cleaner, sur_place: j.arrived, controle: j.ai_status, resume_controle: j.summary }))
  });
}
