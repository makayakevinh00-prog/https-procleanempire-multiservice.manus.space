import { eachDay, isoWeekday, monthBounds } from "./dates";

export interface ScheduleContract {
  id: string;
  client_id: string;
  label: string;
  billing_mode: "mensuel" | "passage" | "autre";
  per_visit_amount_ht: number | null;
  status: "actif" | "resilie" | "en_cours";
  start_date: string | null;
  end_date: string | null;
  weekdays: number[] | null;
  start_time: string | null;
  hours_per_visit: number | null;
  site_address: string | null;
}

export interface PlannedVisit {
  source_key: string;
  client_id: string;
  contract_id: string;
  title: string;
  scheduled_date: string;
  start_time: string | null;
  duration_hours: number | null;
  site_address: string | null;
  billable: boolean;
  unit_price_ht: number | null;
}

/**
 * Passages à créer pour un mois d'après les jours de la semaine des contrats actifs.
 * Un contrat au forfait mensuel génère des passages non facturables (déjà couverts par le forfait).
 * `source_key` rend l'opération rejouable sans doublon.
 */
export function contractVisits(contracts: ScheduleContract[], month: string): PlannedVisit[] {
  const { start, end } = monthBounds(month);
  const out: PlannedVisit[] = [];
  for (const k of contracts) {
    if (k.status !== "actif" || !k.weekdays?.length) continue;
    const from = k.start_date && k.start_date > start ? k.start_date : start;
    const to = k.end_date && k.end_date < end ? k.end_date : end;
    if (from > to) continue;
    for (const day of eachDay(from, to)) {
      if (!k.weekdays.includes(isoWeekday(day))) continue;
      const perVisit = k.billing_mode === "passage";
      out.push({
        source_key: `contract:${k.id}:${day}`, client_id: k.client_id, contract_id: k.id, title: k.label, scheduled_date: day,
        start_time: k.start_time, duration_hours: k.hours_per_visit, site_address: k.site_address,
        billable: perVisit, unit_price_ht: perVisit ? k.per_visit_amount_ht : null
      });
    }
  }
  return out;
}

export const WEEKDAYS = [
  [1, "Lun"], [2, "Mar"], [3, "Mer"], [4, "Jeu"], [5, "Ven"], [6, "Sam"], [7, "Dim"]
] as const;
