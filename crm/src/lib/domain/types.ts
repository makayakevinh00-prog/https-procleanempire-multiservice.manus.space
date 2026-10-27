export type ContractStatus = "actif" | "resilie" | "en_cours";
export type InvoiceStatus = "brouillon" | "envoye" | "paye" | "en_retard" | "annule";
export type QuoteStatus = "brouillon" | "envoye" | "accepte" | "refuse";

export interface Settings {
  owner_email: string;
  company_name: string;
  company_address: string | null;
  company_siret: string | null;
  company_vat_number: string | null;
  company_iban: string | null;
  company_phone: string | null;
  company_email: string | null;
  default_vat_rate: number;
  payment_terms_days: number;
  large_amount_threshold_ht: number;
  unpaid_alert_days: number;
  auto_reminders_enabled: boolean;
  reminder_first_after_days: number;
  reminder_interval_days: number;
  reminder_max_count: number;
  indep_hourly_cost: number;
  salarie_gross_hourly: number;
  salarie_employer_charges_pct: number;
  salarie_paid_leave_pct: number;
  recruit_green_max_hours: number;
  recruit_orange_max_hours: number;
}

export interface Client {
  id: string;
  name: string;
  kind: "entreprise" | "particulier";
  status: "prospect" | "actif" | "inactif";
  address: string | null;
  postal_code: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  siret: string | null;
  notes: string | null;
  is_reserved: boolean;
  reserved_reason: string | null;
}

export interface Contract {
  id: string;
  client_id: string;
  label: string;
  billing_mode: "mensuel" | "passage" | "autre";
  monthly_amount_ht: number | null;
  per_visit_amount_ht: number | null;
  terms: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ContractStatus;
  hours_per_visit: number | null;
  visits_per_week: number | null;
  weekly_hours: number | null;
  site_address: string | null;
  notes: string | null;
}

export interface Line {
  description: string;
  quantity: number;
  unit_price_ht: number;
  vat_rate: number;
}
