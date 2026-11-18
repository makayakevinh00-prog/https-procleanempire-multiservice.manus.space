import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  sendWaitlistNotification,
  storeWaitlistEntry,
  waitlistConfigured,
  type WaitlistEntry,
} from "@/lib/server/waitlist-delivery";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROFILES = new Set([
  "Entreprise de nettoyage",
  "Conciergerie",
  "Indépendant",
  "Autre",
]);
const MIN_FILL_MS = 2_000;
const RATE_LIMIT = { max: 5, windowMs: 10 * 60_000 };
// Limite par adresse IP (au mieux : la mémoire est propre à chaque instance serveur).
const recentByIp = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const hits = (recentByIp.get(ip) ?? []).filter(
    (time) => now - time < RATE_LIMIT.windowMs,
  );
  hits.push(now);
  recentByIp.set(ip, hits);
  if (recentByIp.size > 5_000) recentByIp.clear();
  return hits.length > RATE_LIMIT.max;
}

function sanitize(value: unknown, maxLength = 200): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Inscription à la liste d'attente Empire OS → sauvegarde (Redis Upstash) + e-mail interne (Resend).
 * Sans configuration : réponse « handoff », le visiteur envoie son inscription par e-mail pré-rempli.
 * Chaque inscription est aussi écrite dans les logs Vercel ([empire-os] …) pour ne jamais la perdre.
 */
export async function POST(request: NextRequest) {
  const ip =
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "inconnue";
  if (rateLimited(ip)) {
    return NextResponse.json(
      {
        error:
          "Trop d'essais en peu de temps. Merci de réessayer dans quelques minutes.",
      },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const email = sanitize(body.email, 200);
  const company = sanitize(body.company, 120);
  const profile = sanitize(body.profile, 60);

  // Anti-spam : champ piège rempli ou formulaire envoyé trop vite → réponse neutre, rien n'est créé.
  const elapsedMs = typeof body.elapsedMs === "number" ? body.elapsedMs : 0;
  if (sanitize(body.website) || elapsedMs < MIN_FILL_MS) {
    console.warn(
      "[empire-os] Envoi automatique bloqué",
      JSON.stringify({ ip, elapsedMs, email, company }),
    );
    return NextResponse.json({ ok: true });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Adresse e-mail invalide.", field: "email" },
      { status: 400 },
    );
  }
  if (profile && !PROFILES.has(profile)) {
    return NextResponse.json(
      { error: "Profil inconnu.", field: "profile" },
      { status: 400 },
    );
  }
  if (body.consent !== true) {
    return NextResponse.json(
      { error: "Merci d'accepter d'être recontacté.", field: "consent" },
      { status: 400 },
    );
  }

  const entry: WaitlistEntry = {
    id: `EOS${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 6).toUpperCase()}`,
    receivedAt: new Date().toISOString(),
    email,
    company,
    profile,
    source: sanitize(body.source, 120),
    referrer: sanitize(body.referrer, 300),
  };
  console.log("[empire-os] Inscription liste d'attente", JSON.stringify(entry));

  const config = waitlistConfigured();
  if (!config.storage && !config.email) {
    return NextResponse.json({ ok: true, handoff: true });
  }

  let stored = false;
  let alreadyListed = false;
  let notified = false;
  if (config.storage) {
    try {
      alreadyListed = !(await storeWaitlistEntry(entry));
      stored = true;
    } catch (error) {
      console.warn("[empire-os] Sauvegarde impossible", String(error));
    }
  }
  if (config.email && !alreadyListed) {
    try {
      await sendWaitlistNotification(entry);
      notified = true;
    } catch (error) {
      console.warn("[empire-os] E-mail interne impossible", String(error));
    }
  }

  if (stored || notified)
    return NextResponse.json({ ok: true, duplicate: alreadyListed });
  console.error(
    "[empire-os] ÉCHEC — inscription à reprendre depuis ce log",
    JSON.stringify(entry),
  );
  return NextResponse.json({ ok: true, handoff: true });
}
