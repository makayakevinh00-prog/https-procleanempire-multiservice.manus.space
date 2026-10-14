import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { siteConfig } from "@/lib/site";
import { pushLeadToAxonaut } from "@/lib/server/axonaut";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitize(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, maxLength);
}

export async function POST(request: NextRequest) {
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
    postcode: sanitize(body.postcode, 10),
    city: sanitize(body.city, 120),
    startDate: sanitize(body.startDate, 40),
    comments: sanitize(body.comments, 2000),
    sourceUrl: sanitize(body.sourceUrl, 300),
    consent: body.consent === true
  };

  const details: Array<[string, string]> = [];
  if (body.details && typeof body.details === "object") {
    for (const [key, value] of Object.entries(body.details as Record<string, unknown>).slice(0, 15)) {
      const cleanValue = sanitize(value, 300);
      if (cleanValue) details.push([sanitize(key, 80), cleanValue]);
    }
  }

  const missing = (["service", "name", "phone", "email", "city"] as const).find((field) => !data[field]);
  if (missing) {
    return NextResponse.json({ error: `Champ manquant : ${missing}` }, { status: 400 });
  }
  if (!EMAIL_RE.test(data.email)) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }
  if (!data.consent) {
    return NextResponse.json({ error: "Merci d'accepter d'être recontacté." }, { status: 400 });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailAppPassword) {
    console.error("GMAIL_USER / GMAIL_APP_PASSWORD non configurés.");
    return NextResponse.json(
      { error: "Envoi indisponible pour le moment. Merci de nous contacter par téléphone." },
      { status: 500 }
    );
  }

  const summaryLines = [
    `Prestation : ${data.service}`,
    ...details.map(([key, value]) => `${key} : ${value}`),
    `Adresse : ${data.address || "-"}`,
    `Ville : ${[data.postcode, data.city].filter(Boolean).join(" ")}`,
    data.startDate ? `Date souhaitée : ${data.startDate}` : null,
    "",
    `Nom : ${data.name}`,
    data.company ? `Entreprise : ${data.company}` : null,
    `Téléphone : ${data.phone}`,
    `E-mail : ${data.email}`,
    data.comments ? `Message : ${data.comments}` : null,
    "",
    `Consentement de contact : oui`,
    `Source : site web (${data.sourceUrl || siteConfig.url})`
  ].filter((line): line is string => line !== null);

  // 1. CRM Axonaut (n'empêche jamais l'envoi de l'e-mail en cas d'erreur).
  let crmLine = "Axonaut : non connecté (clé AXONAUT_API_KEY absente).";
  try {
    const result = await pushLeadToAxonaut({
      service: data.service,
      name: data.name,
      company: data.company,
      phone: data.phone,
      email: data.email,
      street: data.address.split(",")[0] ?? "",
      postcode: data.postcode,
      city: data.city,
      summary: summaryLines.join("\n")
    });
    if (result) {
      crmLine = `Axonaut : fiche ${result.companyId} + opportunité ${result.opportunityId ?? "?"} créées.`;
    }
  } catch (error) {
    console.error("Erreur Axonaut:", error);
    crmLine = "Axonaut : ÉCHEC de création — à saisir à la main.";
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailAppPassword }
  });

  // 2. Notification à ProClean Empire (lue par le Manager Commercial).
  try {
    await transporter.sendMail({
      from: `"Formulaire ProClean Empire" <${gmailUser}>`,
      to: gmailUser,
      replyTo: data.email,
      subject: `[DEVIS SITE] ${data.service} — ${data.company || data.name} (${data.city})`,
      text: [...summaryLines, crmLine].join("\n")
    });
  } catch (error) {
    console.error("Erreur d'envoi email devis:", error);
    return NextResponse.json(
      { error: "Échec de l'envoi. Merci de réessayer ou de nous appeler directement." },
      { status: 500 }
    );
  }

  // 3. Accusé de réception au client.
  try {
    await transporter.sendMail({
      from: `"${siteConfig.name}" <${gmailUser}>`,
      to: data.email,
      replyTo: gmailUser,
      subject: `Votre demande de devis — ${siteConfig.name}`,
      text: [
        `Bonjour ${data.name},`,
        "",
        `Nous avons bien reçu votre demande de devis (${data.service}, ${data.city}).`,
        "Nous revenons vers vous sous 24h avec une proposition adaptée.",
        "",
        "Récapitulatif :",
        ...details.map(([key, value]) => `- ${key} : ${value}`),
        "",
        `Besoin d'un échange plus rapide ? Réservez un créneau : ${siteConfig.bookingUrl}`,
        "",
        "Cordialement,",
        `L'équipe ${siteConfig.name}`,
        `${siteConfig.phone} · ${siteConfig.email}`
      ].join("\n")
    });
  } catch (error) {
    console.error("Erreur d'envoi email de confirmation client:", error);
  }

  return NextResponse.json({ ok: true });
}
