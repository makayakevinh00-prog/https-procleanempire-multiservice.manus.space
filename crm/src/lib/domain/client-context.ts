import { formatEUR } from "../utils";

export interface ClientContextInput {
  client: { name: string; kind: string; status: string; email: string | null; phone: string | null; address: string | null; notes: string | null; is_reserved: boolean };
  invoices: { number: string | null; status: string; subject: string | null; total_ttc: number; paid_amount: number; due_date: string | null; reminder_count: number }[];
  quotes: { number: string; status: string; subject: string | null; total_ttc: number; sent_at: string | null }[];
  contracts: { label: string; status: string; monthly_amount_ht: number | null; per_visit_amount_ht: number | null }[];
  mails: { direction: string; kind: string; subject: string | null; body: string; occurred_at: string }[];
  interactions: { kind: string; summary: string; occurred_at: string }[];
}

const d = (iso: string) => iso.slice(0, 10);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Résumé texte de tout ce que le CRM sait d'un client, donné à l'IA pour préparer une réponse. Borné en taille. */
export function formatClientContext(c: ClientContextInput): string {
  const out: string[] = [];
  const k = c.client;
  out.push(`CLIENT : ${k.name} (${k.kind}, ${k.status})${k.is_reserved ? " — CONTACT RÉSERVÉ : ne rien promettre, ne pas relancer" : ""}`);
  if (k.email) out.push(`E-mail : ${k.email}`);
  if (k.notes) out.push(`Notes internes : ${clip(k.notes, 1200)}`);
  if (c.contracts.length) out.push("CONTRATS :\n" + c.contracts.map((x) => `- ${x.label} (${x.status})${x.monthly_amount_ht != null ? `, ${formatEUR(x.monthly_amount_ht)} HT/mois` : x.per_visit_amount_ht != null ? `, ${formatEUR(x.per_visit_amount_ht)} HT/passage` : ""}`).join("\n"));
  if (c.quotes.length) out.push("DEVIS :\n" + c.quotes.slice(0, 10).map((q) => `- ${q.number} (${q.status}) ${formatEUR(q.total_ttc)} TTC${q.sent_at ? `, envoyé le ${d(q.sent_at)}` : ""}${q.subject ? ` — ${clip(q.subject, 80)}` : ""}`).join("\n"));
  if (c.invoices.length) out.push("FACTURES :\n" + c.invoices.slice(0, 15).map((i) => `- ${i.number ?? "brouillon"} (${i.status}) ${formatEUR(i.total_ttc)} TTC, payé ${formatEUR(i.paid_amount)}${i.due_date ? `, échéance ${i.due_date}` : ""}${i.reminder_count ? `, ${i.reminder_count} relance(s)` : ""}`).join("\n"));
  if (c.interactions.length) out.push("HISTORIQUE (notes, appels) :\n" + c.interactions.slice(0, 15).map((x) => `- ${d(x.occurred_at)} [${x.kind}] ${clip(x.summary, 200)}`).join("\n"));
  if (c.mails.length) out.push("DERNIERS MAILS :\n" + c.mails.slice(0, 8).map((m) => `- ${d(m.occurred_at)} ${m.direction === "recu" ? "REÇU" : "ENVOYÉ"}${m.subject ? ` « ${clip(m.subject, 100)} »` : ""} : ${clip(m.body.replace(/\s+/g, " "), 400)}`).join("\n"));
  return out.join("\n\n");
}
