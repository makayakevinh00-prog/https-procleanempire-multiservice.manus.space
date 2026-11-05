import { createClient } from "@/lib/supabase/server";

export type ClientImpact = { issued: number; drafts: number; quotes: number; contracts: number; sites: number; missions: number; interactions: number };

/** Ce qui disparaîtrait avec un client : affiché avant toute suppression. */
export async function clientImpact(clientId: string): Promise<ClientImpact> {
  const sb = createClient();
  const head = { count: "exact" as const, head: true };
  const [issued, drafts, quotes, contracts, sites, missions, interactions] = await Promise.all([
    sb.from("invoices").select("id", head).eq("client_id", clientId).neq("status", "brouillon"),
    sb.from("invoices").select("id", head).eq("client_id", clientId).eq("status", "brouillon"),
    sb.from("quotes").select("id", head).eq("client_id", clientId),
    sb.from("contracts").select("id", head).eq("client_id", clientId),
    sb.from("sites").select("id", head).eq("client_id", clientId),
    sb.from("interventions").select("id", head).eq("client_id", clientId),
    sb.from("interactions").select("id", head).eq("client_id", clientId)
  ]);
  return { issued: issued.count ?? 0, drafts: drafts.count ?? 0, quotes: quotes.count ?? 0, contracts: contracts.count ?? 0, sites: sites.count ?? 0, missions: missions.count ?? 0, interactions: interactions.count ?? 0 };
}
