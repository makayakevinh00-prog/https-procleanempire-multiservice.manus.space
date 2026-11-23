import { formatDate, formatEUR } from "@/lib/utils";

export interface BatchInvoice { id: string; number: string; total_ttc: number | string; paid_amount: number | string | null; due_date: string | null; status: string }

/** Reste à payer d'une facture (0 si acquittée). */
export const remainingOf = (i: BatchInvoice) => (i.status === "paye" ? 0 : Math.max(0, Math.round((Number(i.total_ttc) - Number(i.paid_amount ?? 0)) * 100) / 100));

/** Factures qu'on peut envoyer en un seul e-mail : émises (numérotées), ni brouillon ni annulées. */
export const sendable = (i: { number: string | null; status: string }) => !!i.number && i.status !== "brouillon" && i.status !== "annule";

/** Objet et texte de l'e-mail qui réunit plusieurs factures d'un même client. Ton neutre : c'est un envoi, pas une relance. */
export function batchEmail(invoices: BatchInvoice[], sign: string): { subject: string; text: string } {
  const lines = invoices.map((i) => {
    const rest = remainingOf(i);
    return `- Facture ${i.number} : ${formatEUR(i.total_ttc)} TTC — ${rest === 0 ? "acquittée" : `${rest < Number(i.total_ttc) ? `reste ${formatEUR(rest)}, ` : ""}à régler avant le ${formatDate(i.due_date)}`}`;
  });
  const total = Math.round(invoices.reduce((s, i) => s + remainingOf(i), 0) * 100) / 100;
  const one = invoices.length === 1;
  return {
    subject: one ? `Facture ${invoices[0].number} — ProClean Empire` : `Vos ${invoices.length} factures — ProClean Empire`,
    text: `Bonjour,\n\nVeuillez trouver ci-joint ${one ? "votre facture" : `vos ${invoices.length} factures`} :\n\n${lines.join("\n")}\n\n${total > 0 ? `Total restant à régler : ${formatEUR(total)} TTC.` : "Aucun règlement n'est à effectuer : merci pour votre confiance."}\n\nCordialement,\n${sign}`
  };
}
