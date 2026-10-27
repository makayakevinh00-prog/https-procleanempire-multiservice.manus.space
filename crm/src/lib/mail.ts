/** Envoi via Resend. Sans RESEND_API_KEY, rien ne part et l'appelant en est informé (jamais d'échec silencieux). */
export interface MailInput {
  to: string;
  subject: string;
  text: string;
  attachment?: { filename: string; bytes: Uint8Array };
}

export type MailResult = { sent: true } | { sent: false; reason: string };

export async function sendMail(m: MailInput): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "RESEND_API_KEY non configurée" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "ProClean Empire <contact@procleanempire.com>",
      to: [m.to],
      reply_to: "contact@procleanempire.com",
      subject: m.subject,
      text: m.text,
      attachments: m.attachment
        ? [{ filename: m.attachment.filename, content: Buffer.from(m.attachment.bytes).toString("base64") }]
        : undefined
    })
  });
  if (!res.ok) return { sent: false, reason: `Resend ${res.status} : ${(await res.text()).slice(0, 200)}` };
  return { sent: true };
}
