import "server-only";
import { createClient } from "@supabase/supabase-js";
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
