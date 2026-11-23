import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Accès minimal à Stripe pour le prélèvement SEPA (mandat en ligne, prélèvement d'une facture, notifications).
 * Pas de dépendance : l'API est appelée directement. La clé secrète (STRIPE_SECRET_KEY) reste côté serveur.
 */
export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;

/** Aplati un objet en champs de formulaire comme Stripe les attend : a[b]=1, liste[0]=x. */
export function toForm(obj: Record<string, unknown>, prefix = "", out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" && item !== null ? toForm(item as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === "object") toForm(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export class StripeError extends Error {
  constructor(message: string, readonly code?: string, readonly status?: number) { super(message); }
}

export async function stripe<T = any>(method: "GET" | "POST", path: string, body?: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeError("Stripe n'est pas configuré (clé secrète absente).");
  const query = method === "GET" && body ? `?${toForm(body)}` : "";
  const res = await fetch(`https://api.stripe.com/v1${path}${query}`, {
    method, cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { authorization: `Bearer ${key}`, ...(method === "POST" ? { "content-type": "application/x-www-form-urlencoded" } : {}), ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}) },
    body: method === "POST" ? toForm(body ?? {}) : undefined
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new StripeError(json?.error?.message ?? `Stripe a répondu ${res.status}`, json?.error?.code, res.status);
  return json as T;
}

/** Montant en euros → centimes entiers (Stripe ne prend que des entiers). */
export const toCents = (euros: number) => Math.round(euros * 100);

/**
 * Vérifie qu'une notification vient bien de Stripe : signature HMAC-SHA256 de « horodatage.corps » avec le secret du point d'écoute,
 * et horodatage récent (5 minutes) pour refuser un message rejoué.
 */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, nowSeconds = Math.floor(Date.now() / 1000), toleranceSeconds = 300): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.trim().split("=") as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !signatures.length || !/^\d+$/.test(t)) return false;
  if (Math.abs(nowSeconds - Number(t)) > toleranceSeconds) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex"));
  return signatures.some((s) => { const got = Buffer.from(s); return got.length === expected.length && timingSafeEqual(got, expected); });
}
