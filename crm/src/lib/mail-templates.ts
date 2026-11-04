/** Modèles d'e-mails (texte + HTML sobre). Tous les montants et dates sont déjà formatés par l'appelant. */
export interface Mail { subject: string; text: string; html: string }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(company: string, paragraphs: string[], signature: string[]): { text: string; html: string } {
  const text = [...paragraphs, "", ...signature].join("\n\n").replace(/\n\n\n+/g, "\n\n");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#14213d;max-width:560px">
${paragraphs.map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n")}
<p style="margin:22px 0 0;border-top:1px solid #e3e7ef;padding-top:12px;color:#5b6475;font-size:13px">${signature.map(esc).join("<br>")}</p>
</div>`;
  return { text, html };
}

const sign = (company: string, phone?: string | null) => [company, "contact@procleanempire.com", ...(phone ? [phone] : [])];

export function quoteEmail(a: { company: string; phone?: string | null; clientName: string; number: string; subject?: string | null; totalTtc: string; validUntil?: string | null }): Mail {
  const subject = `Devis ${a.number}${a.subject ? ` — ${a.subject}` : ""} — ${a.company}`;
  const body = wrap(a.company, [
    "Bonjour,",
    `Suite à votre demande, veuillez trouver ci-joint notre devis ${a.number}${a.subject ? ` (${a.subject})` : ""}, d'un montant de ${a.totalTtc} TTC${a.validUntil ? `, valable jusqu'au ${a.validUntil}` : ""}.`,
    "Pour l'accepter, il vous suffit de nous le retourner signé avec la mention « bon pour accord », ou de répondre simplement à ce message. Nous restons à votre disposition pour toute question ou pour adapter la prestation.",
    "Cordialement,"
  ], sign(a.company, a.phone));
  return { subject, ...body };
}

export function quoteFollowupEmail(a: { company: string; phone?: string | null; number: string; totalTtc: string; validUntil?: string | null }): Mail {
  const subject = `Votre devis ${a.number} — ${a.company}`;
  const body = wrap(a.company, [
    "Bonjour,",
    `Nous nous permettons de revenir vers vous au sujet de notre devis ${a.number} (${a.totalTtc} TTC)${a.validUntil ? `, valable jusqu'au ${a.validUntil}` : ""}. Avez-vous eu l'occasion de le consulter ?`,
    "Nous pouvons l'ajuster à vos besoins ou répondre à vos questions : répondez simplement à ce message.",
    "Cordialement,"
  ], sign(a.company, a.phone));
  return { subject, ...body };
}

export function invoiceEmail(a: { company: string; phone?: string | null; number: string; totalTtc: string; dueDate?: string | null; period?: string | null; iban?: string | null }): Mail {
  const subject = `Facture ${a.number}${a.period ? ` — ${a.period}` : ""} — ${a.company}`;
  const body = wrap(a.company, [
    "Bonjour,",
    `Veuillez trouver ci-joint la facture ${a.number}${a.period ? ` relative à nos prestations de ${a.period}` : ""}, d'un montant de ${a.totalTtc} TTC${a.dueDate ? `, à régler avant le ${a.dueDate}` : ""}.`,
    a.iban ? `Règlement par virement bancaire — IBAN : ${a.iban}. Merci d'indiquer le numéro de facture en référence.` : "Règlement par virement bancaire. Merci d'indiquer le numéro de facture en référence.",
    "Pour toute question, répondez simplement à ce message.",
    "Cordialement,"
  ], sign(a.company, a.phone));
  return { subject, ...body };
}

export function reminderEmail(a: { company: string; phone?: string | null; number: string; totalTtc: string; dueDate: string }): Mail {
  const subject = `Relance — facture ${a.number}`;
  const body = wrap(a.company, [
    "Bonjour,",
    `Sauf erreur de notre part, la facture ${a.number} (${a.totalTtc} TTC, échéance ${a.dueDate}) n'a pas encore été réglée. Merci de procéder au règlement ou de nous contacter si c'est déjà fait.`,
    "Cordialement,"
  ], sign(a.company, a.phone));
  return { subject, ...body };
}

/** Récapitulatif envoyé au patron après chaque passage de l'automatisation. */
export function digestEmail(a: { company: string; day: string; lines: string[]; todo: string[] }): Mail {
  const subject = `Récapitulatif automatique du ${a.day} — ${a.company}`;
  const paragraphs = [
    ...(a.lines.length ? ["Ce qui s'est passé :", ...a.lines.map((l) => `• ${l}`)] : []),
    ...(a.todo.length ? ["À faire par vous :", ...a.todo.map((l) => `• ${l}`)] : [])
  ];
  const body = wrap(a.company, paragraphs.length ? paragraphs : ["Rien à signaler."], ["ProClean CRM — message automatique"]);
  return { subject, ...body };
}
