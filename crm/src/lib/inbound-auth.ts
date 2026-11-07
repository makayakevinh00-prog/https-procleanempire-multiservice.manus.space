import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Fenêtre de validité d'une requête signée : bloque le rejeu d'une requête interceptée. */
export const TOLERANCE_SECONDS = 300;

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Signature attendue : HMAC-SHA256 hexadécimal de `${timestamp}.${corps brut}` avec le secret partagé. */
export const sign = (secret: string, timestamp: string, rawBody: string) => createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

export type InboundCheck = { ok: true; method: "hmac" | "cle" } | { ok: false; reason: string };

/**
 * Authentifie une requête du site. Deux méthodes, au choix de l'appelant :
 *  - recommandée : en-têtes `x-timestamp` (secondes) + `x-signature` (HMAC du corps) — le secret ne circule jamais ;
 *  - historique : en-tête `x-inbound-secret` (clé d'API), tant que le site n'a pas été migré.
 */
export function verifyInbound(headers: { get(name: string): string | null }, rawBody: string, secret: string | undefined, now = Date.now()): InboundCheck {
  if (!secret) return { ok: false, reason: "non configuré" };
  const signature = headers.get("x-signature");
  if (signature) {
    const ts = headers.get("x-timestamp") ?? "";
    if (!/^\d{9,12}$/.test(ts)) return { ok: false, reason: "horodatage invalide" };
    if (Math.abs(now / 1000 - Number(ts)) > TOLERANCE_SECONDS) return { ok: false, reason: "requête expirée" };
    const given = signature.replace(/^sha256=/, "").toLowerCase();
    return safeEqual(given, sign(secret, ts, rawBody)) ? { ok: true, method: "hmac" } : { ok: false, reason: "signature invalide" };
  }
  const key = headers.get("x-inbound-secret");
  if (key && safeEqual(key, secret)) return { ok: true, method: "cle" };
  return { ok: false, reason: "non autorisé" };
}

/** Origines autorisées à interroger le suivi depuis un navigateur (CORS). */
export function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const list = (process.env.PUBLIC_API_ORIGINS ?? "https://procleanempire.com,https://www.procleanempire.com").split(",").map((s) => s.trim());
  return list.includes(origin) ? origin : null;
}
