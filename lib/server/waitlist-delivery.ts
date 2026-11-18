/**
 * Liste d'attente Empire OS (côté serveur uniquement).
 *
 * Même principe que les demandes de devis (lib/server/lead-delivery.ts), avec les mêmes variables Vercel :
 * 1. Sauvegarde dans la base Redis Upstash (clés « empireos:waitlist:… »).
 * 2. E-mail interne à contact@procleanempire.com (Resend).
 * Aucun e-mail n'est envoyé à l'inscrit : il sera recontacté à la main à l'ouverture.
 * Sans configuration : le visiteur envoie lui-même son inscription par e-mail pré-rempli.
 */

export type WaitlistEntry = {
  id: string;
  receivedAt: string;
  email: string;
  company: string;
  profile: string;
  source: string;
  referrer: string;
};

const DEFAULT_TO = "contact@procleanempire.com";
const TIMEOUT_MS = 8_000;

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function waitlistConfigured() {
  return {
    storage: Boolean(redisConfig()),
    email: Boolean(process.env.RESEND_API_KEY?.trim()),
  };
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] ?? char,
  );
}

/** Enregistre l'inscription. Renvoie false si cet e-mail était déjà inscrit. */
export async function storeWaitlistEntry(
  entry: WaitlistEntry,
): Promise<boolean> {
  const config = redisConfig();
  if (!config) throw new Error("BASE_ABSENTE");
  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      [
        "SET",
        `empireos:waitlist:${entry.email.toLowerCase()}`,
        JSON.stringify(entry),
        "NX",
      ],
      [
        "ZADD",
        "empireos:waitlist:index",
        "NX",
        Date.parse(entry.receivedAt),
        entry.email.toLowerCase(),
      ],
    ]),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok)
    throw new Error(`BASE_REFUS ${response.status} ${text.slice(0, 200)}`);
  const results = JSON.parse(text) as Array<{
    result?: unknown;
    error?: string;
  }>;
  const failed = results.find((item) => item.error);
  if (failed) throw new Error(`BASE_REFUS ${failed.error}`);
  return results[0]?.result !== null;
}

export async function sendWaitlistNotification(entry: WaitlistEntry) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("EMAIL_NON_CONFIGURE");
  const rows: Array<[string, string]> = [
    ["E-mail", entry.email],
    ["Entreprise", entry.company || "-"],
    ["Profil", entry.profile || "-"],
    ["Origine", entry.source || "-"],
    ["Site précédent", entry.referrer || "-"],
    [
      "Reçue le",
      new Date(entry.receivedAt).toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
      }),
    ],
    ["Référence", entry.id],
  ];
  const response = await fetch(
    process.env.RESEND_API_BASE || "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          process.env.RESEND_FROM?.trim() ||
          "ProClean Empire site <onboarding@resend.dev>",
        to: [process.env.LEADS_TO_EMAIL?.trim() || DEFAULT_TO],
        reply_to: entry.email,
        subject: `[EMPIRE OS] Inscription liste d'attente — ${entry.company || entry.email}`,
        html: `<h2 style="font-family:Arial,sans-serif">Nouvelle inscription à la liste d'attente Empire OS</h2>
<table style="font-family:Arial,sans-serif;border-collapse:collapse">${rows
          .map(
            ([label, value]) =>
              `<tr><td style="padding:4px 12px 4px 0;color:#555"><b>${escapeHtml(label)}</b></td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`,
          )
          .join("")}</table>`,
        text: rows.map(([label, value]) => `${label} : ${value}`).join("\n"),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new Error(
      `EMAIL_REFUS ${response.status} ${(await response.text()).slice(0, 200)}`,
    );
}
