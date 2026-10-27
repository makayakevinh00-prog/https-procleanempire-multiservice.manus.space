import { round2 } from "../utils";
import type { Contract, Settings } from "./types";

export type Level = "vert" | "orange" | "rouge";

/** Indicateur de recrutement : vert < 30 h, orange 30–35 h (inclus), rouge > 35 h (seuils configurables). */
export function recruitmentLevel(totalHours: number, greenMax = 30, orangeMax = 35): Level {
  if (totalHours < greenMax) return "vert";
  if (totalHours <= orangeMax) return "orange";
  return "rouge";
}

export const WEEKS_PER_MONTH = 52 / 12;

/** Heures hebdo d'un contrat (null si heures par intervention ou fréquence manquantes). */
export function weeklyHours(c: Pick<Contract, "hours_per_visit" | "visits_per_week">): number | null {
  if (c.hours_per_visit == null || c.visits_per_week == null) return null;
  return round2(Number(c.hours_per_visit) * Number(c.visits_per_week));
}

/** Chiffre d'affaires HT hebdomadaire d'un contrat (null si non calculable). */
export function weeklyRevenueHt(c: Pick<Contract, "billing_mode" | "monthly_amount_ht" | "per_visit_amount_ht" | "visits_per_week">): number | null {
  if (c.billing_mode === "mensuel" && c.monthly_amount_ht != null) {
    return round2((Number(c.monthly_amount_ht) * 12) / 52);
  }
  if (c.billing_mode === "passage" && c.per_visit_amount_ht != null && c.visits_per_week != null) {
    return round2(Number(c.per_visit_amount_ht) * Number(c.visits_per_week));
  }
  return null;
}

/** Coût horaire chargé d'un salarié = brut × (1 + congés payés) × (1 + charges patronales). */
export function salarieLoadedHourly(s: Pick<Settings, "salarie_gross_hourly" | "salarie_employer_charges_pct" | "salarie_paid_leave_pct">) {
  return round2(
    Number(s.salarie_gross_hourly) *
      (1 + Number(s.salarie_paid_leave_pct) / 100) *
      (1 + Number(s.salarie_employer_charges_pct) / 100)
  );
}

export interface SiteRow {
  contract: Contract;
  clientName: string;
  weeklyHours: number | null;
  weeklyRevenue: number | null;
}

export interface RecruitmentSummary {
  totalHours: number;
  sitesWithHours: number;
  sitesMissingHours: number;
  level: Level;
  weeklyRevenue: number;
  indep: { hourly: number; weekly: number; monthly: number; weeklyMargin: number };
  salarie: { hourly: number; weekly: number; monthly: number; weeklyMargin: number };
  cheaper: "independant" | "salarie" | "egal";
}

export function summarize(rows: SiteRow[], s: Settings): RecruitmentSummary {
  const totalHours = round2(rows.reduce((a, r) => a + (r.weeklyHours ?? 0), 0));
  // CA pris en compte uniquement sur les sites dont les heures sont connues → marge cohérente avec le coût
  const revenue = round2(rows.filter((r) => r.weeklyHours != null).reduce((a, r) => a + (r.weeklyRevenue ?? 0), 0));
  const indepHourly = Number(s.indep_hourly_cost);
  const salHourly = salarieLoadedHourly(s);
  const indepWeekly = round2(totalHours * indepHourly);
  const salWeekly = round2(totalHours * salHourly);
  return {
    totalHours,
    sitesWithHours: rows.filter((r) => r.weeklyHours != null).length,
    sitesMissingHours: rows.filter((r) => r.weeklyHours == null).length,
    level: recruitmentLevel(totalHours, Number(s.recruit_green_max_hours), Number(s.recruit_orange_max_hours)),
    weeklyRevenue: revenue,
    indep: {
      hourly: indepHourly,
      weekly: indepWeekly,
      monthly: round2(indepWeekly * WEEKS_PER_MONTH),
      weeklyMargin: round2(revenue - indepWeekly)
    },
    salarie: {
      hourly: salHourly,
      weekly: salWeekly,
      monthly: round2(salWeekly * WEEKS_PER_MONTH),
      weeklyMargin: round2(revenue - salWeekly)
    },
    cheaper: indepWeekly === salWeekly ? "egal" : indepWeekly < salWeekly ? "independant" : "salarie"
  };
}

/** CA HT mensuel récurrent estimé d'un contrat (null si non calculable). */
export function monthlyRevenueHt(c: Pick<Contract, "billing_mode" | "monthly_amount_ht" | "per_visit_amount_ht" | "visits_per_week">): number | null {
  if (c.billing_mode === "mensuel" && c.monthly_amount_ht != null) return round2(Number(c.monthly_amount_ht));
  if (c.billing_mode === "passage" && c.per_visit_amount_ht != null && c.visits_per_week != null) {
    return round2(Number(c.per_visit_amount_ht) * Number(c.visits_per_week) * WEEKS_PER_MONTH);
  }
  return null;
}
