import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/lib/site";
import { randomUUID } from "node:crypto";
import { deliverLead, deliveryConfigured, isDuplicate, type Lead } from "@/lib/server/lead-delivery";
import { quoteServices } from "@/lib/quote-services";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FAILURE_MESSAGE = `L'envoi automatique n'a pas fonctionné. Envoyez-nous votre demande en un clic ci-dessous (e-mail ou WhatsApp), ou appelez-nous au ${siteConfig.phone}.`;

const SERVICE_LABELS = new Set(quoteServices.map((service) => service.label));
const MIN_FILL_MS = 3_000;
const RATE_LIMIT = { max: 5, windowMs: 10 * 60_000 };
// Limite par adresse IP (au mieux : la mémoire est propre à chaque instance serveur).
const recentByIp = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const hits = (recentByIp.get(ip) ?? []).filter((time) => now - time < RATE_LIMIT.windowMs);
  hits.push(now);
  recentByIp.set(ip, hits);
  if (recentByIp.size > 5_000) recentByIp.clear();
  return hits.length > RATE_LIMIT.max;
}

function sanitize(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, maxLength);
}

/**
 * Demande de devis du site → sauvegarde (base Redis Upstash) + e-mail à contact@procleanempire.com
 * + accusé de réception au client (Resend). Voir lib/server/lead-delivery.ts pour les variables Vercel.
 * Sans configuration : transmission directe par le visiteur (e-mail pré-rempli / WhatsApp).
 * Chaque demande est aussi écrite en entier dans les logs Vercel ([devis] …) pour ne jamais la perdre.
 */
export async function POST(request: NextRequest) {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "inconnue";
  if (rateLimited(ip)) {
    console.warn("[devis] Trop de demandes depuis la même adresse", ip);
    return NextResponse.json(
      { error: `Trop de demandes en peu de temps. Merci de réessayer dans quelques minutes ou de nous appeler au ${siteConfig.phone}.` },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const data = {
    service: sanitize(body.service, 120),
    name: sanitize(body.name, 120),
    company: sanitize(body.company, 120),
    phone: sanitize(body.phone, 40),
    email: sanitize(body.email, 200),
    address: sanitize(body.address, 250),
    street: sanitize(body.street, 200),
    postcode: sanitize(body.postcode, 10),
    city: sanitize(body.city, 120),
    startDate: sanitize(body.startDate, 40),
    comments: sanitize(body.comments, 2000),
    sourceUrl: sanitize(body.sourceUrl, 300),
    source: sanitize(body.source, 120) || "Inconnue",
    landingPage: sanitize(body.landingPage, 300),
    referrer: sanitize(body.referrer, 300),
    consent: body.consent === true
  };

  const details: Array<[string, string]> = [];
  if (body.details && typeof body.details === "object") {
    for (const [key, value] of Object.entries(body.details as Record<string, unknown>).slice(0, 15)) {
      const cleanValue = sanitize(value, 300);
      if (cleanValue) details.push([sanitize(key, 80), cleanValue]);
    }
  }

  // Anti-spam : champ piège rempli ou formulaire envoyé trop vite → réponse neutre, rien n'est créé.
  // Contenu journalisé quand même : un éventuel faux positif reste récupérable dans les logs.
  const elapsedMs = typeof body.elapsedMs === "number" ? body.elapsedMs : 0;
  if (sanitize(body.website, 200) || elapsedMs < MIN_FILL_MS) {
    console.warn("[devis] Envoi automatique bloqué", JSON.stringify({ ip, elapsedMs, trap: Boolean(body.website), ...data }));
    return NextResponse.json({ ok: true });
  }

  const missing = (["service", "name", "phone", "email", "city"] as const).find((field) => !data[field]);
  if (missing) {
    return NextResponse.json({ error: `Champ manquant : ${missing}` }, { status: 400 });
  }
  if (!SERVICE_LABELS.has(data.service)) {
    return NextResponse.json({ error: "Prestation inconnue : merci de la choisir dans la liste." }, { status: 400 });
  }
  if (data.name.length < 2) {
    return NextResponse.json({ error: "Merci d'indiquer votre nom." }, { status: 400 });
  }
  if (data.phone.replace(/\D/g, "").length < 9) {
    return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
  }
  if (!EMAIL_RE.test(data.email)) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }
  if (!data.consent) {
    return NextResponse.json({ error: "Merci d'accepter d'être recontacté." }, { status: 400 });
  }

  const lead: Lead = {
    id: `D${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 6).toUpperCase()}`,
    receivedAt: new Date().toISOString(),
    service: data.service,
    name: data.name,
    company: data.company,
    phone: data.phone,
    email: data.email,
    address: data.address || data.street,
    postcode: data.postcode,
    city: data.city,
    startDate: data.startDate,
    comments: data.comments,
    details,
    source: data.source,
    landingPage: data.landingPage,
    referrer: data.referrer,
    sourceUrl: data.sourceUrl || siteConfig.url
  };

  // Trace complète de la demande, quoi qu'il arrive ensuite (logs Vercel).
  console.log("[devis] Nouvelle demande reçue", JSON.stringify(lead));

  const config = deliveryConfigured();
  if (!config.storage && !config.email) {
    // Rien de configuré sur Vercel : le visiteur transmet sa demande en un clic (e-mail pré-rempli ou WhatsApp).
    console.log("[devis] Transmission directe par le visiteur (e-mail / WhatsApp)", JSON.stringify({ id: lead.id }));
    return NextResponse.json({ ok: true, handoff: true });
  }

  try {
    if (await isDuplicate(lead)) {
      console.log("[devis] Doublon ignoré (même e-mail et même prestation < 10 min)", JSON.stringify({ email: lead.email }));
      return NextResponse.json({ ok: true, duplicate: true });
    }
  } catch (error) {
    console.warn("[devis] Contrôle des doublons impossible", String(error));
  }

  const report = await deliverLead(lead);
  console.log("[devis] Livraison", JSON.stringify({ id: lead.id, ...report }));
  if (report.stored || report.internalEmail) {
    return NextResponse.json({ ok: true, reference: lead.id, acknowledgement: report.clientEmail === true });
  }
  console.error("[devis] ÉCHEC de livraison — demande à ressaisir à la main depuis ce log", JSON.stringify(lead));
  return NextResponse.json({ error: FAILURE_MESSAGE, code: "ENVOI_IMPOSSIBLE", fallback: true }, { status: 502 });
}
