import { createAdmin } from "@/lib/supabase/server";
import { autoReminderDecision, feeApplies, isBusinessDay, reminderRecipients, REMINDER_FEE_EUR, REMINDER_FEE_LEVEL } from "@/lib/domain/reminders";
import { monthLabel, parisToday } from "@/lib/domain/dates";
import { reminderEmail } from "@/lib/mail-templates";
import { sendMail } from "@/lib/mail";
import { daysBetween, formatDate, formatEUR } from "@/lib/utils";
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
  if (!isBusinessDay(parisToday())) return Response.json({ skipped: "jour non ouvré : les relances attendent le prochain jour ouvré" });

  const { data: invoices, error } = await db.from("invoices")
    .select("id, number, status, due_date, total_ht, total_ttc, paid_amount, billing_month, service_date, sent_to, reminder_count, last_reminder_at, clients(name, email, is_reserved, kind)")
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
    const to = reminderRecipients(c.email, (inv as any).sent_to);
    if (!to.length) { report.skipped.push({ invoice: label, reason: "client sans e-mail" }); continue; }

    const { data: r, error: re } = await db.rpc("register_reminder", { p_invoice_id: inv.id, p_channel: "email", p_origin: "auto", p_note: "relance automatique" });
    if (re) { report.skipped.push({ invoice: label, reason: re.message }); continue; }

    // Même relance que le passage quotidien : écrite d'après le niveau, le client et ce qui reste dû ; signée du service facturation.
    const x = inv as any;
    const remaining = Math.max(0, Math.round((Number(x.total_ttc) - Number(x.paid_amount ?? 0)) * 100) / 100);
    const mail = reminderEmail({
      company: settings.company_name ?? "ProClean Empire", phone: (settings as any).company_phone ?? null, number: x.number, totalTtc: formatEUR(x.total_ttc), dueDate: formatDate(x.due_date), level: r.level,
      fee: formatEUR(REMINDER_FEE_EUR), feeLevel: REMINDER_FEE_LEVEL, totalWithFee: formatEUR(remaining + REMINDER_FEE_EUR), professional: feeApplies(c.kind),
      remaining: formatEUR(remaining), daysLate: x.due_date ? daysBetween(x.due_date) : null, previousDate: x.last_reminder_at ? formatDate(x.last_reminder_at) : null,
      period: x.billing_month ? monthLabel(x.billing_month) : null, interventionDate: x.service_date ? formatDate(x.service_date) : null, iban: (settings as any).company_iban ?? null
    });
    const res = await sendMail({ to, subject: mail.subject, text: mail.text, html: mail.html, fromName: mail.fromName });
    if (!res.sent) {
      await db.rpc("undo_reminder", { p_reminder_id: r.id });
      report.failed.push({ invoice: label, reason: res.reason });
    } else report.sent.push(label);
  }
  return Response.json(report);
}
