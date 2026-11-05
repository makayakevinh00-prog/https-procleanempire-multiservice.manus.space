import { createClient } from "@supabase/supabase-js";
import { allowedOrigin } from "@/lib/inbound-auth";

/** Client anonyme : le public n'a aucun droit direct sur les tables, seulement sur public_request_*. */
export const publicClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

export const isRef = (s: string) => /^DEM-\d{4}-\d{4,}$/i.test(s);
export const isTok = (s: string | null | undefined): s is string => !!s && /^[0-9a-f]{64}$/.test(s);

export type PublicStatus = {
  request_number: string; received_at: string; service?: string | null; status: string; status_label: string;
  quote?: { number: string; status: string; issue_date: string; valid_until: string | null; total_ttc: number; document: boolean };
  appointments?: { date: string; time: string | null; hours: number | null; title: string; label: string; done: number; total: number; finished: boolean }[];
  invoice?: { number: string; status: string; issue_date: string; due_date: string | null; total_ttc: number; paid: boolean; document: boolean };
};

export async function fetchStatus(ref: string, token: string | null | undefined): Promise<PublicStatus | null> {
  if (!isRef(ref) || !isTok(token)) return null;
  const { data, error } = await publicClient().rpc("public_request_status", { p_ref: ref, p_token: token });
  return error || !data ? null : (data as PublicStatus);
}

export const corsHeaders = (origin: string | null): Record<string, string> => {
  const ok = allowedOrigin(origin);
  return ok ? { "Access-Control-Allow-Origin": ok, Vary: "Origin", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "x-tracking-token" } : { Vary: "Origin" };
};
