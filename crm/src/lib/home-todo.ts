import type { SupabaseClient } from "@supabase/supabase-js";
import { parisToday } from "@/lib/domain/dates";
import { buildHomeTodo, QUOTE_NOANSWER_DAYS, type HomeTodoLine } from "@/lib/domain/home-todo";
import { num } from "@/lib/data";

const missingTable = (e: { code?: string; message: string }) => e.code === "42P01" || e.code === "PGRST205" || /does not exist|schema cache/i.test(e.message);

/** Données de la section « À faire maintenant » de l'accueil. */
export async function loadHomeTodo(supabase: SupabaseClient): Promise<{ lines: HomeTodoLine[]; hidden: number; mailsUnavailable: boolean }> {
  const today = parisToday();
  const [mails, quotes, drafts, open] = await Promise.all([
    supabase.from("client_mails").select("id, client_id, clients(name)").eq("direction", "recu").eq("handled", false).order("occurred_at", { ascending: false }).limit(100),
    supabase.from("quotes").select("id, number, sent_at, clients(name)").eq("status", "envoye").lt("sent_at", new Date(Date.now() - QUOTE_NOANSWER_DAYS * 86_400_000).toISOString()),
    supabase.from("invoices").select("id, total_ht, clients(name, is_reserved)").eq("status", "brouillon"),
    supabase.from("invoices").select("id, number, due_date, clients(name, is_reserved)").in("status", ["envoye", "en_retard"]).lt("due_date", today)
  ]);
  // Mails : la table arrive avec la migration 0020. Tant qu'elle manque, on le dit sur la page au lieu de masquer l'absence.
  const mailsUnavailable = Boolean(mails.error && missingTable(mails.error));
  if (mails.error && !mailsUnavailable) throw new Error(mails.error.message);
  for (const r of [quotes, drafts, open]) if (r.error) throw new Error(r.error.message);

  const name = (r: any) => (Array.isArray(r.clients) ? r.clients[0]?.name : r.clients?.name) ?? "Client";
  const reserved = (r: any) => Boolean(Array.isArray(r.clients) ? r.clients[0]?.is_reserved : r.clients?.is_reserved);
  const built = buildHomeTodo({
    now: new Date(),
    mails: ((mails.data ?? []) as any[]).map((m) => ({ id: m.id, client_id: m.client_id, client_name: name(m) })),
    quotes: ((quotes.data ?? []) as any[]).map((q) => ({ id: q.id, number: q.number, client_name: name(q), sent_at: q.sent_at })),
    drafts: ((drafts.data ?? []) as any[]).map((d) => ({ id: d.id, client_name: name(d), total_ht: num(d.total_ht), reserved: reserved(d) })),
    open: ((open.data ?? []) as any[]).map((f) => ({ id: f.id, number: f.number, client_name: name(f), due_date: f.due_date, reserved: reserved(f) }))
  });
  return { ...built, mailsUnavailable };
}
