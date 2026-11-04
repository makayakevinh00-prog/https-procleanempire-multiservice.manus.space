import { round2 } from "../utils";
import { documentTotals } from "./billing";
import { monthBounds, monthLabel, shortDate } from "./dates";
import type { Line } from "./types";

export interface PlanClient {
  id: string;
  name: string;
  email: string | null;
  is_reserved: boolean;
  auto_send_invoices: boolean;
  status: string;
}
export interface PlanContract {
  id: string;
  client_id: string;
  label: string;
  billing_mode: "mensuel" | "passage" | "autre";
  monthly_amount_ht: number | null;
  start_date: string | null;
  end_date: string | null;
  status: "actif" | "resilie" | "en_cours";
}
export interface PlanIntervention {
  id: string;
  client_id: string;
  contract_id: string | null;
  title: string;
  scheduled_date: string;
  status: "planifie" | "realise" | "annule";
  billable: boolean;
  quantity: number;
  unit_price_ht: number | null;
  vat_rate: number;
  invoice_id: string | null;
}
export interface PlanSettings {
  default_vat_rate: number;
  large_amount_threshold_ht: number;
  auto_invoicing_enabled: boolean;
  auto_invoicing_start_month: string;
  count_planned_as_done: boolean;
}

export interface PlannedInvoice {
  clientId: string;
  clientName: string;
  month: string;
  subject: string;
  lines: Line[];
  interventionIds: string[];
  totals: { ht: number; vat: number; ttc: number };
  /** Points à vérifier par le patron : la facture reste en brouillon, jamais envoyée automatiquement. */
  reasons: string[];
  /** Envoi automatique autorisé (toutes les conditions réunies). */
  autoSend: boolean;
  /** Pourquoi l'envoi automatique est refusé (affichage / alerte patron). */
  blockedReasons: string[];
}

export interface PlanInput {
  month: string;
  /** Aujourd'hui (YYYY-MM-DD) : les interventions « planifiées » à venir ne sont jamais facturées. */
  today: string;
  settings: PlanSettings;
  clients: PlanClient[];
  contracts: PlanContract[];
  interventions: PlanIntervention[];
  /** Clients ayant déjà une facture (non annulée) pour ce mois. */
  invoicedClientIds: string[];
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

/**
 * Calcule, client par client, la facture du mois : forfaits mensuels des contrats actifs
 * + interventions réalisées (ou planifiées et passées, selon le réglage) non encore facturées.
 * Fonction pure : aucune écriture, aucun envoi.
 */
export function planMonthlyInvoices(input: PlanInput): PlannedInvoice[] {
  const { month, today, settings } = input;
  if (month < settings.auto_invoicing_start_month) return [];
  const { start, end } = monthBounds(month);
  const label = monthLabel(month);
  const already = new Set(input.invoicedClientIds);
  const out: PlannedInvoice[] = [];

  for (const client of input.clients) {
    if (already.has(client.id)) continue;
    const lines: Line[] = [];
    const reasons: string[] = [];
    const interventionIds: string[] = [];

    // 1. Forfaits mensuels
    for (const k of input.contracts) {
      if (k.client_id !== client.id || k.billing_mode !== "mensuel" || k.status !== "actif" || k.monthly_amount_ht == null) continue;
      if ((k.start_date && k.start_date > end) || (k.end_date && k.end_date < start)) continue;
      lines.push({ description: `${k.label} — ${label}`, quantity: 1, unit_price_ht: num(k.monthly_amount_ht), vat_rate: num(settings.default_vat_rate) });
      if ((k.start_date && k.start_date > start) || (k.end_date && k.end_date < end)) {
        reasons.push(`contrat « ${k.label} » commencé ou terminé en cours de mois : proratisation à vérifier`);
      }
    }

    // 2. Interventions du planning
    const groups = new Map<string, { title: string; price: number; vat: number; qty: number; dates: string[] }>();
    for (const i of input.interventions) {
      if (i.client_id !== client.id || i.invoice_id || !i.billable || i.status === "annule") continue;
      if (i.scheduled_date < start || i.scheduled_date > end) continue;
      const done = i.status === "realise" || (settings.count_planned_as_done && i.scheduled_date <= today);
      if (!done) continue;
      if (i.unit_price_ht == null) {
        reasons.push(`intervention « ${i.title} » du ${shortDate(i.scheduled_date)} sans prix`);
        continue;
      }
      const key = `${i.title}|${i.unit_price_ht}|${i.vat_rate}`;
      const g = groups.get(key) ?? { title: i.title, price: num(i.unit_price_ht), vat: num(i.vat_rate), qty: 0, dates: [] };
      g.qty += num(i.quantity);
      g.dates.push(i.scheduled_date);
      groups.set(key, g);
      interventionIds.push(i.id);
    }
    for (const g of groups.values()) {
      const dates = [...g.dates].sort().map(shortDate).join(", ");
      lines.push({ description: `${g.title}\nPassages : ${dates}`, quantity: round2(g.qty), unit_price_ht: g.price, vat_rate: g.vat });
    }

    if (!lines.length) continue;
    const totals = documentTotals(lines);

    const blocked: string[] = [];
    if (!settings.auto_invoicing_enabled) blocked.push("facturation automatique désactivée");
    if (!client.auto_send_invoices) blocked.push("envoi automatique non activé pour ce client");
    if (client.is_reserved) blocked.push("contact réservé");
    if (!client.email) blocked.push("pas d'adresse e-mail");
    if (totals.ht > num(settings.large_amount_threshold_ht)) blocked.push(`montant au-dessus du seuil (${num(settings.large_amount_threshold_ht)} € HT)`);
    if (totals.ht <= 0) blocked.push("montant nul");
    blocked.push(...reasons);

    out.push({
      clientId: client.id, clientName: client.name, month, subject: `Prestations de ${label}`,
      lines, interventionIds, totals, reasons, autoSend: blocked.length === 0, blockedReasons: blocked
    });
  }
  return out.sort((a, b) => a.clientName.localeCompare(b.clientName, "fr"));
}
