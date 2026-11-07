import { addDays } from "@/lib/domain/dates";

/**
 * Règles d'affectation de ProClean Empire (organisation déclarée par le dirigeant le 7 nov. 2026).
 * LECTURE SEULE : ces règles servent à CLASSER les interventions pour l'affichage et les alertes.
 * Elles ne modifient JAMAIS une affectation. À terme elles pourront alimenter l'affectation automatique,
 * après autorisation explicite du dirigeant.
 */
export const ASSIGNMENT_RULES = {
  /** Jusqu'à cette date incluse, les interventions sont assurées par le dirigeant (organisation actuelle, non saisie dans le CRM). */
  ownerCoversUntil: "2026-11-10",
  /** À partir de cette date, les interventions Airbnb sont attribuées à l'intervenant ci-dessous. */
  airbnbFrom: "2026-11-11",
  airbnbStaff: "Esma Nouali",
  /** En deçà de ce nombre de jours, une intervention sans intervenant ni règle devient une vraie alerte. */
  urgentDays: 2
} as const;
export type AssignmentRules = { ownerCoversUntil: string; airbnbFrom: string; airbnbStaff: string; urgentDays: number };

export type AssignClass =
  | "affectee"                 // un intervenant est enregistré dans le CRM
  | "organisation_dirigeant"   // période couverte par l'organisation actuelle (jusqu'au 10/11 inclus)
  | "regle_airbnb"             // Airbnb à partir du 11/11 : attribuée à Esma par règle, pas encore enregistrée
  | "a_confirmer"              // aucune règle ne dit qui : à confirmer, passage non imminent
  | "sans_intervenant";        // aucune règle, passage imminent : vraie anomalie

export interface AssignInput { scheduled_date: string; staff_id: string | null; assignee: string | null; title: string; client_name: string | null; contract_label?: string | null }
export interface Assignment { cls: AssignClass; reason: string; expected: string | null }

/** Détection d'une prestation Airbnb : mots-clés sur le titre, le client et le contrat (à valider avec le dirigeant). */
export const isAirbnb = (i: Pick<AssignInput, "title" | "client_name" | "contract_label">) =>
  /airbnb|conciergerie|gestion s[ée]jours?|location saisonni/i.test(`${i.title} ${i.client_name ?? ""} ${i.contract_label ?? ""}`);

const fr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function classifyAssignment(i: AssignInput, today: string, rules: AssignmentRules = ASSIGNMENT_RULES): Assignment {
  const recorded = i.staff_id || (i.assignee ?? "").trim();
  if (recorded) return { cls: "affectee", reason: `Intervenant enregistré${i.assignee ? ` : ${i.assignee}` : ""}`, expected: null };
  if (i.scheduled_date <= rules.ownerCoversUntil) return { cls: "organisation_dirigeant", reason: `Période couverte par votre organisation actuelle (jusqu'au ${fr(rules.ownerCoversUntil)} inclus), non saisie dans le CRM`, expected: null };
  if (isAirbnb(i) && i.scheduled_date >= rules.airbnbFrom) return { cls: "regle_airbnb", reason: `Prestation Airbnb à partir du ${fr(rules.airbnbFrom)} : attribuée à ${rules.airbnbStaff} par règle, pas encore enregistrée`, expected: rules.airbnbStaff };
  if (i.scheduled_date <= addDays(today, rules.urgentDays)) return { cls: "sans_intervenant", reason: "Aucun intervenant, aucune règle applicable et passage dans moins de 48 h", expected: null };
  return { cls: "a_confirmer", reason: "Aucune règle d'affectation ne s'applique : intervenant à confirmer", expected: null };
}

export const ASSIGN_LABEL: Record<AssignClass, string> = {
  affectee: "Affectées dans le CRM",
  organisation_dirigeant: "Assurées par vous (organisation actuelle)",
  regle_airbnb: "Airbnb attribuées à Esma par règle",
  a_confirmer: "Affectation à confirmer",
  sans_intervenant: "Réellement sans intervenant"
};
export function tallyAssignments(xs: Assignment[]): Record<AssignClass, number> {
  const t: Record<AssignClass, number> = { affectee: 0, organisation_dirigeant: 0, regle_airbnb: 0, a_confirmer: 0, sans_intervenant: 0 };
  for (const x of xs) t[x.cls]++;
  return t;
}
