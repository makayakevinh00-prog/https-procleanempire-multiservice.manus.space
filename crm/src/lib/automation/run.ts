import { planMonthlyInvoices, type PlannedInvoice } from "../domain/billing-plan";
import { isLastDayOfMonth, monthLabel, monthOf, parisToday } from "../domain/dates";
import { renderPdf, pdfMoney, type PdfDoc } from "../pdf/document";
import { invoiceDoc } from "../pdf/doc-mapper";
import { digestEmail, invoiceEmail, quoteFollowupEmail, reminderEmail, type Mail } from "../mail-templates";
import { autoReminderDecision } from "../domain/reminders";
import type { MailInput, MailResult } from "../mail";

/** Dépendances injectées : le vrai client Supabase/Resend en production, des faux dans les tests. */
export interface Deps {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: any; error: { message: string } | null }>;
  sendMail: (m: MailInput) => Promise<MailResult>;
  mailConfigured: () => boolean;
  secret: string;
  now?: Date;
}

export interface RunOptions {
  /** Mois à facturer (YYYY-MM). Par défaut : le mois en cours, uniquement le dernier jour du mois. */
  month?: string;
  /** Génère même si ce n'est pas le dernier jour du mois (tests manuels). */
  forceGenerate?: boolean;
  /** Envoie tout de suite, sans attendre le lendemain. */
  forceSend?: boolean;
  /** Calcule et signale, n'écrit rien et n'envoie rien. */
  dryRun?: boolean;
}

export interface Report {
  today: string;
  month: string;
  enabled: boolean;
  generated: { client: string; number: string | null; totalHt: number; status: "validee" | "brouillon"; reasons: string[] }[];
  sent: { number: string; to: string }[];
  failed: { what: string; reason: string }[];
  followups: { number: string; to: string }[];
  reminders: { number: string; to: string; level: number }[];
  pendingMail: number;
  digestSent: boolean | "non configuré" | "rien à signaler";
}

const eur = (n: unknown) => pdfMoney(Number(n)).replace(/ /g, " ");
const fr = (d?: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "");

export async function runDaily(deps: Deps, opts: RunOptions = {}): Promise<Report> {
  const today = parisToday(deps.now ?? new Date());
  const month = opts.month ?? monthOf(today);
  const lastDay = isLastDayOfMonth(today);
  const report: Report = { today, month, enabled: false, generated: [], sent: [], failed: [], followups: [], reminders: [], pendingMail: 0, digestSent: "rien à signaler" };
  const call = async (name: string, args: Record<string, unknown>) => {
    const r = await deps.rpc(name, { p_secret: deps.secret, ...args });
    if (r.error) throw new Error(`${name} : ${r.error.message}`);
    return r.data;
  };

  const data = await call("automation_month_data", { p_month: month });
  const settings = data.settings;
  report.enabled = Boolean(settings.auto_invoicing_enabled);
  const company: string = settings.company_name;

  // 1. Génération (et validation des seules factures éligibles) le dernier jour du mois
  if (report.enabled && (lastDay || opts.forceGenerate)) {
    const plan: PlannedInvoice[] = planMonthlyInvoices({
      month, today, settings, clients: data.clients, contracts: data.contracts,
      interventions: data.interventions, invoicedClientIds: data.invoiced_clients
    });
    for (const p of plan) {
      if (opts.dryRun) {
        report.generated.push({ client: p.clientName, number: null, totalHt: p.totals.ht, status: p.autoSend ? "validee" : "brouillon", reasons: p.blockedReasons });
        continue;
      }
      try {
        const id: string = await call("automation_create_invoice", {
          p_client_id: p.clientId, p_month: month, p_subject: p.subject, p_lines: p.lines,
          p_intervention_ids: p.interventionIds, p_notes: null
        });
        let number: string | null = null;
        let status: "validee" | "brouillon" = "brouillon";
        const reasons = [...p.blockedReasons];
        if (p.autoSend) {
          try {
            number = await call("automation_validate_invoice", { p_invoice_id: id });
            status = "validee";
          } catch (e) {
            reasons.push(`validation refusée : ${(e as Error).message}`);
          }
        }
        report.generated.push({ client: p.clientName, number, totalHt: p.totals.ht, status, reasons });
      } catch (e) {
        report.failed.push({ what: `facture ${p.clientName}`, reason: (e as Error).message });
      }
    }
  }

  // 2. Envoi des factures validées (le lendemain par défaut, pour laisser une fenêtre de relecture)
  const sendWindow = report.enabled && !opts.dryRun && (!settings.month_end_send_next_day || !lastDay || opts.forceSend);
  if (sendWindow) {
    const pending = await call("automation_pending_send", {});
    const items: any[] = pending.items ?? [];
    report.pendingMail = items.length;
    if (items.length && !deps.mailConfigured()) {
      report.failed.push({ what: "envoi des factures", reason: "clé e-mail (RESEND_API_KEY) non configurée — les factures restent à envoyer" });
    } else {
      for (const it of items) {
        const inv = it.invoice, client = it.client;
        try {
          const doc: PdfDoc = invoiceDoc(inv, client, it.lines);
          const bytes = await renderPdf(doc, pending.settings);
          const mail: Mail = invoiceEmail({
            company, phone: pending.settings.company_phone, number: inv.number, totalTtc: eur(inv.total_ttc),
            dueDate: fr(inv.due_date), period: inv.billing_month ? monthLabel(inv.billing_month) : null, iban: pending.settings.company_iban
          });
          const res = await deps.sendMail({ to: client.email, subject: mail.subject, text: mail.text, html: mail.html, attachment: { filename: `${inv.number}.pdf`, bytes } });
          if (res.sent) {
            await call("automation_mark_sent", { p_invoice_id: inv.id, p_to: client.email });
            report.sent.push({ number: inv.number, to: client.email });
          } else {
            report.failed.push({ what: `envoi ${inv.number} à ${client.email}`, reason: res.reason });
          }
        } catch (e) {
          report.failed.push({ what: `envoi ${inv.number}`, reason: (e as Error).message });
        }
      }
    }
  }

  // 3. Relance des devis restés sans réponse
  if (!opts.dryRun) {
    try {
      const quotes: any[] = await call("automation_quotes_to_follow", {});
      for (const q of quotes) {
        if (!deps.mailConfigured()) { report.failed.push({ what: "relances de devis", reason: "clé e-mail non configurée" }); break; }
        const mail = quoteFollowupEmail({ company, phone: settings.company_phone, number: q.number, totalTtc: eur(q.total_ttc), validUntil: fr(q.valid_until) });
        const res = await deps.sendMail({ to: q.email, subject: mail.subject, text: mail.text, html: mail.html });
        if (res.sent) { await call("automation_quote_followup_done", { p_quote_id: q.id }); report.followups.push({ number: q.number, to: q.email }); }
        else report.failed.push({ what: `relance devis ${q.number}`, reason: res.reason });
      }
    } catch (e) {
      report.failed.push({ what: "relances de devis", reason: (e as Error).message });
    }
  }

  // 3 bis. Mise à jour des retards puis relances automatiques de factures impayées
  if (!opts.dryRun) {
    try {
      await call("automation_refresh_overdue", {});
      if (settings.auto_reminders_enabled) {
        const due = await call("automation_due_reminders", {});
        for (const it of (due.items ?? []) as any[]) {
          const inv = it.invoice, client = it.client;
          const decision = autoReminderDecision({
            status: inv.status, due_date: inv.due_date, reminder_count: inv.reminder_count, last_reminder_at: inv.last_reminder_at,
            client_is_reserved: client.is_reserved, total_ht: Number(inv.total_ht)
          }, due.settings, deps.now ?? new Date());
          if (!decision.allowed || !client.email) continue;
          if (!deps.mailConfigured()) { report.failed.push({ what: "relances de factures", reason: "clé e-mail non configurée" }); break; }
          let reminder: any;
          try { reminder = await call("automation_register_reminder", { p_invoice_id: inv.id }); } catch { continue; } // la base refuse : rien à faire
          const mail = reminderEmail({ company, phone: settings.company_phone, number: inv.number, totalTtc: eur(inv.total_ttc), dueDate: fr(inv.due_date) });
          const res = await deps.sendMail({ to: client.email, subject: mail.subject, text: mail.text, html: mail.html });
          if (res.sent) report.reminders.push({ number: inv.number, to: client.email, level: reminder.level });
          else {
            await call("automation_undo_reminder", { p_reminder_id: reminder.id }); // pas de relance fantôme
            report.failed.push({ what: `relance ${inv.number}`, reason: res.reason });
          }
        }
      }
    } catch (e) {
      report.failed.push({ what: "relances de factures", reason: (e as Error).message });
    }
  }

  // 4. Récapitulatif au patron
  const lines: string[] = [];
  const todo: string[] = [];
  for (const g of report.generated) {
    if (g.status === "validee") lines.push(`Facture ${g.number} — ${g.client} (${eur(g.totalHt)} HT) émise${report.enabled ? ", envoi prévu" : ""}.`);
    else todo.push(`Facture brouillon ${g.client} (${eur(g.totalHt)} HT) à relire et valider : ${g.reasons.join(" ; ") || "à valider"}.`);
  }
  for (const s of report.sent) lines.push(`Facture ${s.number} envoyée à ${s.to}.`);
  for (const r of report.reminders) lines.push(`Relance n°${r.level} de la facture ${r.number} envoyée à ${r.to}.`);
  for (const f of report.followups) lines.push(`Devis ${f.number} relancé (${f.to}).`);
  for (const f of report.failed) todo.push(`${f.what} : ${f.reason}.`);
  if ((lines.length || todo.length) && !opts.dryRun) {
    const to = settings.notify_email || settings.company_email;
    if (!to) report.digestSent = "non configuré";
    else if (!deps.mailConfigured()) report.digestSent = "non configuré";
    else {
      const mail = digestEmail({ company, day: fr(today), lines, todo });
      report.digestSent = (await deps.sendMail({ to, subject: mail.subject, text: mail.text, html: mail.html })).sent;
    }
  }
  return report;
}
