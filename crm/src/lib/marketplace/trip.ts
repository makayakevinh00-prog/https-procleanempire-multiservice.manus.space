import "server-only";
import { agentClient, isToken } from "@/lib/agent";
import { routeEstimate, type TravelMode } from "@/lib/route";

export type TripPing = { tracking: boolean; job: string | null; eta_minutes: number | null; dist_m?: number | null };

/**
 * Position d'un nettoyeur (application web ou mobile). Si un ménage est en route, le point de trajet est enregistré
 * et l'heure d'arrivée recalculée au plus toutes les 2 minutes. `tracking: false` = aucun ménage à rejoindre : l'application peut arrêter d'envoyer.
 */
export async function tripPing(token: string, lat: number, lng: number, mode: TravelMode = "voiture"): Promise<TripPing | null> {
  if (!isToken(token) || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const c = agentClient();
  const { data, error } = await c.rpc("cleaner_trip_ping", { p_token: token, p_lat: lat, p_lng: lng });
  if (error) { const old = await c.rpc("cleaner_ping", { p_token: token, p_lat: lat, p_lng: lng }); return old.error ? null : { tracking: false, job: null, eta_minutes: null }; } // base pas encore à jour : simple position
  const t = data as { job: string; dest_lat: number | null; dest_lng: number | null; need_eta: boolean } | null;
  if (!t) return { tracking: false, job: null, eta_minutes: null };
  let eta: number | null = null;
  if (t.need_eta && t.dest_lat != null && t.dest_lng != null) {
    const r = await routeEstimate({ lat, lng }, { lat: t.dest_lat, lng: t.dest_lng }, new Date(), mode);
    await c.rpc("cleaner_set_eta", { p_token: token, p_job: t.job, p_minutes: r.minutes, p_source: r.source });
    eta = r.minutes;
  }
  // Distance à vol d'oiseau jusqu'au logement : sert à détecter l'arrivée sur place.
  let dist: number | null = null;
  if (t.dest_lat != null && t.dest_lng != null) {
    const rad = Math.PI / 180, dLat = (t.dest_lat - lat) * rad, dLng = (t.dest_lng - lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat * rad) * Math.cos(t.dest_lat * rad) * Math.sin(dLng / 2) ** 2;
    dist = Math.round(2 * 6371000 * Math.asin(Math.sqrt(h)));
  }
  return { tracking: true, job: t.job, eta_minutes: eta, dist_m: dist };
}

/**
 * Position d'un agent ProClean en route vers sa mission : partagée avec la direction (et le client dans son espace) jusqu'à l'arrivée pointée.
 * Sans effet tant que la base ne connaît pas encore le suivi des agents.
 */
export async function agentTripPing(token: string, mission: string, lat: number, lng: number, mode: TravelMode = "voiture"): Promise<void> {
  if (!isToken(token) || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const c = agentClient();
  const { data, error } = await c.rpc("agent_trip_ping", { p_token: token, p_id: mission, p_lat: lat, p_lng: lng });
  const t = data as { dest_lat: number | null; dest_lng: number | null; need_eta: boolean } | null;
  if (error || !t || !t.need_eta || t.dest_lat == null || t.dest_lng == null) return;
  const r = await routeEstimate({ lat, lng }, { lat: t.dest_lat, lng: t.dest_lng }, new Date(), mode);
  await c.rpc("agent_trip_eta", { p_token: token, p_id: mission, p_minutes: r.minutes, p_source: r.source });
}
