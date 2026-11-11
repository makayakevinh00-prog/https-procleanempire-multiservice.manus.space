/** Application nettoyeur : textes et formats purs (aucun accès base). */
export const JOB_STATUS: Record<string, string> = { ouverte: "Disponible", acceptee: "À faire", a_verifier: "Envoyé à la direction", a_reprendre: "À reprendre", validee: "Validé", annulee: "Annulé" };
export const hhmm = (t: string | null | undefined) => (t ?? "").slice(0, 5);
export const eur = (n: number | string | null | undefined) => { const v = Number(n ?? 0); return `${v.toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })} €`; };
export const dayFr = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).replace(/^./, (c) => c.toUpperCase());
export const slot = (a: string, b: string) => `${hhmm(a).replace(":00", "h").replace(":", "h")} – ${hhmm(b).replace(":00", "h").replace(":", "h")}`;

/** Départements saisis librement (« 95, 78 ») → liste propre, sans doublon, formats valides seulement. */
export function parseDepartments(raw: string): string[] {
  return [...new Set(raw.split(/[,;\s]+/).map((d) => d.trim().toUpperCase()).filter((d) => /^(\d{2,3}|2[AB])$/.test(d)))].sort();
}

/** Contrôle de clé d'un IBAN (norme ISO 13616, modulo 97) : évite une faute de frappe avant de virer. */
export function ibanValid(raw: string): boolean {
  const s = raw.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s) || s.length > 34) return false;
  const moved = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of moved) { const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55); for (const d of v) rem = (rem * 10 + Number(d)) % 97; }
  return rem === 1;
}
export const maskIban = (raw: string) => `•••• ${raw.replace(/\s/g, "").slice(-4)}`;

/** Parts d'une prestation, arrondies au centime ; la logistique absorbe l'arrondi pour que le total soit exact. */
export function splitPrice(priceHt: number, cleanerPct: number, platformPct: number) {
  const cleaner = Math.round(priceHt * cleanerPct) / 100, platform = Math.round(priceHt * platformPct) / 100;
  return { cleaner, platform, logistics: Math.round((priceHt - cleaner - platform) * 100) / 100 };
}
export const pctsValid = (c: number, p: number, l: number) => c >= 50 && c <= 90 && p >= 0 && l >= 0 && Math.abs(c + p + l - 100) < 0.005;
