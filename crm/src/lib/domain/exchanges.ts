/** Fil des échanges d'un client : rassemble les mails reçus, les réponses préparées/envoyées, les relances et les e-mails du CRM. */

export type ExchangeKind = "recu" | "envoye" | "relance" | "reponse_ia" | "mise_en_demeure";

export interface ExchangeItem {
  id: string;
  at: string; // ISO
  kind: ExchangeKind;
  title: string; // objet ou intitulé
  body?: string | null;
  status?: string | null;
  href?: string;
}

export interface TimelineInput {
  messages: { id: string; direction: "entrant" | "sortant"; kind: string; status: string; subject: string | null; body: string; created_at: string; received_at: string | null; sent_at: string | null }[];
  emails: { id: string; sent_at: string; kind: string; subject: string | null; ok: boolean; error: string | null; entity: string | null; entity_id: string | null }[];
  reminders: { id: string; invoice_id: string; sent_at: string; level: number; channel: string; origin: string; note: string | null; invoice_number?: string | null }[];
}

const EMAIL_KIND_LABEL: Record<string, string> = {
  facture: "Facture envoyée", devis: "Devis envoyé", relance_devis: "Relance de devis", relance_facture: "Relance de facture", recapitulatif: "Récapitulatif"
};

/** Les relances de facture envoyées par e-mail existent à la fois dans `reminders` et `email_log` : on garde la ligne `reminders` (niveau, canal). */
export function buildExchangeTimeline(i: TimelineInput): ExchangeItem[] {
  const out: ExchangeItem[] = [];
  for (const m of i.messages) {
    if (m.direction === "entrant") out.push({ id: `m_${m.id}`, at: m.received_at ?? m.created_at, kind: "recu", title: m.subject ?? "(sans objet)", body: m.body, status: m.status });
    else if (m.kind === "reponse_ia") out.push({ id: `m_${m.id}`, at: m.sent_at ?? m.created_at, kind: "reponse_ia", title: m.subject ?? "Réponse", body: m.body, status: m.status });
    else if (m.kind === "mise_en_demeure") out.push({ id: `m_${m.id}`, at: m.sent_at ?? m.created_at, kind: "mise_en_demeure", title: m.subject ?? "Mise en demeure", body: m.body, status: m.status });
    else out.push({ id: `m_${m.id}`, at: m.sent_at ?? m.created_at, kind: "envoye", title: m.subject ?? "(sans objet)", body: m.body, status: m.status });
  }
  for (const r of i.reminders) {
    out.push({
      id: `r_${r.id}`, at: r.sent_at, kind: "relance", status: "envoye",
      title: `Relance n°${r.level}${r.invoice_number ? ` — facture ${r.invoice_number}` : ""} (${r.channel}${r.origin === "auto" ? ", automatique" : ""})`, body: r.note, href: `/factures/${r.invoice_id}`
    });
  }
  const reminderTimes = i.reminders.map((r) => ({ inv: r.invoice_id, t: new Date(r.sent_at).getTime() }));
  for (const e of i.emails) {
    if (e.kind === "relance_facture" && e.ok && reminderTimes.some((r) => r.inv === e.entity_id && Math.abs(r.t - new Date(e.sent_at).getTime()) < 120_000)) continue;
    out.push({
      id: `e_${e.id}`, at: e.sent_at, kind: e.kind.startsWith("relance") ? "relance" : "envoye", status: e.ok ? "envoye" : "echec",
      title: `${EMAIL_KIND_LABEL[e.kind] ?? "E-mail"}${e.subject ? ` — ${e.subject}` : ""}`, body: e.ok ? null : `Non envoyé : ${e.error ?? "erreur inconnue"}`,
      href: e.entity === "invoice" ? `/factures/${e.entity_id}` : e.entity === "quote" ? `/devis/${e.entity_id}` : undefined
    });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
