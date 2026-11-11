import type { SupabaseClient } from "@supabase/supabase-js";
import { getSettings, num, numOrNull } from "@/lib/data";
import { isLargeAmount } from "@/lib/domain/billing";
import { contractIssues } from "@/lib/domain/contract-check";
import { addDays, monthOf, parisToday } from "@/lib/domain/dates";
import { classifyAssignment } from "@/lib/jarvis/assignment";
import { spamScore } from "@/lib/request-spam";
import { daysBetween, formatEUR } from "@/lib/utils";

export type ActionTone = "red" | "orange" | "blue";

/** Une ligne de la liste « Actions à faire ». `count` = compteur agrégé ; sans `count` = élément précis. */
export type HiddenAction = { key: string; count_at: number | null; dismissed_at: string };
export type ActionItem = {
  key: string;
  tone: ActionTone;
  label: string;
  href: string;
  count?: number;
  /** Rubrique du menu à laquelle rattacher le compteur. */
  menu?: string;
};

/**
 * Source unique de tout ce qui attend une décision ou une action du patron.
 * Utilisée par l'Accueil, la page « Actions à faire » et les pastilles du menu,
 * pour que les chiffres soient toujours identiques partout.
 */
export async function loadActions(supabase: SupabaseClient): Promise<ActionItem[]> {
  const today = parisToday();
  const head = { count: "exact" as const, head: true };

  // Un SEUL lot de requêtes en parallèle (réglages, compteurs, « pas encore arrivé ») : un seul aller-retour sur le chemin critique.
  const [settings, contracts, invoices, quotes, payments, requests, dismissals, toConfirm, unassigned, unbilledDone, noAnswer, noEmail, mailFail, unsent, claims, anomalies, toCheck, toValidate, toContact, todayRowsRes] = await Promise.all([
    getSettings(supabase),
    supabase.from("contracts").select("*").eq("status", "actif"),
    supabase.from("invoices").select("id, number, status, due_date, total_ht, clients(id, name, is_reserved)").neq("status", "annule").in("status", ["brouillon", "envoye", "en_retard"]),
    supabase.from("quotes").select("id, number, total_ht, invoice_id, contract_id, clients(name, is_reserved), invoices:invoice_id(status)").eq("status", "accepte"),
    supabase.from("payments").select("id", head).in("match_status", ["non_rapproche", "propose"]),
    supabase.from("quote_requests").select("id, received_at, name, company, email, phone, service, message, details").eq("status", "nouvelle"),
    supabase.from("action_dismissals").select("key, count_at"),
    supabase.from("interventions").select("id", head).eq("status", "planifie").lte("scheduled_date", today).gte("scheduled_date", addDays(today, -45)).is("invoice_id", null),
    supabase.from("interventions").select("id, scheduled_date, staff_id, assignee, title, clients(name), contracts(label)").eq("status", "planifie").gte("scheduled_date", today).lte("scheduled_date", addDays(today, 7)),
    supabase.from("interventions").select("id", head).eq("status", "realise").eq("billable", true).is("invoice_id", null).lt("scheduled_date", `${monthOf(today)}-01`),
    supabase.from("quotes").select("id, sent_at").eq("status", "envoye").not("sent_at", "is", null),
    supabase.from("clients").select("id", head).eq("status", "actif").is("email", null),
    supabase.from("email_log").select("id", head).eq("ok", false).eq("acknowledged", false).gte("sent_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
    supabase.from("invoices").select("id", head).not("billing_month", "is", null).is("sent_at", null).in("status", ["envoye", "en_retard"]),
    supabase.from("mission_issues").select("id", head).eq("status", "ouverte").eq("kind", "reclamation"),
    supabase.from("mission_issues").select("id", head).eq("status", "ouverte").eq("kind", "anomalie"),
    supabase.from("interventions").select("id", head).eq("stage", "a_verifier"),
    supabase.from("interventions").select("id", head).eq("stage", "terminee").is("invoice_id", null),
    supabase.from("clients").select("id", head).eq("pipeline", "a_contacter"),
    supabase.from("interventions").select("start_time, arrived_at, staff_id, stage").eq("scheduled_date", today).not("staff_id", "is", null).is("arrived_at", null).in("stage", ["planifiee", "affectee", "en_route"])
  ]);
  for (const r of [contracts, invoices, quotes, payments, requests, toConfirm, unassigned, unbilledDone, noAnswer, noEmail, mailFail, unsent, claims, anomalies, toCheck, toValidate, toContact, todayRowsRes]) {
    if (r.error) throw new Error(r.error.message);
  }

  // Agents attendus mais pas encore pointés (plus de 15 min après l'heure prévue)
  const nowParts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()).split(":");
  const nowMin = Number(nowParts[0]) * 60 + Number(nowParts[1]);
  const todayRows = todayRowsRes.data;
  const notArrived = (todayRows ?? []).filter((r: any) => r.start_time && nowMin > Number(r.start_time.slice(0, 2)) * 60 + Number(r.start_time.slice(3, 5)) + 15).length;

  const followupCut = Date.now() - Number(settings.quote_followup_days) * 86_400_000;
  const noAnswerCount = ((noAnswer.data ?? []) as any[]).filter((q) => Date.parse(q.sent_at) < followupCut).length;

  // Demandes du site : le démarchage n'est jamais une action à faire.
  const realReqs = ((requests.data ?? []) as any[]).filter((r) => !spamScore(r).spam);
  const reqCount = realReqs.length;
  const reqLateCount = realReqs.filter((r) => Date.parse(r.received_at) < Date.now() - 86_400_000).length;
  const hidden = new Map<string, number | null>(((dismissals.data ?? []) as any[]).map((d) => [d.key as string, d.count_at as number | null]));
  const out: ActionItem[] = [];
  const add = (a: ActionItem) => { if (a.count === undefined || a.count > 0) out.push(a); };

  // Urgent
  add({ key: "mail_fail", tone: "red", count: mailFail.count ?? 0, label: "e-mail(s) en échec ces 7 derniers jours", href: "/journal" });
  add({ key: "not_arrived", tone: "red", count: notArrived, label: "agent(s) pas encore arrivé(s) sur place (plus de 15 min après l'heure prévue)", href: "/sur-place", menu: "/missions" });
  add({ key: "claims", tone: "red", count: claims.count ?? 0, label: "réclamation(s) client ouverte(s)", href: "/missions/problemes", menu: "/missions" });
  add({ key: "req_late", tone: "red", count: reqLateCount, label: "demande(s) de devis sans traitement depuis plus de 24 h", href: "/demandes", menu: "/clients" });

  const inv = (invoices.data ?? []) as any[];
  const open = inv.filter((i) => ["envoye", "en_retard"].includes(i.status));
  const late = open.filter((i) => i.status === "en_retard");
  const drafts = inv.filter((i) => i.status === "brouillon");
  const toInvoice = ((quotes.data ?? []) as any[]).filter((q) => !q.invoice_id || q.invoices?.status === "annule");

  for (const q of toInvoice) {
    if (q.clients.is_reserved) out.push({ key: `rq_${q.id}`, tone: "red", label: `🔒 ${q.number} (${q.clients.name}) accepté, en attente de facturation — traitement patron uniquement`, href: `/devis/${q.id}` });
  }
  for (const i of late) {
    const days = i.due_date ? daysBetween(i.due_date) : 0;
    const manual = days >= settings.reminder_manual_days;
    if (days >= settings.unpaid_alert_days) out.push({ key: `late_${i.id}`, tone: i.clients.is_reserved || manual ? "red" : "orange",
      label: `${i.clients.is_reserved ? "🔒 " : ""}${i.number} (${i.clients.name}) impayée depuis ${days} jours${manual ? " — action manuelle à faire (appel, courrier)" : ""}${i.clients.is_reserved ? " — aucune relance automatique" : ""}`, href: `/factures/${i.id}` });
  }
  for (const i of drafts) {
    const big = isLargeAmount(num(i.total_ht), settings);
    if (i.clients.is_reserved || big) out.push({ key: `draft_${i.id}`, tone: i.clients.is_reserved ? "red" : "orange", label: `Brouillon de ${formatEUR(i.total_ht)} HT (${i.clients.name})${big ? ` — au-dessus du seuil de ${formatEUR(settings.large_amount_threshold_ht)}` : ""}${i.clients.is_reserved ? " — contact réservé" : ""} : validation manuelle requise`, href: `/factures/${i.id}` });
  }
  for (const q of toInvoice) {
    if (!q.clients.is_reserved && isLargeAmount(num(q.total_ht), settings)) out.push({ key: `bigq_${q.id}`, tone: "orange", label: `${q.number} : ${formatEUR(q.total_ht)} HT à facturer — montant au-dessus du seuil`, href: `/devis/${q.id}` });
  }

  // À traiter
  add({ key: "req_new", tone: "orange", count: reqCount, label: "nouvelle(s) demande(s) de devis du site", href: "/demandes", menu: "/clients" });
  add({ key: "to_contact", tone: "orange", count: toContact.count ?? 0, label: "prospect(s) à contacter", href: "/clients?etape=a_contacter", menu: "/clients" });
  add({ key: "quote_accepted", tone: "orange", count: toInvoice.length, label: "devis accepté(s) à facturer ou à mettre en contrat", href: "/devis?statut=accepte", menu: "/devis" });
  add({ key: "quote_noanswer", tone: "orange", count: noAnswerCount, label: `devis envoyé(s) sans réponse depuis plus de ${settings.quote_followup_days} jours`, href: "/devis?statut=envoye", menu: "/devis" });
  add({ key: "draft_inv", tone: "orange", count: drafts.length, label: "facture(s) brouillon à relire et valider", href: "/factures?statut=a_valider", menu: "/factures" });
  add({ key: "unsent", tone: "orange", count: unsent.count ?? 0, label: "facture(s) émise(s) automatiquement en attente d'envoi", href: "/factures?statut=a_envoyer", menu: "/factures" });
  add({ key: "late_inv", tone: "orange", count: late.length, label: "facture(s) en retard de paiement", href: "/factures?statut=en_retard", menu: "/factures" });
  add({ key: "pay", tone: "orange", count: payments.count ?? 0, label: "paiement(s) bancaire(s) à rapprocher", href: "/paiements", menu: "/factures" });
  add({ key: "anomalies", tone: "orange", count: anomalies.count ?? 0, label: "anomalie(s) signalée(s) sur des missions, à régler", href: "/missions/problemes", menu: "/missions" });
  add({ key: "to_check", tone: "orange", count: toCheck.count ?? 0, label: "mission(s) « à vérifier » avant validation", href: "/missions?vue=statut&etape=a_verifier", menu: "/missions" });
  add({ key: "to_validate", tone: "orange", count: toValidate.count ?? 0, label: "mission(s) terminée(s) à valider pour pouvoir être facturée(s)", href: "/missions?vue=statut&etape=terminee", menu: "/missions" });
  add({ key: "to_confirm", tone: "orange", count: toConfirm.count ?? 0, label: "passage(s) passé(s) à confirmer (ils alimentent la facture du mois)", href: "/planning?filtre=a_confirmer", menu: "/missions" });
  // Règles d'affectation du dirigeant : seules les interventions réellement sans intervenant (ni enregistré, ni règle, ni période du dirigeant) sont une anomalie.
  const week = ((unassigned.data ?? []) as any[]).map((i) => classifyAssignment({ scheduled_date: i.scheduled_date, staff_id: i.staff_id, assignee: i.assignee, title: i.title, client_name: i.clients?.name ?? null, contract_label: i.contracts?.label ?? null }, today).cls);
  add({ key: "unassigned", tone: "orange", count: week.filter((c) => c === "sans_intervenant").length, label: "mission(s) des 7 prochains jours sans intervenant (aucune règle d'affectation ne s'applique)", href: "/missions?vue=semaine&agent=aucun", menu: "/missions" });
  add({ key: "assign_confirm", tone: "blue", count: week.filter((c) => c === "a_confirmer").length, label: "passage(s) des 7 prochains jours dont l'intervenant est à confirmer", href: "/missions?vue=semaine&agent=aucun", menu: "/missions" });
  add({ key: "unbilled", tone: "orange", count: unbilledDone.count ?? 0, label: "prestation(s) réalisée(s) d'un mois passé jamais facturée(s)", href: "/planning?filtre=non_facturees", menu: "/missions" });

  const incomplete = ((contracts.data ?? []) as any[]).filter((k) => {
    const i = contractIssues({ ...k, monthly_amount_ht: numOrNull(k.monthly_amount_ht), per_visit_amount_ht: numOrNull(k.per_visit_amount_ht), hours_per_visit: numOrNull(k.hours_per_visit), visits_per_week: numOrNull(k.visits_per_week) });
    return i.blocking.length + i.warnings.length > 0;
  });
  add({ key: "contracts_incomplete", tone: "orange", count: incomplete.length, label: "contrat(s) actif(s) incomplet(s) (jours, durée, intervenant…) : planning non fiable", href: "/contrats?filtre=incomplets", menu: "/sites" });
  add({ key: "no_email", tone: "blue", count: noEmail.count ?? 0, label: "client(s) actif(s) sans e-mail (factures non envoyables automatiquement)", href: "/clients?filtre=sans_email", menu: "/clients" });

  // Actions masquées par le patron : pour toujours (élément précis) ou tant que le nombre ne dépasse pas celui du masquage (compteur).
  const visible = out.filter((a) => !hidden.has(a.key) || (a.count !== undefined && hidden.get(a.key) != null && a.count > (hidden.get(a.key) as number)));
  const order = { red: 0, orange: 1, blue: 2 } as const;
  return visible.sort((a, b) => order[a.tone] - order[b.tone]);
}

/** Compteurs par rubrique du menu + total. */
export function menuCountsFrom(actions: ActionItem[]): Record<string, number> {
  const c: Record<string, number> = { "/actions": 0 };
  for (const a of actions) {
    const n = a.count ?? 1;
    c["/actions"] += n;
    if (a.menu) c[a.menu] = (c[a.menu] ?? 0) + n;
  }
  return c;
}
