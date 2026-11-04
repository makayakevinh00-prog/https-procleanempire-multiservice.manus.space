import { daysBetween } from "../utils";
import type { Settings } from "./types";

export interface ReminderCandidate {
  status: string;
  due_date: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  client_is_reserved: boolean;
  total_ht: number;
}

/**
 * Décide si une relance AUTOMATIQUE peut être créée pour une facture.
 * Règle 1 : jamais pour un contact réservé. Règle 3 : jamais si une relance récente existe.
 */
export function autoReminderDecision(
  inv: ReminderCandidate,
  s: Pick<Settings, "large_amount_threshold_ht" | "auto_reminders_enabled" | "reminder_first_after_days" | "reminder_interval_days" | "reminder_max_count">,
  now = new Date()
): { allowed: boolean; reason?: string } {
  if (!s.auto_reminders_enabled) return { allowed: false, reason: "relances automatiques désactivées" };
  if (inv.client_is_reserved) return { allowed: false, reason: "contact réservé" };
  // Règle 4 : au-dessus du seuil, alerte patron plutôt qu'action automatique
  if (inv.total_ht > Number(s.large_amount_threshold_ht)) return { allowed: false, reason: "montant au-dessus du seuil : alerte patron" };
  if (!["envoye", "en_retard"].includes(inv.status)) return { allowed: false, reason: "statut non relançable" };
  if (!inv.due_date) return { allowed: false, reason: "pas d'échéance" };
  if (daysBetween(inv.due_date, now) < s.reminder_first_after_days) return { allowed: false, reason: "délai avant première relance non atteint" };
  if (inv.reminder_count >= s.reminder_max_count) return { allowed: false, reason: "nombre maximum de relances atteint" };
  if (inv.last_reminder_at && daysBetween(inv.last_reminder_at, now) < s.reminder_interval_days) {
    return { allowed: false, reason: "relance déjà envoyée récemment" };
  }
  return { allowed: true };
}

export type SequenceStep = {
  key: "relance1" | "relance2" | "alerte" | "manuel";
  day: number;
  label: string;
  /** auto = envoyée par le CRM ; alerte = vous êtes prévenu ; manuel = vous seul agissez (appel, courrier). */
  kind: "auto" | "alerte" | "manuel";
  state: "fait" | "du" | "a_venir";
};

/**
 * Séquence d'impayés d'une facture en retard : J+1 et J+7 relances automatiques (réglables),
 * J+15 alerte au patron, J+30 action manuelle. S'arrête dès que la facture n'est plus en retard (payée, annulée).
 */
export function overdueSequence(
  daysLate: number,
  reminderCount: number,
  s: Pick<Settings, "reminder_first_after_days" | "reminder_interval_days" | "reminder_max_count" | "unpaid_alert_days" | "reminder_manual_days">
): SequenceStep[] {
  const steps: SequenceStep[] = [];
  const d1 = s.reminder_first_after_days;
  for (let n = 1; n <= s.reminder_max_count; n++) {
    const day = d1 + (n - 1) * s.reminder_interval_days;
    steps.push({ key: n === 1 ? "relance1" : "relance2", day, kind: "auto", label: n === 1 ? "Première relance par e-mail" : `Relance n° ${n} par e-mail`,
      state: reminderCount >= n ? "fait" : daysLate >= day ? "du" : "a_venir" });
  }
  steps.push({ key: "alerte", day: s.unpaid_alert_days, kind: "alerte", label: "Alerte : vous êtes prévenu", state: daysLate >= s.unpaid_alert_days ? "du" : "a_venir" });
  steps.push({ key: "manuel", day: s.reminder_manual_days, kind: "manuel", label: "Action manuelle : appel, courrier recommandé", state: daysLate >= s.reminder_manual_days ? "du" : "a_venir" });
  return steps.sort((a, b) => a.day - b.day);
}
