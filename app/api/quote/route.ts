import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/lib/site";
import { pushLeadToAxonaut } from "@/lib/server/axonaut";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FAILURE_MESSAGE = `Votre demande n'a pas pu être enregistrée. Merci de nous appeler au ${siteConfig.phone}, nous vous répondons tout de suite.`;

function sanitize(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, maxLength);
}

/**
 * Demande de devis du site → Axonaut (fiche client + opportunité « Cycle commercial / Proposition »).
 * Succès renvoyé au client uniquement si Axonaut a tout accepté. Chaque demande est aussi écrite
 * en entier dans les logs Vercel ([devis] …) pour ne jamais la perdre.
 */
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
    street: sanitize(body.street, 200),
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

  const detail = [
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
    "Consentement de contact : oui",
    `Source : site web (${data.sourceUrl || siteConfig.url})`
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  // Trace complète de la demande, quoi qu'il arrive ensuite (logs Vercel).
  console.log("[devis] Nouvelle demande reçue", JSON.stringify({ receivedAt: new Date().toISOString(), ...data, details }));

  try {
    const result = await pushLeadToAxonaut({
      service: data.service,
      name: data.name,
      company: data.company,
      phone: data.phone,
      email: data.email,
      // Rue choisie dans les suggestions ; sinon l'adresse telle que saisie.
      street: data.street || data.address,
      postcode: data.postcode,
      city: data.city,
      detail
    });
    console.log("[devis] Enregistrée dans Axonaut", JSON.stringify({ email: data.email, ...result }));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "[devis] ÉCHEC Axonaut — demande à ressaisir à la main",
      String(error),
      JSON.stringify({ ...data, details })
    );
    return NextResponse.json({ error: FAILURE_MESSAGE }, { status: 502 });
  }
}
