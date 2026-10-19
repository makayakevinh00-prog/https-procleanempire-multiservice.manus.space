/**
 * Origine du prospect (audit : Google, Meta, Instagram, WhatsApp, accès direct ou autre).
 * Calculée au premier affichage d'une page dans la session, à partir des paramètres utm_*
 * ou du site d'où vient le visiteur. Stockée uniquement dans sessionStorage (pas de cookie).
 */
const KEY = "pce_lead_source";

export type LeadSource = { source: string; landingPage: string; referrer: string };

export function classifySource(utmSource: string | null, referrer: string): string {
  const value = `${utmSource ?? ""} ${referrer}`.toLowerCase();
  if (/instagram/.test(value)) return "Instagram";
  if (/facebook|fb\.|meta|fbclid/.test(value)) return "Meta (Facebook)";
  if (/whatsapp|wa\.me/.test(value)) return "WhatsApp";
  if (/google|gclid/.test(value)) return "Google";
  if (/bing|duckduckgo|qwant|ecosia|yahoo/.test(value)) return "Autre moteur de recherche";
  if (/linkedin/.test(value)) return "LinkedIn";
  if (/tiktok/.test(value)) return "TikTok";
  if (!utmSource && !referrer) return "Accès direct";
  return utmSource ? `Campagne : ${utmSource}` : `Autre site : ${referrer.replace(/^https?:\/\//, "").split("/")[0]}`;
}

export function captureLeadSource() {
  try {
    if (sessionStorage.getItem(KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const externalReferrer =
      document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : "";
    const utm = params.get("utm_source") ?? (params.get("gclid") ? "google" : params.get("fbclid") ? "facebook" : null);
    const entry: LeadSource = {
      source: classifySource(utm, externalReferrer),
      landingPage: window.location.pathname + window.location.search,
      referrer: externalReferrer
    };
    sessionStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    // Navigation privée ou stockage bloqué : la source sera « Inconnue ».
  }
}

export function readLeadSource(): LeadSource {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as LeadSource;
  } catch {
    // ignore
  }
  return { source: "Inconnue", landingPage: "", referrer: "" };
}
