export interface ContractLike {
  billing_mode: "mensuel" | "passage" | "autre";
  monthly_amount_ht: number | null;
  per_visit_amount_ht: number | null;
  terms: string | null;
  weekdays?: number[] | null;
  visits_per_week: number | null;
  hours_per_visit: number | null;
  site_address: string | null;
  assignee?: string | null;
  start_date: string | null;
  /** Gestion locative : commission en % des revenus de location (pas de passages ni d'heures à planifier). */
  commission_pct?: number | null;
}

export interface ContractIssues {
  /** Empêche d'activer le contrat : sans cela, facturation ou planning faux. */
  blocking: string[];
  /** À compléter pour un planning, un suivi des heures et une facturation fiables. */
  warnings: string[];
}

const filled = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== "";

export function contractIssues(k: ContractLike): ContractIssues {
  const blocking: string[] = [];
  const warnings: string[] = [];
  if (k.billing_mode === "mensuel" && !filled(k.monthly_amount_ht)) blocking.push("montant mensuel");
  if (k.billing_mode === "passage" && !filled(k.per_visit_amount_ht)) blocking.push("prix par passage");
  const commission = k.billing_mode === "autre" && filled(k.commission_pct);
  if (k.billing_mode === "autre" && !commission && !filled(k.terms)) blocking.push("conditions de facturation");
  if (commission) {   // gestion à pourcentage : rien à planifier, seules l'adresse et la date de début comptent
    if (!filled(k.site_address)) warnings.push("adresse du site");
    if (!filled(k.start_date)) warnings.push("date de début");
    return { blocking, warnings };
  }
  const hasDays = (k.weekdays?.length ?? 0) > 0;
  if (!hasDays && !filled(k.visits_per_week)) blocking.push("fréquence ou jours de passage");
  if (!hasDays) warnings.push("jours de passage (planning automatique impossible)");
  if (!filled(k.hours_per_visit)) warnings.push("durée par passage");
  if (!filled(k.site_address)) warnings.push("adresse du site");
  if (!filled(k.assignee)) warnings.push("intervenant");
  if (!filled(k.start_date)) warnings.push("date de début");
  return { blocking, warnings };
}

export const isIncomplete = (k: ContractLike) => {
  const i = contractIssues(k);
  return i.blocking.length + i.warnings.length > 0;
};
