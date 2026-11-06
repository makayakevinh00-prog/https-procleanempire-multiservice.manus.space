import { planMonthlyInvoices, type PlannedInvoice } from "../domain/billing-plan";
import { isLastDayOfMonth, monthLabel, monthOf, nextMonth, parisToday } from "../domain/dates";
import { contractIssues } from "../domain/contract-check";
import { contractVisits, type ScheduleContract } from "../domain/schedule";
import { autoReminderDecision } from "../domain/reminders";
import { renderPdf, pdfMoney, type PdfDoc } from "../pdf/document";
import { invoiceDoc } from "../pdf/doc-mapper";
import { REMINDER_FEE_EUR, REMINDER_FEE_LEVEL } from "../domain/reminders";
import { digestEmail, invoiceEmail, quoteFollowupEmail, reminderEmail, type Mail } from "../mail-templates";
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
  followups: { number: string; to: string; level: number }[];
  reminders: { number: string; to: string; level: number }[];
  planning: { created: number; incompleteContracts: string[] };
  skippedDrafts: string[];
  expiredQuotes: number;
  alerts: { unassigned_next7: number; to_confirm: number; requests_late: number; overdue_15: number };
  pendingMail: number;
  digestSent: boolean | "non configuré" | "rien à signaler";
}

const eur = (n: unknown) => pdfMoney(Number(n)).replace(/ /g, " ");
const fr = (d?: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "");

export async function runDaily(deps: Deps, opts: RunOptions = {}): Promise<Report> {
  const today = parisToday(deps.now ?? new Date());
  const month = opts.month ?? monthOf(today);
  const lastDay = isLastDayOfMonth(today);
  const report: Report = {
    today, month, enabled: false, generated: [], sent: [], failed: [], followups: [], reminders: [],
    planning: { created: 0, incompleteContracts: [] }, skippedDrafts: [], expiredQuotes: 0,
    alerts: { unassigned_next7: 0, to_confirm: 0, requests_late: 0, overdue_15: 0 }, pendingMail: 0, digestSent: "rien à signaler"
  };
  const call = async (name: string, args: Record<string, unknown>) => {
    const r = await deps.rpc(name, { p_secret: deps.secret, ...args });
    if (r.error) throw new Error(`${name} : ${r.error.message}`);
    return r.data;
  };
  /** Envoi + trace dans le journal des e-mails (la trace ne bloque jamais l'envoi). */
  const send = async (kind: string, m: MailInput, entity?: string, entityId?: string): Promise<MailResult> => {
    const res = await deps.sendMail(m);
    if (!opts.dryRun) {
      try {
        await call("automation_log_email", { p_kind: kind, p_to: Array.isArray(m.to) ? m.to.join(", ") : m.to, p_subject: m.subject, p_ok: res.sent, p_error: res.sent ? null : res.reason, p_entity: entity ?? null, p_entity_id: entityId ?? null });
      } catch { /* journal indisponible : l'envoi reste valable */ }
    }
    return res;
  };

  const data = await call("automation_month_data", { p_month: month });
  const settings = data.settings;
  report.enabled = Boolean(settings.auto_invoicing_enabled);
  const company: string = settings.company_name;

  // 0. Planning : passages du mois en cours et du mois suivant d'après les contrats (rejouable, sans doublon)
  const contracts = (data.contracts ?? []) as (ScheduleContract & { client_id: string })[];
  report.planning.incompleteContracts = (data.contracts ?? [])
    .filter((k: any) => k.status === "actif" && !(k.weekdays?.length > 0))
    .map((k: any) => k.label);
  if (settings.auto_planning_enabled && !opts.dryRun) {
    try {
      for (const m of [monthOf(today), nextMonth(monthOf(today))]) {
        const visits = contractVisits(contracts, m);
        if (visits.length) report.planning.created += Number(await call("automation_insert_interventions", { p_rows: visits })) || 0;
      }
    } catch (e) {
      report.failed.push({ what: "génération du planning", reason: (e as Error).message });
    }
  }

  // 0 bis. Devis envoyés dont la validité est dépassée
  if (!opts.dryRun) {
    try { report.expiredQuotes = Number(await call("automation_expire_quotes", {})) || 0; }
    catch (e) { report.failed.push({ what: "expiration des devis", reason: (e as Error).message }); }
  }

  // 1. Génération (et validation des seules factures éligibles) le dernier jour du mois
  if (report.enabled && (lastDay || opts.forceGenerate)) {
    // Un brouillon déjà préparé pour ce mois n'est JAMAIS écrasé (il peut avoir été corrigé) : il est signalé au patron.
    const draftIds = new Set<string>(data.draft_clients ?? []);
    report.skippedDrafts = (data.clients ?? []).filter((c: any) => draftIds.has(c.id)).map((c: any) => c.name);
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
          // Adresse principale + adresses supplémentaires « reçoit les factures » (dédoublonnées)
          const everyone = [client.email, ...((it.extra_emails as string[] | undefined) ?? [])].filter((e, k, a) => e && a.findIndex((x) => x.toLowerCase() === e.toLowerCase()) === k);
          const res = await send("facture", { to: everyone, subject: mail.subject, text: mail.text, html: mail.html, attachment: { filename: `${inv.number}.pdf`, bytes } }, "invoice", inv.id);
          if (res.sent) {
            await call("automation_mark_sent", { p_invoice_id: inv.id, p_to: everyone.join(", ") });
            report.sent.push({ number: inv.number, to: everyone.join(", ") });
          } else {
            report.failed.push({ what: `envoi ${inv.number} à ${everyone.join(", ")}`, reason: res.reason });
          }
        } catch (e) {
          report.failed.push({ what: `envoi ${inv.number}`, reason: (e as Error).message });
        }
      }
    }
  }

  // 3. Relances de devis sans réponse (relance 1, puis relance 2 ; arrêt dès que le statut change)
  if (!opts.dryRun) {
    try {
      const quotes: any[] = await call("automation_quotes_to_follow", {});
      for (const q of quotes) {
        if (!deps.mailConfigured()) { report.failed.push({ what: "relances de devis", reason: "clé e-mail non configurée" }); break; }
        const mail = quoteFollowupEmail({ company, phone: settings.company_phone, number: q.number, totalTtc: eur(q.total_ttc), validUntil: fr(q.valid_until), level: q.level });
        const res = await send("relance_devis", { to: q.email, subject: mail.subject, text: mail.text, html: mail.html }, "quote", q.id);
        if (res.sent) { await call("automation_quote_followup_done", { p_quote_id: q.id }); report.followups.push({ number: q.number, to: q.email, level: q.level }); }
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
          const lvl = Number(reminder.level ?? 1);
          const mail = reminderEmail({ company, phone: settings.company_phone, number: inv.number, totalTtc: eur(inv.total_ttc), dueDate: fr(inv.due_date), level: lvl, fee: eur(REMINDER_FEE_EUR), feeLevel: REMINDER_FEE_LEVEL, totalWithFee: eur(Number(inv.total_ttc) + REMINDER_FEE_EUR) });
          const res = await send("relance_facture", { to: client.email, subject: mail.subject, text: mail.text, html: mail.html }, "invoice", inv.id);
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

  // 4. Indicateurs d'exception
  if (!opts.dryRun) {
    try { report.alerts = { ...report.alerts, ...((await call("automation_alerts", {})) ?? {}) }; } catch { /* non bloquant */ }
  }

  // 5. Récapitulatif au patron
  const lines: string[] = [];
  const todo: string[] = [];
  for (const g of report.generated) {
    if (g.status === "validee") lines.push(`Facture ${g.number} — ${g.client} (${eur(g.totalHt)} HT) émise${report.enabled ? ", envoi prévu" : ""}.`);
    else todo.push(`Facture brouillon ${g.client} (${eur(g.totalHt)} HT) à relire et valider : ${g.reasons.join(" ; ") || "à valider"}.`);
  }
  for (const s of report.sent) lines.push(`Facture ${s.number} envoyée à ${s.to}.`);
  for (const r of report.reminders) lines.push(`Relance n°${r.level} de la facture ${r.number} envoyée à ${r.to}.`);
  for (const f of report.followups) lines.push(`Devis ${f.number} relancé (relance n°${f.level}, ${f.to}).`);
  if (report.planning.created) lines.push(`${report.planning.created} passage(s) ajouté(s) au planning d'après les contrats.`);
  if (report.expiredQuotes) lines.push(`${report.expiredQuotes} devis expiré(s) faute de réponse.`);
  for (const n of report.skippedDrafts) todo.push(`Facture de ${monthLabel(month)} déjà préparée en brouillon pour ${n} : l'automatisation ne l'écrase pas — validez-la, ou supprimez ce brouillon pour qu'elle soit refaite automatiquement.`);
  for (const f of report.failed) todo.push(`${f.what} : ${f.reason}.`);
  if (report.planning.incompleteContracts.length) todo.push(`${report.planning.incompleteContracts.length} contrat(s) actif(s) sans jours de passage, planning automatique impossible : ${report.planning.incompleteContracts.join(", ")}.`);
  if (report.alerts.unassigned_next7) todo.push(`${report.alerts.unassigned_next7} passage(s) des 7 prochains jours sans intervenant.`);
  if (report.alerts.to_confirm) todo.push(`${report.alerts.to_confirm} passage(s) passé(s) à confirmer dans le planning.`);
  if (report.alerts.requests_late) todo.push(`${report.alerts.requests_late} demande(s) de devis sans traitement depuis plus de 24 h.`);
  if (report.alerts.overdue_15) todo.push(`${report.alerts.overdue_15} facture(s) impayée(s) depuis plus de 15 jours de retard.`);

  if ((lines.length || todo.length) && !opts.dryRun) {
    const to = settings.notify_email || settings.company_email;
    if (!to || !deps.mailConfigured()) report.digestSent = "non configuré";
    else {
      const mail = digestEmail({ company, day: fr(today), lines, todo });
      report.digestSent = (await send("recapitulatif", { to, subject: mail.subject, text: mail.text, html: mail.html })).sent;
    }
  }

  // 6. Journal d'exécution (visible dans « Journal »)
  if (!opts.dryRun) {
    try {
      await call("automation_log_run", { p_ok: report.failed.length === 0, p_report: report, p_errors: report.failed.map((f) => `${f.what} : ${f.reason}`) });
    } catch { /* journal indisponible : sans effet sur le travail effectué */ }
  }
  return report;
}
