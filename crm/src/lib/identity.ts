import { agentClient } from "@/lib/agent";
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
  const secret = process.env.IDENTITY_SYNC_SECRET;
  if (!secret) throw new Error("IDENTITY_SYNC_SECRET manquante");
  const { error } = await agentClient().rpc("cleaner_identity_apply", { p_secret: secret, p_id: cleanerId, p_session: sessionId, p_status: status });
  if (error) throw new Error(`Enregistrement du statut d'identité refusé : ${error.message}`);
  return status;
}
