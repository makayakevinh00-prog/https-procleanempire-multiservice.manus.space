import type { SupabaseClient } from "@supabase/supabase-js";
import { getSettings, num } from "@/lib/data";
import { formalNoticeEligibility } from "@/lib/domain/reminders";
import { daysBetween, formatEUR } from "@/lib/utils";

/** Une ligne de la section « À faire maintenant » de l'accueil. */
export type TodoLine = { key: string; tone: "red" | "orange" | "blue"; text: string; href: string };

export interface TodoInput {
  /** Mails reçus non traités (plus récents d'abord). */
  mails: { id: string; client_id: string | null; from_email: string | null; client_name: string | null; client_kind: string | null; draftReady: boolean }[];
  quotes: { id: string; number: string; sent_at: string; client_name: string; is_reserved: boolean }[];
  drafts: { id: string; total_ht: number; client_name: string; is_reserved: boolean }[];
  late: { id: string; number: string; due_date: string; reminder_count: number; last_reminder_at: string | null; status: string; client_name: string; is_reserved: boolean }[];
  settings: { reminder_max_count: number; reminder_interval_days: number; quote_followup_days: number };
  now?: Date;
}

/** Prénom pour un particulier (« Ahmed »), nom complet pour une entreprise (« SEA »). */
export function shortName(name: string | null, kind: string | null): string {
  if (!name) return "Quelqu'un";
  return kind === "entreprise" ? name : name.trim().split(/\s+/)[0];
}

/** Au-delà, la liste se coupe : l'accueil reste lisible, le reste est sur « Actions à faire ». */
export const TODO_MAX_LINES = 12;

export function buildTodoLines(i: TodoInput): { lines: TodoLine[]; hidden: number } {
  const now = i.now ?? new Date();
  const lock = (r: boolean) => (r ? "🔒 " : "");
  const all: TodoLine[] = [];

  // 1. Mails : une ligne par client (plusieurs mails du même client = une seule ligne)
  const byClient = new Map<string, TodoInput["mails"]>();
  for (const m of i.mails) {
    const k = m.client_id ?? `inconnu:${m.from_email}`;
    byClient.set(k, [...(byClient.get(k) ?? []), m]);
  }
  for (const [k, ms] of byClient) {
    const first = ms[0];
    if (!first.client_id) {
      all.push({ key: `mail_${k}`, tone: "red", text: `${first.from_email} vous a écrit (aucune fiche client)`, href: "/clients/new" });
      continue;
    }
    const who = shortName(first.client_name, first.client_kind);
    const many = ms.length > 1 ? ` (${ms.length} mails)` : "";
    all.push({ key: `mail_${k}`, tone: "red", text: `${who} vous a envoyé un mail${many}${ms.some((m) => m.draftReady) ? " — réponse prête à valider" : ""}`, href: `/clients/${first.client_id}?onglet=echanges` });
  }

  // 2. Factures en retard (la plus ancienne d'abord)
  for (const f of [...i.late].sort((a, b) => a.due_date.localeCompare(b.due_date))) {
    const days = daysBetween(f.due_date, now);
    const notice = formalNoticeEligibility({ status: f.status, due_date: f.due_date, reminder_count: f.reminder_count, last_reminder_at: f.last_reminder_at }, i.settings, now).eligible;
    all.push({ key: `late_${f.id}`, tone: notice ? "red" : "orange", text: `${lock(f.is_reserved)}Facture ${f.number} (${f.client_name}) en retard de ${days} j${notice ? " — mise en demeure possible" : ""}`, href: `/factures/${f.id}` });
  }

  // 3. Brouillons à valider
  for (const d of i.drafts) all.push({ key: `draft_${d.id}`, tone: "orange", text: `${lock(d.is_reserved)}Facture brouillon de ${d.client_name} (${formatEUR(d.total_ht)} HT) à valider`, href: `/factures/${d.id}` });

  // 4. Devis envoyés sans réponse depuis plus de N jours (la plus ancienne d'abord)
  for (const q of [...i.quotes].sort((a, b) => a.sent_at.localeCompare(b.sent_at))) {
    const days = daysBetween(q.sent_at, now);
    if (days <= i.settings.quote_followup_days) continue;
    all.push({ key: `quote_${q.id}`, tone: "blue", text: `${lock(q.is_reserved)}Devis ${q.number} (${q.client_name}) sans réponse depuis ${days} j`, href: `/devis/${q.id}` });
  }

  return { lines: all.slice(0, TODO_MAX_LINES), hidden: Math.max(0, all.length - TODO_MAX_LINES) };
}

const MISSING_TABLE = /client_messages|42P01|PGRST205|schema cache/i;

/** Charge ce qui attend le patron. Si la migration 0020 n'est pas encore appliquée, la rubrique « mails » est vide (le reste fonctionne). */
export async function loadTodo(supabase: SupabaseClient): Promise<{ lines: TodoLine[]; hidden: number; mailsAvailable: boolean }> {
  const settings = await getSettings(supabase);
  const [invoices, quotes, msgs] = await Promise.all([
    supabase.from("invoices").select("id, number, status, due_date, total_ht, reminder_count, last_reminder_at, clients(name, is_reserved)").in("status", ["brouillon", "envoye", "en_retard"]),
    supabase.from("quotes").select("id, number, sent_at, clients(name, is_reserved)").eq("status", "envoye").not("sent_at", "is", null),
    supabase.from("client_messages").select("id, client_id, from_email, direction, kind, status, created_at, clients(name, kind)").or("and(direction.eq.entrant,status.eq.recu),and(kind.eq.reponse_ia,status.eq.a_valider)").order("created_at", { ascending: false }).limit(200)
  ]);
  for (const r of [invoices, quotes]) if (r.error) throw new Error(r.error.message);
  let mailsAvailable = true;
  let rows: any[] = [];
  if (msgs.error) {
    if (!MISSING_TABLE.test(`${msgs.error.code ?? ""} ${msgs.error.message}`)) throw new Error(msgs.error.message);
    mailsAvailable = false; // migration 0020 pas encore appliquée
  } else rows = msgs.data ?? [];

  const draftClients = new Set(rows.filter((m) => m.kind === "reponse_ia").map((m) => m.client_id));
  const mails = rows.filter((m) => m.direction === "entrant").map((m) => ({
    id: m.id, client_id: m.client_id, from_email: m.from_email, client_name: m.clients?.name ?? null, client_kind: m.clients?.kind ?? null, draftReady: draftClients.has(m.client_id)
  }));
  const inv = (invoices.data ?? []) as any[];
  const built = buildTodoLines({
    mails,
    quotes: ((quotes.data ?? []) as any[]).map((q) => ({ id: q.id, number: q.number, sent_at: q.sent_at, client_name: q.clients.name, is_reserved: q.clients.is_reserved })),
    drafts: inv.filter((i) => i.status === "brouillon").map((i) => ({ id: i.id, total_ht: num(i.total_ht), client_name: i.clients.name, is_reserved: i.clients.is_reserved })),
    late: inv.filter((i) => i.status === "en_retard" && i.due_date).map((i) => ({ id: i.id, number: i.number, due_date: i.due_date, reminder_count: i.reminder_count ?? 0, last_reminder_at: i.last_reminder_at, status: i.status, client_name: i.clients.name, is_reserved: i.clients.is_reserved })),
    settings
  });
  return { ...built, mailsAvailable };
}
