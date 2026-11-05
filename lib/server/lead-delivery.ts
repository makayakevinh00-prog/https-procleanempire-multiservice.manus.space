/**
 * Livraison des demandes de devis du site (côté serveur uniquement, aucune clé dans le navigateur).
 *
 * 1. Sauvegarde dans une base Redis (Upstash, via le Marketplace Vercel) — pour ne jamais perdre une demande.
 * 2. E-mail à contact@procleanempire.com avec toute la demande (Resend).
 * 3. Accusé de réception au client « Demande bien reçue, devis sous 24 h » (Resend, domaine vérifié).
 *
 * Variables d'environnement Vercel (aucune n'est obligatoire : sans elles, le visiteur transmet
 * lui-même sa demande en un clic par e-mail pré-rempli ou WhatsApp) :
 * - RESEND_API_KEY        clé API Resend (https://resend.com → API Keys)
 * - RESEND_FROM           expéditeur sur le domaine vérifié, ex. « ProClean Empire <devis@procleanempire.com> ».
 *                         Sans domaine vérifié : seul l'e-mail interne part (expéditeur onboarding@resend.dev,
 *                         uniquement vers l'adresse du compte Resend) et l'accusé client n'est pas envoyé.
 * - LEADS_TO_EMAIL        destinataire interne (défaut : contact@procleanempire.com)
 * - KV_REST_API_URL / KV_REST_API_TOKEN (ajoutées automatiquement par l'intégration Upstash de Vercel)
 *   ou UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
 */

export type Lead = {
  id: string;
  receivedAt: string;
  service: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  postcode: string;
  city: string;
  startDate: string;
  comments: string;
  details: Array<[string, string]>;
  source: string;
  landingPage: string;
  referrer: string;
  sourceUrl: string;
};

export type DeliveryReport = {
  stored: boolean;
  internalEmail: boolean;
  clientEmail: boolean | "non configuré";
  errors: string[];
};

const DEFAULT_TO = "contact@procleanempire.com";
const TIMEOUT_MS = 8_000;

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function deliveryConfigured() {
  return { storage: Boolean(redisConfig()), email: Boolean(process.env.RESEND_API_KEY?.trim()), clientEmail: Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim()) };
}

async function timedFetch(url: string, init: RequestInit) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
}

/** Commandes Redis en une requête (API REST Upstash « pipeline »). */
async function redis(commands: Array<Array<string | number>>) {
  const config = redisConfig();
  if (!config) throw new Error("BASE_ABSENTE");
  const response = await timedFetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`BASE_REFUS ${response.status} ${text.slice(0, 200)}`);
  const results = JSON.parse(text) as Array<{ result?: unknown; error?: string }>;
  const failed = results.find((item) => item.error);
  if (failed) throw new Error(`BASE_REFUS ${failed.error}`);
  return results.map((item) => item.result);
}

export async function storeLead(lead: Lead, status: Record<string, unknown> = {}) {
  await redis([
    ["SET", `devis:${lead.id}`, JSON.stringify({ ...lead, ...status })],
    ["ZADD", "devis:index", Date.parse(lead.receivedAt), lead.id]
  ]);
}

/** Anti-doublon : même e-mail + même prestation dans les 10 minutes → déjà reçu. */
export async function isDuplicate(lead: Lead) {
  if (!redisConfig()) return false;
  const key = `devis:recent:${lead.email.toLowerCase()}:${lead.service}`;
  const [result] = await redis([["SET", key, lead.id, "NX", "EX", 600]]);
  return result === null;
}

export async function checkStorage(): Promise<string> {
  if (!redisConfig()) return "non configurée";
  try {
    const [pong, count] = await redis([["PING"], ["ZCARD", "devis:index"]]);
    return pong === "PONG" ? `OK — ${count} demande(s) enregistrée(s)` : "réponse inattendue";
  } catch (error) {
    return `erreur (${String(error).slice(0, 80)})`;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export function leadLines(lead: Lead): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ["Prestation", lead.service],
    ...lead.details,
    ["Adresse", lead.address || "-"],
    ["Ville", [lead.postcode, lead.city].filter(Boolean).join(" ")],
    ["Date souhaitée", lead.startDate || "-"],
    ["Nom", lead.name],
    ["Entreprise", lead.company || "-"],
    ["Téléphone", lead.phone],
    ["E-mail", lead.email],
    ["Message", lead.comments || "-"],
    ["Page d'origine", lead.sourceUrl || "-"],
    ["Origine du prospect", lead.source],
    ["Première page vue", lead.landingPage || "-"],
    ["Site précédent", lead.referrer || "-"],
    ["Reçue le", new Date(lead.receivedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })],
    ["Référence", lead.id]
  ];
  return rows;
}

const SIGNATURE_HTML =
  '<p style="margin-top:24px"><b>Kevinh Makaya Mateve</b> — Founder - CEO, ProClean Empire<br>Ile de France<br>T. +33617212230 - <a href="https://procleanempire.com">https://Procleanempire.com</a><br>contact@procleanempire.com</p>';

async function sendWithResend(payload: Record<string, unknown>) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("EMAIL_NON_CONFIGURE");
  const response = await timedFetch(process.env.RESEND_API_BASE || "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`EMAIL_REFUS ${response.status} ${(await response.text()).slice(0, 200)}`);
}

export async function sendInternalEmail(lead: Lead) {
  const rows = leadLines(lead);
  const html = `<h2 style="font-family:Arial,sans-serif">Nouvelle demande de devis — ${escapeHtml(lead.service)}</h2>
<table style="font-family:Arial,sans-serif;border-collapse:collapse">${rows
    .map(([label, value]) => `<tr><td style="padding:4px 12px 4px 0;color:#555;vertical-align:top"><b>${escapeHtml(label)}</b></td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`)
    .join("")}</table>
<p style="font-family:Arial,sans-serif;color:#555">Répondre à ce mail écrit directement au client.</p>`;
  await sendWithResend({
    from: process.env.RESEND_FROM?.trim() || "ProClean Empire site <onboarding@resend.dev>",
    to: [process.env.LEADS_TO_EMAIL?.trim() || DEFAULT_TO],
    reply_to: lead.email,
    subject: `[DEVIS SITE] ${lead.service} — ${lead.name} — ${lead.city}`,
    html,
    text: rows.map(([label, value]) => `${label} : ${value}`).join("\n")
  });
}

export async function sendClientAcknowledgement(lead: Lead) {
  const from = process.env.RESEND_FROM?.trim();
  if (!from) throw new Error("EXPEDITEUR_NON_CONFIGURE");
  const firstName = lead.name.split(" ")[0];
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5">
<p>Bonjour ${escapeHtml(firstName)},</p>
<p>Votre demande de devis pour « ${escapeHtml(lead.service)} » à ${escapeHtml(lead.city)} est bien reçue. Nous vous envoyons votre devis sous 24 h (7j/7, 8h–18h).</p>
<p>Une précision à ajouter ? Répondez simplement à ce mail ou appelez-nous au 06 17 21 22 30.</p>
<p>Référence de votre demande : ${escapeHtml(lead.id)}</p>
<p>À très vite,</p>${SIGNATURE_HTML}</div>`;
  await sendWithResend({
    from,
    to: [lead.email],
    reply_to: process.env.LEADS_TO_EMAIL?.trim() || DEFAULT_TO,
    subject: "Demande bien reçue — votre devis sous 24 h",
    html,
    text: `Bonjour ${firstName},\n\nVotre demande de devis pour « ${lead.service} » à ${lead.city} est bien reçue. Nous vous envoyons votre devis sous 24 h (7j/7, 8h–18h).\n\nUne précision à ajouter ? Répondez à ce mail ou appelez-nous au 06 17 21 22 30.\n\nRéférence : ${lead.id}\n\nKevinh Makaya Mateve — Founder - CEO, ProClean Empire\nIle de France\nT. +33617212230 - https://Procleanempire.com\ncontact@procleanempire.com`
  });
}

/**
 * Sauvegarde puis e-mails. La demande est considérée comme reçue si elle est sauvegardée
 * OU si l'e-mail interne est parti. L'accusé client ne bloque jamais.
 */
export async function deliverLead(lead: Lead): Promise<DeliveryReport> {
  const report: DeliveryReport = { stored: false, internalEmail: false, clientEmail: "non configuré", errors: [] };
  const config = deliveryConfigured();

  if (config.storage) {
    try {
      await storeLead(lead, { statut: "reçue" });
      report.stored = true;
    } catch (error) {
      report.errors.push(String(error));
    }
  }
  if (config.email) {
    try {
      await sendInternalEmail(lead);
      report.internalEmail = true;
    } catch (error) {
      report.errors.push(String(error));
    }
  }
  if (config.clientEmail && (report.stored || report.internalEmail)) {
    try {
      await sendClientAcknowledgement(lead);
      report.clientEmail = true;
    } catch (error) {
      report.clientEmail = false;
      report.errors.push(String(error));
    }
  }
  if (report.stored) {
    try {
      await storeLead(lead, { statut: "reçue", emailInterne: report.internalEmail, accuseClient: report.clientEmail });
    } catch {
      /* la première sauvegarde suffit */
    }
  }
  return report;
}
