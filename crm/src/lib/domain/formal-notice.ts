import { formatEUR, round2 } from "../utils";

export interface NoticeInvoice { number: string; issueDate: string; dueDate: string; remainingTtc: number }
export interface NoticeInput {
  company: { name: string; legalForm?: string | null; address?: string | null; siret?: string | null };
  client: { name: string; kind: string };
  invoices: NoticeInvoice[];
  /** Date du jour au format JJ/MM/AAAA. */
  today: string;
  /** Délai laissé pour payer, en jours. */
  deadlineDays?: number;
}

/**
 * Courrier de mise en demeure — texte PRÉPARÉ, jamais envoyé automatiquement.
 * L'indemnité forfaitaire de 40 € (art. L.441-10 et D.441-5 du Code de commerce) ne vaut qu'entre professionnels.
 * Le texte est un modèle : à relire (comptable / conseil) ; pour valeur probante, l'envoyer aussi en recommandé avec avis de réception.
 */
export function buildFormalNotice(n: NoticeInput): { subject: string; body: string } {
  const days = n.deadlineDays ?? 8;
  const total = round2(n.invoices.reduce((a, i) => a + i.remainingTtc, 0));
  const pro = n.client.kind === "entreprise";
  const nums = n.invoices.map((i) => i.number).join(", ");
  const subject = `Mise en demeure de payer — ${n.invoices.length > 1 ? "factures" : "facture"} ${nums}`;
  const lines = n.invoices.map((i) => `• Facture ${i.number} du ${i.issueDate}, échue le ${i.dueDate} : ${formatEUR(i.remainingTtc)} TTC restant dû`);
  const fees = pro
    ? `Conformément aux articles L.441-10 et D.441-5 du Code de commerce, une indemnité forfaitaire de 40 € pour frais de recouvrement est due pour chaque facture impayée à l'échéance, en sus des pénalités de retard prévues aux conditions de règlement figurant sur nos factures.`
    : `Les pénalités de retard prévues aux conditions de règlement figurant sur nos factures sont applicables.`;
  const body = [
    "Madame, Monsieur,",
    `Malgré nos relances, les sommes suivantes restent impayées à ce jour :`,
    lines.join("\n"),
    `Soit un total de ${formatEUR(total)} TTC.`,
    `Par la présente, nous vous mettons en demeure de régler cette somme dans un délai de ${days} jours à compter de la réception de ce courrier.`,
    `${fees} À défaut de règlement dans ce délai, nous nous réservons le droit d'engager toute procédure de recouvrement, les frais éventuels étant alors à votre charge.`,
    `Si vous avez réglé entre-temps, merci de nous en transmettre la preuve et de ne pas tenir compte de ce courrier.`,
    `Fait le ${n.today}.`,
    `Service Facturation & Recouvrement\n${n.company.name}${n.company.legalForm ? ` (${n.company.legalForm})` : ""}${n.company.address ? `\n${n.company.address}` : ""}${n.company.siret ? `\nSIRET ${n.company.siret}` : ""}\ncontact@procleanempire.com`
  ].join("\n\n");
  return { subject, body };
}
