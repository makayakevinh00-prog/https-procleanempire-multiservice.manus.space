import { formatEUR } from "../utils";
import { parisToday } from "./dates";

/** Délai (jours) au-delà duquel un devis envoyé sans réponse remonte sur l'accueil. */
export const QUOTE_NOANSWER_DAYS = 5;
/** Nombre maximal de lignes affichées sur l'accueil (le reste est sur « Tout voir »). */
export const HOME_TODO_MAX = 12;

export type HomeTodoLine = { key: string; tone: "red" | "orange" | "blue"; label: string; href: string };

export interface HomeTodoInput {
  /** Mails reçus non traités. */
  mails: { id: string; client_id: string; client_name: string }[];
  /** Devis envoyés (statut « envoye »). */
  quotes: { id: string; number: string; client_name: string; sent_at: string | null }[];
  /** Factures brouillon. */
  drafts: { id: string; client_name: string; total_ht: number; reserved?: boolean }[];
  /** Factures émises non soldées (envoye / en_retard). */
  open: { id: string; number: string | null; client_name: string; due_date: string | null; reserved?: boolean }[];
  now: Date;
}

/** Écart en jours CALENDAIRES (heure de Paris) : une échéance du 12 compte 15 jours de retard le 27, quelle que soit l'heure. */
const dayDiff = (iso: string, now: Date) => {
  const day = iso.length === 10 ? iso : parisToday(new Date(iso));
  return Math.round((Date.parse(`${parisToday(now)}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / 86_400_000);
};
const jours = (n: number) => `${n} jour${n > 1 ? "s" : ""}`;

/**
 * Construit « À faire maintenant » : une ligne courte par événement, sans compteur ni décor.
 * Ordre : mails reçus, impayés, brouillons à valider, devis sans réponse.
 */
export function buildHomeTodo(i: HomeTodoInput, max = HOME_TODO_MAX): { lines: HomeTodoLine[]; hidden: number } {
  const out: HomeTodoLine[] = [];

  // Un seul message par client, même s'il a écrit plusieurs fois.
  const byClient = new Map<string, { name: string; n: number }>();
  for (const m of i.mails) {
    const c = byClient.get(m.client_id) ?? { name: m.client_name, n: 0 };
    c.n += 1;
    byClient.set(m.client_id, c);
  }
  for (const [id, c] of byClient)
    out.push({ key: `mail_${id}`, tone: "red", label: c.n > 1 ? `${c.name} vous a envoyé ${c.n} mails` : `${c.name} vous a envoyé un mail`, href: `/clients/${id}?onglet=historique` });

  // Retard calculé sur l'échéance réelle : un statut « en retard » dont l'échéance est repoussée (paiement annoncé) n'est pas affiché.
  const late = i.open
    .filter((f) => f.due_date && dayDiff(f.due_date, i.now) >= 1)
    .map((f) => ({ f, days: dayDiff(f.due_date!, i.now) }))
    .sort((a, b) => b.days - a.days);
  for (const { f, days } of late)
    out.push({ key: `late_${f.id}`, tone: "red", label: `${f.number ?? "Facture"} (${f.client_name}) en retard de ${jours(days)}${f.reserved ? " — contact réservé" : ""}`, href: `/factures/${f.id}` });

  for (const d of i.drafts)
    out.push({ key: `draft_${d.id}`, tone: "orange", label: `Facture brouillon ${d.client_name} : ${formatEUR(d.total_ht)} HT à valider`, href: `/factures/${d.id}` });

  const stale = i.quotes
    .filter((q) => q.sent_at && dayDiff(q.sent_at, i.now) > QUOTE_NOANSWER_DAYS)
    .map((q) => ({ q, days: dayDiff(q.sent_at!, i.now) }))
    .sort((a, b) => b.days - a.days);
  for (const { q, days } of stale)
    out.push({ key: `quote_${q.id}`, tone: "orange", label: `Devis ${q.number} (${q.client_name}) sans réponse depuis ${jours(days)}`, href: `/devis/${q.id}` });

  return { lines: out.slice(0, max), hidden: Math.max(0, out.length - max) };
}
