import { createAdmin } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export type IdentityStatus = "a_verifier" | "en_cours" | "verifie" | "echec" | "non_requis";
export type CleanerIdentity = { id: string; name: string; email: string; status: IdentityStatus; session_id: string | null; verified_at: string | null };

/** Traduit l'état d'une session Stripe Identity en statut ProClean. Aucun document n'est conservé chez nous : seulement ce statut. */
export const statusFromSession = (s: { status?: string; last_error?: unknown }): IdentityStatus =>
  s.status === "verified" ? "verifie" : s.status === "requires_input" ? (s.last_error ? "echec" : "a_verifier") : s.status === "canceled" ? "echec" : "en_cours";

/** Relit la session chez Stripe et met à jour le statut du nettoyeur (appelé au retour de la vérification et par la notification de Stripe). */
export async function syncIdentity(cleanerId: string, sessionId: string): Promise<IdentityStatus> {
  const s = await stripe<{ status?: string; last_error?: unknown }>("GET", `/identity/verification_sessions/${sessionId}`);
  const status = statusFromSession(s);
  await createAdmin().from("cleaners").update({ identity_status: status, identity_verified_at: status === "verifie" ? new Date().toISOString() : null }).eq("id", cleanerId).eq("identity_session_id", sessionId);
  return status;
}
