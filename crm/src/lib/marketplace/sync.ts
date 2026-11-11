import { addDays, parisToday } from "@/lib/domain/dates";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { fetchIcal } from "@/lib/concierge/run";
import { parseIcal, type Platform } from "@/lib/concierge/ical";
import { geocode } from "@/lib/zone";

/**
 * Chaîne automatique des ménages : calendriers Airbnb/Booking lus → séjours et ménages créés → ménages localisés → publiés aux nettoyeurs.
 * Tout passe par le secret d'automatisation (aucune clé service_role). Au plus une exécution complète toutes les `minutes` minutes (sauf `force`).
 */
export async function syncMarketplace(o: { minutes?: number; force?: boolean } = {}) {
  const a = automationClient(), secret = automationSecret(), today = parisToday();
  if (!o.force) {
    const { data } = await a.rpc("automation_claim_sync", { p_secret: secret, p_minutes: o.minutes ?? 30 });
    if (data !== true) return { skipped: true as const };
  }
  const out = { listings: 0, created: 0, moved: 0, cancelled: 0, errors: 0, geocoded: 0, published: 0 };
  const ls = await a.rpc("automation_concierge_listings", { p_secret: secret });
  for (const l of ((ls.data ?? []) as { id: string; ical_url: string; platform: Platform }[])) {
    out.listings++;
    try {
      const events = parseIcal(await fetchIcal(l.ical_url), l.platform).filter((e) => e.checkOut >= addDays(today, -60));
      const r = await a.rpc("automation_concierge_apply", { p_secret: secret, p_listing: l.id, p_events: events });
      if (r.error) throw new Error(r.error.message);
      const d = r.data as { created?: number; moved?: number; cancelled?: number };
      out.created += d.created ?? 0; out.moved += d.moved ?? 0; out.cancelled += d.cancelled ?? 0;
    } catch (e) {
      out.errors++;
      await a.rpc("automation_listing_sync_error", { p_secret: secret, p_listing: l.id, p_error: (e as Error).message });
    }
  }
  const pub = await a.rpc("automation_publish_cleaning_jobs", { p_secret: secret });
  out.published = Number(pub.data ?? 0);
  const todo = await a.rpc("automation_jobs_to_geocode", { p_secret: secret });
  for (const j of ((todo.data ?? []) as { id: string; address: string | null; postal_code: string; city: string | null }[])) {
    const p = await geocode({ address: j.address, postal_code: j.postal_code, city: j.city });
    if (p) { await a.rpc("automation_set_job_geo", { p_secret: secret, p_job: j.id, p_lat: p.lat, p_lng: p.lng }); out.geocoded++; }
  }
  return out;
}
