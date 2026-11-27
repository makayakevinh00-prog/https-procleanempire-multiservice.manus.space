import "server-only";
import { fromHeader } from "./mail-identity";
/** Envoi via Resend. Sans RESEND_API_KEY, rien ne part et l'appelant en est informé (jamais d'échec silencieux). */
export interface MailInput {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachment?: { filename: string; bytes: Uint8Array };
  /** Plusieurs pièces jointes dans le même e-mail (ex. toutes les factures d'un client). */
  attachments?: { filename: string; bytes: Uint8Array }[];
  /** Nom d'expéditeur affiché chez le destinataire (ex. « ProClean Empire - Service facturation »). L'adresse d'envoi ne change pas. */
  fromName?: string;
  /** Suivi d'ouverture : ajoute un pixel invisible et enregistre l'envoi (facture, relance…). Jamais bloquant. */
  track?: { entity: string; entityId: string };
}

const escHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Crée la ligne de suivi et renvoie le HTML (celui fourni, ou le texte mis en forme) avec le pixel en bas. */
async function withTracking(m: MailInput): Promise<string | undefined> {
  if (!m.track || !process.env.SUPABASE_SERVICE_ROLE_KEY) return m.html;
  try {
    const { createAdmin } = await import("./supabase/server");
    const { data } = await createAdmin().from("email_opens").insert({
      entity: m.track.entity, entity_id: m.track.entityId, to_email: Array.isArray(m.to) ? m.to.join(", ") : m.to, subject: m.subject
    }).select("id").single();
    if (!data) return m.html;
    const site = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "proclean-crm.vercel.app"}`;
    const pixel = `<img src="${site}/api/public/o/${(data as any).id}.gif" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px" />`;
    const body = m.html ?? `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;white-space:pre-wrap">${escHtml(m.text)}</div>`;
    return body.includes("</body>") ? body.replace("</body>", `${pixel}</body>`) : body + pixel;
  } catch { return m.html; }
}

export type MailResult = { sent: true } | { sent: false; reason: string };

export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY?.trim());

export async function sendMail(m: MailInput): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { sent: false, reason: "RESEND_API_KEY non configurée" };
  const html = await withTracking(m);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        from: fromHeader(process.env.MAIL_FROM ?? "ProClean Empire <contact@procleanempire.com>", m.fromName),
        to: Array.isArray(m.to) ? m.to : [m.to],
        reply_to: "contact@procleanempire.com",
        subject: m.subject,
        text: m.text,
        html,
        attachments: (() => {
          const all = [...(m.attachment ? [m.attachment] : []), ...(m.attachments ?? [])];
          return all.length ? all.map((a) => ({ filename: a.filename, content: Buffer.from(a.bytes).toString("base64") })) : undefined;
        })()
      })
    });
    if (!res.ok) return { sent: false, reason: `Resend ${res.status} : ${(await res.text()).slice(0, 200)}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: `Resend injoignable : ${(e as Error).message}` };
  }
}
