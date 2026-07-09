import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

type QuotePayload = {
  name: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  address?: string;
  localType: string;
  surface: string;
  frequency: string;
  startDate?: string;
  comments?: string;
};

const requiredFields: Array<keyof QuotePayload> = [
  "name",
  "company",
  "phone",
  "email",
  "city",
  "localType",
  "surface",
  "frequency"
];

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

  const data: QuotePayload = {
    name: sanitize(body.name, 120),
    company: sanitize(body.company, 120),
    phone: sanitize(body.phone, 40),
    email: sanitize(body.email, 200),
    city: sanitize(body.city, 120),
    address: sanitize(body.address, 200),
    localType: sanitize(body.localType, 120),
    surface: sanitize(body.surface, 20),
    frequency: sanitize(body.frequency, 120),
    startDate: sanitize(body.startDate, 40),
    comments: sanitize(body.comments, 2000)
  };

  for (const field of requiredFields) {
    if (!data[field]) {
      return NextResponse.json({ error: `Champ manquant : ${field}` }, { status: 400 });
    }
  }

  if (!EMAIL_RE.test(data.email)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
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

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword
    }
  });

  const summaryLines = [
    `Nom : ${data.name}`,
    `Entreprise : ${data.company}`,
    `Téléphone : ${data.phone}`,
    `Email : ${data.email}`,
    `Ville : ${data.city}`,
    data.address ? `Adresse : ${data.address}` : null,
    `Type de prestation / locaux : ${data.localType}`,
    `Surface : ${data.surface} m²`,
    `Fréquence souhaitée : ${data.frequency}`,
    data.startDate ? `Date souhaitée : ${data.startDate}` : null,
    data.comments ? `Commentaires : ${data.comments}` : null
  ].filter(Boolean);

  try {
    await transporter.sendMail({
      from: `"Formulaire ProClean Empire" <${gmailUser}>`,
      to: gmailUser,
      replyTo: data.email,
      subject: `Nouvelle demande de devis — ${data.company}`,
      text: summaryLines.join("\n")
    });
  } catch (error) {
    console.error("Erreur d'envoi email devis:", error);
    return NextResponse.json(
      { error: "Échec de l'envoi. Merci de réessayer ou de nous appeler directement." },
      { status: 500 }
    );
  }

  try {
    await transporter.sendMail({
      from: `"${siteConfig.name}" <${gmailUser}>`,
      to: data.email,
      replyTo: gmailUser,
      subject: `Confirmation de votre demande de devis — ${siteConfig.name}`,
      text: [
        `Bonjour ${data.name},`,
        "",
        `Nous avons bien reçu votre demande de devis pour ${data.company}.`,
        `Un interlocuteur dédié revient vers vous sous 24h pour affiner votre besoin et vous proposer une solution adaptée.`,
        "",
        "Récapitulatif de votre demande :",
        `- Type de prestation : ${data.localType}`,
        `- Ville : ${data.city}`,
        `- Surface : ${data.surface} m²`,
        `- Fréquence souhaitée : ${data.frequency}`,
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
