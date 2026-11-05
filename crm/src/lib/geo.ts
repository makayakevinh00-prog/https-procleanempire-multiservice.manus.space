/** Géocodage d'une adresse française (API publique Adresse, data.gouv.fr). Retourne null si l'adresse n'est pas trouvée. */
export async function geocodeAddress(address: string | null, postal: string | null, city: string | null): Promise<{ lat: number; lng: number; score: number } | null> {
  const q = [address, postal, city].filter(Boolean).join(" ").trim();
  if (q.length < 5) return null;
  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?limit=1&q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return null;
    const f = (await res.json()).features?.[0];
    if (!f || (f.properties?.score ?? 0) < 0.5) return null;
    const [lng, lat] = f.geometry.coordinates;
    return { lat, lng, score: f.properties.score };
  } catch { return null; }
}

/** Texte lisible de l'état d'une mission du jour pour la vue « Sur place ». */
export type PresenceState = "sur_place" | "attendu" | "en_retard" | "termine" | "non_pointe";
