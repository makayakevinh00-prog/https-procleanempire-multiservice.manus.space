import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { getSettings, num } from "@/lib/data";
import { addDays, monthOf, parisToday } from "@/lib/domain/dates";
import { superviseAlerts, summarizeAlerts, type AlertSummary, type AlertsSnapshot, type SupervisedAlert, type Tracked } from "./alerts";

type Supa = ReturnType<typeof createClient>;
export interface AlertsView { computedAt: string; alerts: SupervisedAlert[]; summary: AlertSummary; tracked: Record<string, Tracked> | null; errors: string[] }

/**
 * Lecture SEULE (session du patron, la RLS décide). Une source illisible est signalée dans `errors`,
 * jamais remplacée par un zéro : les alertes de cette source sont alors absentes ET annoncées comme telles.
 */
export async function loadAlerts(sb: Supa, now: Date = new Date()): Promise<AlertsView> {
  const errors: string[] = [];
  const today = parisToday(now);
  const settings = await getSettings(sb);
  const q = async <T,>(name: string, p: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> => {
    const { data, error } = await p;
    if (error) { errors.push(`${name} : ${error.message.slice(0, 120)}`); return []; }
    return (data as T[]) ?? [];
  };
  const cut = new Date(now.getTime() - settings.quote_followup_days * 86_400_000).toISOString();
  const [mail, claims, anomalies, reqs, prospects, qAcc, qSent, inv, pay, check, validate, confirm, upcoming, unbilled, contracts, noEmail, today_] = await Promise.all([
    q<any>("e-mails", sb.from("email_log").select("id, to_email, subject, error, sent_at").eq("ok", false).eq("acknowledged", false).gte("sent_at", new Date(now.getTime() - 7 * 86_400_000).toISOString()).limit(200)),
    q<any>("réclamations", sb.from("mission_issues").select("id, severity, description, clients(name)").eq("status", "ouverte").eq("kind", "reclamation").limit(200)),
    q<any>("anomalies", sb.from("mission_issues").select("id, severity, description, clients(name)").eq("status", "ouverte").eq("kind", "anomalie").limit(200)),
    q<any>("demandes", sb.from("quote_requests").select("id, name, received_at").eq("status", "nouvelle").limit(200)),
    q<any>("prospects", sb.from("clients").select("id, name").eq("pipeline", "a_contacter").limit(200)),
    q<any>("devis acceptés", sb.from("quotes").select("id, number, total_ht, invoice_id, clients(name, is_reserved), invoices:invoice_id(status)").eq("status", "accepte").limit(300)),
    q<any>("devis envoyés", sb.from("quotes").select("id, number, sent_at, clients(name)").eq("status", "envoye").lt("sent_at", cut).limit(300)),
    q<any>("factures", sb.from("invoices").select("id, number, status, due_date, total_ht, total_ttc, billing_month, sent_at, clients(name, is_reserved)").in("status", ["brouillon", "envoye", "en_retard"]).limit(1000)),
    q<any>("paiements", sb.from("payments").select("id, amount, counterparty, label").in("match_status", ["non_rapproche", "propose"]).limit(300)),
    q<any>("missions à vérifier", sb.from("interventions").select("id, title, scheduled_date, clients(name)").eq("stage", "a_verifier").limit(300)),
    q<any>("missions à valider", sb.from("interventions").select("id, title, scheduled_date, clients(name)").eq("stage", "terminee").is("invoice_id", null).limit(300)),
    q<any>("passages à confirmer", sb.from("interventions").select("id, title, scheduled_date, clients(name)").eq("status", "planifie").lte("scheduled_date", today).is("invoice_id", null).limit(300)),
    q<any>("affectations", sb.from("interventions").select("id, contract_id, title, scheduled_date, staff_id, assignee, clients(name), contracts(label)").eq("status", "planifie").gte("scheduled_date", today).lte("scheduled_date", addDays(today, 7)).limit(500)),
    q<any>("prestations non facturées", sb.from("interventions").select("id, title, scheduled_date, clients(name)").eq("status", "realise").eq("billable", true).is("invoice_id", null).lt("scheduled_date", `${monthOf(today)}-01`).limit(300)),
    q<any>("contrats", sb.from("contracts").select("*, clients(name)").eq("status", "actif").limit(500)),
    q<any>("clients", sb.from("clients").select("id, name").eq("status", "actif").is("email", null).limit(500)),
    q<any>("arrivées", sb.from("interventions").select("id, title, start_time, staff_id, clients(name), staff(full_name)").eq("scheduled_date", today).not("staff_id", "is", null).is("arrived_at", null).in("stage", ["planifiee", "affectee", "en_route"]).limit(200))
  ]);
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).format(now).split(":");
  const nowMinutes = Number(parts[0]) * 60 + Number(parts[1]);
  const mis = (r: any) => ({ id: r.id, title: r.title, client_name: r.clients?.name ?? null, scheduled_date: r.scheduled_date });
  const snap: AlertsSnapshot = {
    today, nowMinutes,
    settings: { unpaid_alert_days: settings.unpaid_alert_days, reminder_manual_days: settings.reminder_manual_days, quote_followup_days: settings.quote_followup_days, large_amount_threshold_ht: Number(settings.large_amount_threshold_ht) },
    mailFailures: mail,
    notArrived: today_.filter((r) => r.start_time && nowMinutes > Number(r.start_time.slice(0, 2)) * 60 + Number(r.start_time.slice(3, 5)) + 15).map((r) => ({ id: r.id, title: r.title, client_name: r.clients?.name ?? null, start_time: r.start_time, staff_name: r.staff?.full_name ?? null })),
    claims: claims.map((r) => ({ id: r.id, severity: r.severity, description: r.description, client_name: r.clients?.name ?? "Client" })),
    anomalies: anomalies.map((r) => ({ id: r.id, severity: r.severity, description: r.description, client_name: r.clients?.name ?? "Client" })),
    requests: reqs, prospects,
    quotesAccepted: qAcc.map((r) => ({ id: r.id, number: r.number, total_ht: num(r.total_ht), client_name: r.clients?.name ?? "Client", reserved: !!r.clients?.is_reserved, invoice_id: r.invoice_id, invoice_status: r.invoices?.status ?? null })),
    quotesSent: qSent.map((r) => ({ id: r.id, number: r.number, client_name: r.clients?.name ?? "Client", sent_at: r.sent_at })),
    invoices: inv.map((r) => ({ id: r.id, number: r.number, status: r.status, due_date: r.due_date, total_ht: num(r.total_ht), total_ttc: num(r.total_ttc), client_name: r.clients?.name ?? "Client", reserved: !!r.clients?.is_reserved, billing_month: r.billing_month, sent_at: r.sent_at })),
    payments: pay.map((r) => ({ id: r.id, amount: num(r.amount), counterparty: r.counterparty, label: r.label })),
    missionsToCheck: check.map(mis), missionsToValidate: validate.map(mis), missionsToConfirm: confirm.map(mis), missionsUnbilled: unbilled.map(mis),
    upcoming: upcoming.map((r) => ({ id: r.id, contract_id: r.contract_id, scheduled_date: r.scheduled_date, staff_id: r.staff_id, assignee: r.assignee, title: r.title, client_name: r.clients?.name ?? null, contract_label: r.contracts?.label ?? null })),
    contracts: contracts.map((k) => ({ id: k.id, label: k.label, client_name: k.clients?.name ?? "Client", billing_mode: k.billing_mode, monthly_amount_ht: k.monthly_amount_ht === null ? null : Number(k.monthly_amount_ht), per_visit_amount_ht: k.per_visit_amount_ht === null ? null : Number(k.per_visit_amount_ht), terms: k.terms, weekdays: k.weekdays, visits_per_week: k.visits_per_week === null ? null : Number(k.visits_per_week), hours_per_visit: k.hours_per_visit === null ? null : Number(k.hours_per_visit), site_address: k.site_address, assignee: k.assignee, start_date: k.start_date })),
    clientsNoEmail: noEmail
  };
  const alerts = superviseAlerts(snap);

  // Suivi de résolution : lignes jarvis_alerts si le socle est installé, sinon indisponible (jamais inventé).
  let tracked: Map<string, Tracked> | null = null;
  const t = await sb.from("jarvis_alerts").select("agent_key, dedupe_key, status, first_seen_at, resolved_at, resolved_reason").gte("last_seen_at", new Date(now.getTime() - 30 * 86_400_000).toISOString()).limit(2000);
  if (!t.error) tracked = new Map((t.data ?? []).map((r: any) => [`${r.agent_key}:${r.dedupe_key}`, { status: r.status, first_seen_at: r.first_seen_at, resolved_at: r.resolved_at, resolved_reason: r.resolved_reason } as Tracked]));
  else if (!/jarvis_|does not exist|schema cache|Could not find/i.test(t.error.message)) errors.push(`suivi : ${t.error.message.slice(0, 120)}`);
  return { computedAt: now.toISOString(), alerts, summary: summarizeAlerts(alerts, tracked), tracked: tracked ? Object.fromEntries(tracked) : null, errors };
}
