import { daysBetween } from "../utils";
import { addDays, isoWeekday } from "./dates";
import { nameOverlap } from "./matching";
import type { Settings } from "./types";

/** Frais de recouvrement : 40 € une seule fois par facture, ajoutés à la 3e relance (art. L441-10 et D441-5 du Code de commerce). Annoncés dans les conditions. */
export const REMINDER_FEE_EUR = 40;
export const REMINDER_FEE_LEVEL = 3;

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

// ───────────── Relances « intelligentes » : à qui, quand, et faut-il vraiment relancer ? ─────────────

/**
 * Les frais forfaitaires de recouvrement (40 €) ne sont prévus par la loi qu'entre professionnels (art. L441-10 du Code de commerce).
 * Ils ne sont donc annoncés et ajoutés que pour une fiche « entreprise » : jamais pour un particulier, ni quand la nature du client n'est pas connue.
 */
export const feeApplies = (clientKind: string | null | undefined): boolean => clientKind === "entreprise";

/** Dimanche de Pâques (calendrier grégorien). */
function easter(year: number): string {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Jours fériés français (métropole) d'une année. */
export function frenchHolidays(year: number): string[] {
  const e = easter(year);
  return [`${year}-01-01`, addDays(e, 1), `${year}-05-01`, `${year}-05-08`, addDays(e, 39), addDays(e, 50), `${year}-07-14`, `${year}-08-15`, `${year}-11-01`, `${year}-11-11`, `${year}-12-25`];
}

/** Une relance ne part qu'un jour ouvré : ni samedi, ni dimanche, ni jour férié. Elle attend simplement le jour ouvré suivant. */
export function isBusinessDay(date: string): boolean {
  return isoWeekday(date) <= 5 && !frenchHolidays(Number(date.slice(0, 4))).includes(date);
}

const MAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

/**
 * Destinataires d'une relance : l'adresse du client, les adresses où la facture a été envoyée, et ses adresses « reçoit les factures ».
 * Sans doublon (la casse est ignorée) ni adresse invalide ; l'adresse du client reste en premier.
 */
export function reminderRecipients(clientEmail: string | null | undefined, sentTo?: string | null, extra?: (string | null | undefined)[] | null): string[] {
  const all = [clientEmail, ...(sentTo ?? "").split(/[,;]/), ...(extra ?? [])].map((e) => (e ?? "").trim()).filter((e) => MAIL_RE.test(e));
  return all.filter((e, k) => all.findIndex((x) => x.toLowerCase() === e.toLowerCase()) === k);
}

export interface BankCredit { id?: string | null; amount: number; date: string; label: string | null; reference: string | null }
export interface PaymentHold { amount: number; date: string; payer: string; reason: string }

const compact = (t: string | null | undefined) => (t ?? "").toUpperCase().normalize("NFD").replace(/[^A-Z0-9]/g, "");
/** Un virement « du même montant et du même payeur » ne retient la relance que s'il est récent : au-delà, il a eu le temps d'être rattaché à sa facture. */
export const HOLD_DAYS = 10;

/**
 * Avant de relancer : un virement reçu à la banque paie-t-il déjà cette facture, sans avoir encore été rattaché dans le CRM ?
 *  - il cite le numéro de la facture : la relance est retenue, quel que soit le montant ;
 *  - il est du montant restant dû, vient d'un payeur dont le nom ressemble à celui du client, et date de moins de 10 jours : retenue aussi.
 * Seuls comptent les virements reçus depuis l'émission de la facture et pas encore traités dans le CRM : `handled` liste ceux déjà rattachés
 * ou écartés ; si cette liste n'est pas connue, un virement d'un montant déjà compté dans les règlements de la facture est ignoré.
 * Renvoie le virement le plus récent, ou null (la relance peut partir).
 */
export function paymentHold(
  inv: { number: string | null; issue_date?: string | null; total_ttc: number; paid_amount: number },
  clientName: string, credits: BankCredit[], today: string, handled?: Set<string> | null
): PaymentHold | null {
  const paid = Math.round(Number(inv.paid_amount ?? 0) * 100);
  const due = Math.round(Number(inv.total_ttc) * 100) - paid;
  if (due <= 0) return null;
  const number = compact(inv.number);
  const hits: PaymentHold[] = [];
  for (const c of credits) {
    const day = (c.date ?? "").slice(0, 10), cents = Math.round(c.amount * 100);
    if (!(cents > 0) || !day || (inv.issue_date && day < inv.issue_date)) continue;
    if (handled ? !!c.id && handled.has(c.id) : cents <= paid) continue;                       // déjà traité dans le CRM
    const payer = (c.label ?? c.reference ?? "").trim() || "payeur inconnu";
    if (number.length >= 5 && compact(`${c.label ?? ""} ${c.reference ?? ""}`).includes(number)) hits.push({ amount: c.amount, date: day, payer, reason: "il cite le numéro de la facture" });
    else if (Math.abs(cents - due) <= 1 && day >= addDays(today, -HOLD_DAYS) && nameOverlap(`${c.label ?? ""} ${c.reference ?? ""}`, clientName) >= 0.5)
      hits.push({ amount: c.amount, date: day, payer, reason: "même montant que le reste dû, payeur proche du client" });
  }
  return hits.sort((x, y) => y.date.localeCompare(x.date))[0] ?? null;
}
