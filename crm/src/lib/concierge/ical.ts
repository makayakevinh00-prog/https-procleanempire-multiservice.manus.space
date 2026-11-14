export type Platform = "airbnb" | "booking" | "abritel" | "autre";
export const PLATFORMS: Record<Platform, string> = {
  airbnb: "Airbnb",
  booking: "Booking",
  abritel: "Abritel / Vrbo",
  autre: "Autre (iCal)",
};

export type IcalEvent = {
  uid: string;
  checkIn: string;
  checkOut: string;
  summary: string;
};

const toDate = (v: string): string | null => {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(v.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

/**
 * Lit un calendrier iCal (.ics) : un séjour = un VEVENT (arrivée = DTSTART, départ = DTEND).
 * Seules les dates et un libellé court sont gardés : jamais le nom d'un voyageur, un téléphone ni une description.
 * Les blocages manuels d'Airbnb (« Not available ») ne sont pas des séjours ; Booking et Abritel ne permettent pas de les distinguer toujours.
 */
export function parseIcal(
  text: string,
  platform: Platform = "autre",
): IcalEvent[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
  const out: IcalEvent[] = [];
  let cur: Record<string, string> | null = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) {
        const checkIn = toDate(cur.DTSTART ?? ""),
          checkOut = toDate(cur.DTEND ?? cur.DTSTART ?? "");
        const summary = (cur.SUMMARY ?? "").slice(0, 80);
        const blocked =
          platform === "airbnb"
            ? /not available/i.test(summary)
            : platform === "abritel"
              ? /blocked|bloqu/i.test(summary)
              : false;
        const cancelled = /^CANCELLED$/i.test(cur.STATUS ?? "");
        if (
          cur.UID &&
          checkIn &&
          checkOut &&
          checkOut >= checkIn &&
          !blocked &&
          !cancelled
        )
          out.push({
            uid: cur.UID.slice(0, 200),
            checkIn,
            checkOut,
            summary: summary.replace(/[^\p{L}\p{N} ()\-_.,]/gu, "").trim(),
          });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const i = line.indexOf(":");
    if (i < 1) continue;
    const name = line.slice(0, i).split(";")[0].toUpperCase();
    if (["UID", "DTSTART", "DTEND", "SUMMARY", "STATUS"].includes(name))
      cur[name] = line.slice(i + 1);
  }
  return out;
}

/** Hôtes autorisés pour un lien calendrier : plateformes de réservation et logiciels de gestion connus (https uniquement). */
const HOSTS = [
  /(^|\.)airbnb\.(com|fr|de|es|it|nl|pt|be|ch|at|ie|ca|pl|se|dk|no|fi|gr|cz|co\.uk|com\.au)$/,
  /(^|\.)booking\.com$/,
  /(^|\.)vrbo\.com$/,
  /(^|\.)abritel\.fr$/,
  /(^|\.)homeaway\.(com|fr|de|es|it|nl|pt|be|ch|at|ie|ca|pl|se|dk|no|fi|gr|cz|co\.uk|com\.au)$/,
  /^calendar\.google\.com$/,
  /(^|\.)lodgify\.com$/,
  /(^|\.)smoobu\.com$/,
  /(^|\.)hospitable\.com$/,
  /(^|\.)beds24\.com$/,
  /(^|\.)guesty\.com$/,
  /(^|\.)superhote\.com$/,
];

/** Un lien calendrier sûr à télécharger depuis le serveur : https, sans identifiants, sans port ni adresse IP, hôte reconnu. */
export function checkIcalUrl(
  raw: string,
): { ok: true; url: string } | { ok: false; reason: string } {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "Ce lien n'est pas une adresse valide." };
  }
  if (u.protocol !== "https:")
    return { ok: false, reason: "Le lien doit commencer par https://." };
  if (u.username || u.password)
    return {
      ok: false,
      reason: "Le lien ne doit pas contenir d'identifiants.",
    };
  if (u.port && u.port !== "443")
    return { ok: false, reason: "Le lien ne doit pas préciser de port." };
  const h = u.hostname.toLowerCase();
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(":") || h === "localhost")
    return { ok: false, reason: "Une adresse IP n'est pas acceptée." };
  if (!HOSTS.some((r) => r.test(h)))
    return {
      ok: false,
      reason:
        "Ce site n'est pas une plateforme reconnue (Airbnb, Booking, Abritel/Vrbo, Google Agenda ou un logiciel de gestion courant).",
    };
  return { ok: true, url: u.toString() };
}
