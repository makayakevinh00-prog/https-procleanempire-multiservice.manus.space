import { createAdmin } from "@/lib/supabase/server";
import { autoReminderDecision } from "@/lib/domain/reminders";
import { sendMail } from "@/lib/mail";
import { formatDate, formatEUR } from "@/lib/utils";
import type { Settings } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

/**
 * Relances automatiques (configurables, désactivées par défaut).
 * Garde-fous : jamais pour un contact réservé, jamais si une relance récente existe,
 * jamais au-dessus du seuil d'alerte (alerte patron) — la base re-vérifie tout dans register_reminder().
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const db = createAdmin();
  await db.rpc("refresh_overdue");
  const { data: s, error: se } = await db.from("app_settings").select("*").single();
  if (se || !s) return Response.json({ error: se?.message ?? "paramètres introuvables" }, { status: 500 });
  const settings = s as unknown as Settings;
  if (!settings.auto_reminders_enabled) return Response.json({ skipped: "relances automatiques désactivées" });

  const { data: invoices, error } = await db.from("invoices")
    .select("id, number, status, due_date, total_ht, total_ttc, reminder_count, last_reminder_at, clients(name, email, is_reserved)")
    .in("status", ["envoye", "en_retard"]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const report: { sent: string[]; skipped: { invoice: string; reason: string }[]; failed: { invoice: string; reason: string }[] } = { sent: [], skipped: [], failed: [] };

  for (const inv of invoices ?? []) {
    const c = (inv as any).clients;
    const label = inv.number ?? inv.id;
    const d = autoReminderDecision({
      status: inv.status, due_date: inv.due_date, reminder_count: inv.reminder_count, last_reminder_at: inv.last_reminder_at,
      client_is_reserved: c.is_reserved, total_ht: Number(inv.total_ht)
    }, settings);
    if (!d.allowed) { report.skipped.push({ invoice: label, reason: d.reason! }); continue; }
    if (!c.email) { report.skipped.push({ invoice: label, reason: "client sans e-mail" }); continue; }

    const { data: r, error: re } = await db.rpc("register_reminder", { p_invoice_id: inv.id, p_channel: "email", p_origin: "auto", p_note: "relance automatique" });
    if (re) { report.skipped.push({ invoice: label, reason: re.message }); continue; }

    const res = await sendMail({
      to: c.email,
      subject: `Relance — facture ${inv.number}`,
      text: `Bonjour,\n\nSauf erreur de notre part, la facture ${inv.number} (${formatEUR(inv.total_ttc)} TTC, échéance ${formatDate(inv.due_date)}) n'a pas encore été réglée. Merci de procéder au règlement ou de nous contacter si c'est déjà fait.\n\nCordialement,\nProClean Empire\ncontact@procleanempire.com`
    });
    if (!res.sent) {
      await db.rpc("undo_reminder", { p_reminder_id: r.id });
      report.failed.push({ invoice: label, reason: res.reason });
    } else report.sent.push(label);
  }
  return Response.json(report);
}
