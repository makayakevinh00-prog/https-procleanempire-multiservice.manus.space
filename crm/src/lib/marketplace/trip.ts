import "server-only";
import { agentClient, isToken } from "@/lib/agent";
import { routeEstimate } from "@/lib/route";

export type TripPing = { tracking: boolean; job: string | null; eta_minutes: number | null };

/**
 * Position d'un nettoyeur (application web ou mobile). Si un ménage est en route, le point de trajet est enregistré
 * et l'heure d'arrivée recalculée au plus toutes les 2 minutes. `tracking: false` = aucun ménage à rejoindre : l'application peut arrêter d'envoyer.
 */
export async function tripPing(token: string, lat: number, lng: number): Promise<TripPing | null> {
  if (!isToken(token) || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const c = agentClient();
  const { data, error } = await c.rpc("cleaner_trip_ping", { p_token: token, p_lat: lat, p_lng: lng });
  if (error) { const old = await c.rpc("cleaner_ping", { p_token: token, p_lat: lat, p_lng: lng }); return old.error ? null : { tracking: false, job: null, eta_minutes: null }; } // base pas encore à jour : simple position
  const t = data as { job: string; dest_lat: number | null; dest_lng: number | null; need_eta: boolean } | null;
  if (!t) return { tracking: false, job: null, eta_minutes: null };
  let eta: number | null = null;
  if (t.need_eta && t.dest_lat != null && t.dest_lng != null) {
    const r = await routeEstimate({ lat, lng }, { lat: t.dest_lat, lng: t.dest_lng });
    await c.rpc("cleaner_set_eta", { p_token: token, p_job: t.job, p_minutes: r.minutes, p_source: r.source });
    eta = r.minutes;
  }
  return { tracking: true, job: t.job, eta_minutes: eta };
}
