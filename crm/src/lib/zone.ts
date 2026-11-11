/** Géolocalisation : distance à vol d'oiseau et recherche d'adresse dans la Base Adresse Nationale (gratuite, sans clé). Rien n'est inventé : pas trouvé = null. */
export type Point = { lat: number; lng: number };

export function haversineKm(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Position dans la France métropolitaine (garde-fou contre une réponse absurde). */
export const inFrance = (p: Point) => p.lat >= 41 && p.lat <= 52 && p.lng >= -6 && p.lng <= 10;

/** Cherche une adresse (rue + code postal + ville) ; à défaut de la rue, le centre de la commune. */
export async function geocode(o: { address?: string | null; postal_code?: string | null; city?: string | null }): Promise<Point | null> {
  const postal = (o.postal_code ?? "").replace(/\s/g, "");
  if (!/^\d{5}$/.test(postal)) return null;
  const tries: { q: string; type?: string }[] = [];
  const street = (o.address ?? "").trim();
  if (street) tries.push({ q: `${street} ${postal} ${o.city ?? ""}`.trim() });
  tries.push({ q: `${o.city ?? postal}`, type: "municipality" });
  for (const t of tries) {
    try {
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(t.q)}&postcode=${postal}&limit=1${t.type ? `&type=${t.type}` : ""}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store", headers: { accept: "application/json" } });
      if (!res.ok) continue;
      const f = ((await res.json()) as any)?.features?.[0];
      const [lng, lat] = f?.geometry?.coordinates ?? [];
      const score = Number(f?.properties?.score ?? 0);
      if (typeof lat === "number" && typeof lng === "number" && score >= (t.type ? 0.3 : 0.5) && inFrance({ lat, lng })) return { lat, lng };
    } catch { /* on essaie la suite */ }
  }
  return null;
}
