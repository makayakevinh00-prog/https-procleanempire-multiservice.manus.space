import "server-only";
import { fromHeader } from "./mail-identity";
/** Envoi via Resend. Sans RESEND_API_KEY, rien ne part et l'appelant en est informé (jamais d'échec silencieux). */
export interface MailInput {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachment?: { filename: string; bytes: Uint8Array };
  /** Pièces jointes déjà encodées en base64 (photos). */
  attachments?: { filename: string; b64: string }[];
  /** Nom d'expéditeur affiché chez le destinataire (ex. « ProClean Empire - Service facturation »). L'adresse d'envoi ne change pas. */
  fromName?: string;
}

export type MailResult = { sent: true } | { sent: false; reason: string };

export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY?.trim());

export async function sendMail(m: MailInput): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { sent: false, reason: "RESEND_API_KEY non configurée" };
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
        html: m.html,
        attachments: m.attachment || m.attachments?.length
          ? [...(m.attachment ? [{ filename: m.attachment.filename, content: Buffer.from(m.attachment.bytes).toString("base64") }] : []), ...(m.attachments ?? []).map((a) => ({ filename: a.filename, content: a.b64 }))]
          : undefined
      })
    });
    if (!res.ok) return { sent: false, reason: `Resend ${res.status} : ${(await res.text()).slice(0, 200)}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: `Resend injoignable : ${(e as Error).message}` };
  }
}
