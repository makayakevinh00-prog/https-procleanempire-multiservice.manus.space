import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isLang, isTheme, type Lang, type ThemePref } from "@/lib/field-ui";
import { noStoreFetch } from "@/lib/supabase/no-store";

/**
 * Client anonyme pour l'interface agent : aucune session, aucun cookie.
 * Les agents n'ont accès à rien d'autre qu'aux fonctions agent_* (vérification du jeton dans la base).
 */
export function agentClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: noStoreFetch } });
}

export type AgentMission = {
  id: string; title: string; date: string; time: string | null; hours: number | null; stage: string; notes: string | null;
  checklist: { label: string; done: boolean }[]; client: string; site: string | null; address: string | null; access: string | null;
  contact_name: string | null; contact_phone: string | null; photos: number; open_issues: number;
  arrived_at: string | null; departed_at: string | null; arrived_verified: boolean | null;
};

/** Nettoie un message d'erreur de la base pour l'agent (« CODE: texte » → texte). */
export function agentMessage(message: string): string {
  const m = /^([A-Z_]{4,}):\s*(.*)$/s.exec(message.trim());
  return m ? m[2] : "Une erreur est survenue. Réessayez ou prévenez votre responsable.";
}

export const isToken = (t: string) => /^[0-9a-f]{64}$/.test(t);

export type AgentReport = {
  agent: string; done: number; validated: number; cancelled: number; sites_checked: number; rate: number;
  recent: { id: string; date: string; time: string | null; title: string; client: string; site: string | null; stage: string }[];
};
export type AgentProfile = {
  name: string; email: string | null; phone: string | null; missions_done: number;
  company_name: string | null; company_phone: string | null; company_email: string | null; deletion_requested_at: string | null;
};

/** Préférences de l'application (thème, langue) : simples cookies de l'appareil, jamais envoyés à la base. */
export function agentPrefs(): { lang: Lang; theme: ThemePref } {
  const c = cookies();
  const lang = c.get("agent_lang")?.value, theme = c.get("agent_theme")?.value;
  return { lang: isLang(lang) ? lang : "fr", theme: isTheme(theme) ? theme : "light" };
}

export type CleanerOverview = {
  name: string; email: string; phone: string | null; departments: string[]; city: string | null; has_iban: boolean; iban_hint: string | null;
  address_line: string | null; postal_code: string | null; radius_km: number; has_location: boolean; online: boolean; today_amount: number; week_amount: number;
  window_start: string; window_end: string; max_end: string; done: number;
  pending_amount: number; to_pay_amount: number; in_payout_amount: number; paid_amount: number;
  payouts: { period_start: string; period_end: string; amount: number; jobs: number; status: string; paid_on: string | null }[];
};
export type CleanerJob = {
  id: string; title: string; date: string; window_start: string; window_end: string; hours: number | null; city: string | null; postal_code: string | null;
  amount: number; distance_km?: number | null; favorite?: boolean; priority_until?: string | null; address?: string | null; access_notes?: string | null; status?: string; cleaner_note?: string | null; review_note?: string | null;
  departure?: "rester" | "partir" | null; arrived_at?: string | null; validated_by?: "ia" | "direction" | null; rank?: number | null; photos_before?: number; photos_after?: number;
  before_report?: { items: { zone: string; todo: string }[]; level: number | null; summary: string } | null;
  ai_status?: "ok" | "reprise" | "indisponible" | null; ai_report?: { summary?: string; cleaned?: string[]; remaining?: { zone: string; why: string }[] } | null;
  linen?: { status: string; method: string | null; tracking: string | null } | null;
};
