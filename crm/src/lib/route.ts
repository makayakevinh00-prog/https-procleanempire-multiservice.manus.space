import "server-only";

export type Point = { lat: number; lng: number };
export type RouteEstimate = { minutes: number; km: number; source: "trafic" | "route" | "distance" | "transports" };
export type TravelMode = "voiture" | "transports";

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
/** Distance à vol d'oiseau, en km. */
export function crowKm(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Estimation sans service de calcul d'itinéraire : détour de 40 % et 28 km/h de moyenne en Île-de-France, 5 minutes pour se garer. */
export function roughEstimate(a: Point, b: Point): RouteEstimate {
  const km = crowKm(a, b) * 1.4;
  return { minutes: Math.max(2, Math.round((km / 28) * 60 + 5)), km: Math.round(km * 10) / 10, source: "distance" };
}

/** En transports en commun : pas de calcul d'horaires ici, une estimation prudente (22 km/h porte à porte, 10 minutes de marche et d'attente). L'horaire exact est dans Plans. */
export function transitEstimate(a: Point, b: Point): RouteEstimate {
  const km = crowKm(a, b) * 1.3;
  return { minutes: Math.max(5, Math.round((km / 22) * 60 + 10)), km: Math.round(km * 10) / 10, source: "transports" };
}

const get = async (url: string) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};

/**
 * Temps de trajet en voiture entre deux points.
 * Avec TOMTOM_API_KEY : durée réelle selon le trafic du moment. Sans clé : itinéraire routier sans trafic (OSRM), majoré aux heures de pointe.
 * Si aucun service ne répond : estimation à la distance.
 */
export async function routeEstimate(from: Point, to: Point, now = new Date(), mode: TravelMode = "voiture"): Promise<RouteEstimate> {
  if (mode === "transports") return transitEstimate(from, to);
  const key = process.env.TOMTOM_API_KEY;
  if (key) {
    const loc = `${from.lat},${from.lng}:${to.lat},${to.lng}`, k = encodeURIComponent(key);
    // Deux générations d'API chez TomTom : selon le compte, la clé ouvre l'une ou l'autre. Les deux tiennent compte du trafic en direct.
    for (const url of [`https://api.tomtom.com/maps/orbis/routing/calculateRoute/${loc}/json?apiVersion=2&key=${k}`, `https://api.tomtom.com/routing/1/calculateRoute/${loc}/json?traffic=true&travelMode=car&key=${k}`]) {
      try {
        const sum = (await get(url))?.routes?.[0]?.summary;
        if (sum?.travelTimeInSeconds) return { minutes: Math.max(1, Math.round(sum.travelTimeInSeconds / 60)), km: Math.round((sum.lengthInMeters ?? 0) / 100) / 10, source: "trafic" };
      } catch { /* on tente l'autre adresse, puis l'itinéraire sans trafic */ }
    }
  }
  try {
    const d = await get(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`);
    const r = d?.routes?.[0];
    if (r?.duration) {
      const h = Number(new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }).format(now));
      const peak = (h >= 7 && h < 10) || (h >= 16 && h < 20) ? 1.35 : 1.1;
      return { minutes: Math.max(1, Math.round((r.duration / 60) * peak + 3)), km: Math.round(r.distance / 100) / 10, source: "route" };
    }
  } catch { /* estimation à la distance */ }
  return roughEstimate(from, to);
}
