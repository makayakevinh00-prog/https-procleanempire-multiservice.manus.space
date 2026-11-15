import { senderName, signatureLines, type Service } from "./mail-identity";

/** Modèles d'e-mails (texte + HTML sobre). Tous les montants et dates sont déjà formatés par l'appelant. `fromName` : nom d'expéditeur à afficher chez le client (le service qui écrit). */
export interface Mail { subject: string; text: string; html: string; fromName: string }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(company: string, paragraphs: string[], signature: string[]): { text: string; html: string } {
  const text = [...paragraphs, "", ...signature].join("\n\n").replace(/\n\n\n+/g, "\n\n");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#14213d;max-width:560px">
${paragraphs.map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n")}
<p style="margin:22px 0 0;border-top:1px solid #e3e7ef;padding-top:12px;color:#5b6475;font-size:13px">${signature.map(esc).join("<br>")}</p>
</div>`;
  return { text, html };
}

/** Signature d'un e-mail client : le service concerné, jamais le nom d'une personne. */
const sign = (company: string, service: Service, phone?: string | null) => signatureLines(company, service, phone);

export function quoteEmail(a: { company: string; phone?: string | null; clientName: string; number: string; subject?: string | null; totalTtc: string; validUntil?: string | null }): Mail {
  const subject = `Devis ${a.number}${a.subject ? ` — ${a.subject}` : ""} — ${a.company}`;
  const body = wrap(a.company, [
    "Bonjour,",
    `Suite à votre demande, veuillez trouver ci-joint notre devis ${a.number}${a.subject ? ` (${a.subject})` : ""}, d'un montant de ${a.totalTtc} TTC${a.validUntil ? `, valable jusqu'au ${a.validUntil}` : ""}.`,
    "Pour l'accepter, il vous suffit de nous le retourner signé avec la mention « bon pour accord », ou de répondre simplement à ce message. Nous restons à votre disposition pour toute question ou pour adapter la prestation.",
    "Cordialement,"
  ], sign(a.company, "commercial", a.phone));
  return { subject, ...body, fromName: senderName(a.company, "commercial") };
}

export function quoteFollowupEmail(a: { company: string; phone?: string | null; number: string; totalTtc: string; validUntil?: string | null; level?: number }): Mail {
  const last = (a.level ?? 1) >= 2;
  const subject = last ? `Dernier rappel — devis ${a.number} — ${a.company}` : `Votre devis ${a.number} — ${a.company}`;
  const body = wrap(a.company, [
    "Bonjour,",
    last
      ? `Sans réponse de votre part, notre devis ${a.number} (${a.totalTtc} TTC)${a.validUntil ? ` arrivera à échéance le ${a.validUntil}` : " va bientôt expirer"}. Si le projet est toujours d'actualité, il vous suffit de répondre « ok » à ce message pour que nous planifiions l'intervention.`
      : `Nous nous permettons de revenir vers vous au sujet de notre devis ${a.number} (${a.totalTtc} TTC)${a.validUntil ? `, valable jusqu'au ${a.validUntil}` : ""}. Avez-vous eu l'occasion de le consulter ?`,
    "Nous pouvons l'ajuster à vos besoins ou répondre à vos questions : répondez simplement à ce message.",
    "Cordialement,"
  ], sign(a.company, "commercial", a.phone));
  return { subject, ...body, fromName: senderName(a.company, "commercial") };
}

export function invoiceEmail(a: { company: string; phone?: string | null; number: string; totalTtc: string; dueDate?: string | null; period?: string | null; iban?: string | null }): Mail {
  const subject = `Facture ${a.number}${a.period ? ` — ${a.period}` : ""} — ${a.company}`;
  const body = wrap(a.company, [
    "Bonjour,",
    `Veuillez trouver ci-joint la facture ${a.number}${a.period ? ` relative à nos prestations de ${a.period}` : ""}, d'un montant de ${a.totalTtc} TTC${a.dueDate ? `, à régler avant le ${a.dueDate}` : ""}.`,
    a.iban ? `Règlement par virement bancaire — IBAN : ${a.iban}. Merci d'indiquer le numéro de facture en référence.` : "Règlement par virement bancaire. Merci d'indiquer le numéro de facture en référence.",
    "Pour toute question, répondez simplement à ce message.",
    "Cordialement,"
  ], sign(a.company, "facturation", a.phone));
  return { subject, ...body, fromName: senderName(a.company, "facturation") };
}

/**
 * Relance de facture, écrite d'après la situation :
 *  - le niveau : 1 = rappel courtois (« sauf erreur de notre part ») ; 2 = rappel ferme, qui cite le précédent ; 3 et plus = dernier rappel ;
 *  - le client : professionnel = frais de recouvrement annoncés (niveaux 1 et 2) puis ajoutés (à partir de `feeLevel`) ;
 *    particulier ou nature inconnue = jamais de frais (la loi ne les prévoit qu'entre professionnels), mais une proposition de solution ;
 *  - le paiement : un règlement partiel est remercié et seul le reste dû est demandé ;
 *  - la pièce jointe et l'IBAN ne sont cités que s'ils sont vraiment fournis.
 * `remaining` = reste à régler TTC, `totalWithFee` = reste à régler + frais, déjà formatés.
 */
export function reminderEmail(a: {
  company: string; phone?: string | null; number: string; totalTtc: string; dueDate: string; level?: number;
  fee?: string; feeLevel?: number; totalWithFee?: string; interventionDate?: string | null;
  professional?: boolean; remaining?: string | null; daysLate?: number | null; previousDate?: string | null;
  period?: string | null; iban?: string | null; attached?: boolean;
}): Mail {
  const level = Math.max(1, a.level ?? 1);
  const feeLevel = a.feeLevel ?? 3;
  const fee = a.fee ?? "40,00 €";
  const pro = a.professional === true;
  const withFee = pro && level >= feeLevel;
  const subject = level === 1 ? `Facture ${a.number} — rappel d'échéance`
    : withFee ? `Facture ${a.number} — ${level}e rappel et frais de recouvrement`
    : level >= feeLevel ? `Facture ${a.number} — dernier rappel`
    : `Facture ${a.number} — ${level}e rappel`;

  const partial = !!a.remaining && a.remaining !== a.totalTtc;
  const what = `la facture ${a.number}${a.period ? ` (prestations de ${a.period})` : a.interventionDate ? ` pour l'intervention du ${a.interventionDate}` : ""}`;
  const amount = partial ? `d'un montant de ${a.totalTtc} TTC, dont il reste ${a.remaining} TTC à régler après votre règlement partiel` : `d'un montant de ${a.totalTtc} TTC`;
  const due = `arrivée à échéance le ${a.dueDate}${level > 1 && a.daysLate && a.daysLate > 1 ? ` (${a.daysLate} jours de retard)` : ""}`;
  const unpaid = partial ? "n'est pas encore soldée" : "n'a pas encore été réglée";

  const paras = ["Bonjour,"];
  if (level === 1) paras.push(`Sauf erreur ou omission de notre part, ${what} ${amount}, ${due}, ${unpaid}.`);
  else if (level < feeLevel) paras.push(`Malgré notre rappel${a.previousDate ? ` du ${a.previousDate}` : ""}, ${what} ${amount}, ${due}, ${partial ? "n'est toujours pas soldée" : "reste impayée"}.`);
  else paras.push(`Malgré nos précédents rappels, ${what} ${amount}, ${due}, ${partial ? "n'est toujours pas soldée" : "reste impayée"}.`);

  if (withFee) paras.push(`Conformément à nos conditions de règlement, des frais de recouvrement de ${fee} s'ajoutent à cette relance${a.totalWithFee ? ` : le montant total à régler est de ${a.totalWithFee} TTC` : ""}. Nous vous remercions de régler sans délai.`);
  else if (level >= feeLevel) paras.push("Nous vous remercions de la régler sans délai. Si vous rencontrez une difficulté, répondez à ce message : nous chercherons ensemble une solution.");
  else if (level > 1) paras.push("Merci de procéder à son règlement dès réception de ce message, ou de nous indiquer la date de paiement prévue en répondant à cet e-mail.");

  if (pro && level < feeLevel - 1) paras.push(`Conformément à nos conditions de règlement, des frais de recouvrement de ${fee} s'ajouteront à notre ${feeLevel}e relance en l'absence de règlement.`);
  else if (pro && level === feeLevel - 1) paras.push(`Sans règlement de votre part, des frais de recouvrement de ${fee} seront ajoutés à notre prochaine relance, conformément à nos conditions de règlement.`);

  const pay = [
    ...(a.attached ? ["Vous trouverez la facture en pièce jointe."] : []),
    ...(a.iban ? [`Règlement par virement bancaire — IBAN : ${a.iban}. Merci d'indiquer le numéro ${a.number} en référence.`] : [])
  ].join(" ");
  if (pay) paras.push(pay);
  paras.push("Si votre règlement a été effectué entre-temps, merci de ne pas tenir compte de ce message.");
  paras.push("Cordialement,");
  return { subject, ...wrap(a.company, paras, sign(a.company, "facturation", a.phone)), fromName: senderName(a.company, "facturation") };
}

/**
 * Facture envoyée avec le mandat d'intervention complété (méthode SWYFO) :
 * le mandat complété d'abord, puis la facture, les modalités et le règlement.
 */
export function mandateInvoiceEmail(a: {
  company: string; phone?: string | null; number: string; interventionDate: string; mandateDate: string; mission: string; siteLabel: string;
  keysNote: string; amountLine: string; observations?: string | null; dueDate: string; paymentDaysLabel: string;
  provider: string; iban?: string | null; bic?: string | null; confirmAsk?: boolean;
}): Mail {
  const subject = `Facture ${a.number} + mandat d'intervention complété — ${a.siteLabel}`;
  const mandate = [
    "MANDAT D'INTERVENTION PONCTUELLE — partie complétée par le prestataire",
    `1 — Adresse de remise des clés : ${a.keysNote}`,
    `2 — Site d'intervention : ${a.siteLabel}`,
    `Montant : ${a.amountLine}`,
    `3 — Contenu de la mission : ${a.mission}${a.observations ? ` Observations : ${a.observations}` : ""}`,
    `4 — Prestataire : ${a.provider}`
  ].join("\n");
  const pay = [`Facture ${a.number} — paiement ${a.paymentDaysLabel} (échéance ${a.dueDate}), par virement. Aucun escompte pour paiement anticipé.`,
    ...(a.iban ? [`Règlement par virement — Titulaire : ${a.company} — IBAN : ${a.iban}${a.bic ? ` — BIC : ${a.bic}` : ""} — Référence à indiquer : ${a.number}`] : [])].join("\n");
  const body = wrap(a.company, [
    "Bonjour,",
    `Suite à l'intervention du ${a.interventionDate}, réalisée dans le cadre de votre mandat du ${a.mandateDate}, vous trouverez ci-dessous le mandat complété, puis la facture correspondante (en pièce jointe).`,
    mandate, pay,
    ...(a.confirmAsk === false ? [] : ["Merci de nous confirmer la validation du mandat. Nous restons à votre disposition pour toute question."]),
    "Bien cordialement,"
  ], sign(a.company, "facturation", a.phone));
  return { subject, ...body, fromName: senderName(a.company, "facturation") };
}

/** Récapitulatif envoyé au patron après chaque passage de l'automatisation. */
export function digestEmail(a: { company: string; day: string; lines: string[]; todo: string[] }): Mail {
  const subject = `Récapitulatif automatique du ${a.day} — ${a.company}`;
  const paragraphs = [
    ...(a.lines.length ? ["Ce qui s'est passé :", ...a.lines.map((l) => `• ${l}`)] : []),
    ...(a.todo.length ? ["À faire par vous :", ...a.todo.map((l) => `• ${l}`)] : [])
  ];
  const body = wrap(a.company, paragraphs.length ? paragraphs : ["Rien à signaler."], ["ProClean CRM — message automatique"]);
  return { subject, ...body, fromName: a.company };
}
