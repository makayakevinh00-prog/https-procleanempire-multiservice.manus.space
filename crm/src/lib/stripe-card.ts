import "server-only";
import { stripe, StripeError } from "@/lib/stripe";

/** Paiement par carte des réservations de ménage : carte enregistrée à la réservation, débitée après le ménage validé. */

/** Page Stripe où le client enregistre sa carte (aucun débit). Rend l'adresse où l'envoyer. */
export async function createCardSetup(o: { email?: string; token: string; success: string; cancel: string }): Promise<string> {
  const s = await stripe<{ url: string }>("POST", "/checkout/sessions", {
    mode: "setup", payment_method_types: ["card"], customer_creation: "always", customer_email: o.email || undefined, locale: "fr",
    success_url: o.success, cancel_url: o.cancel, metadata: { track: o.token }, setup_intent_data: { metadata: { track: o.token } },
  });
  return s.url;
}

/** Au retour de Stripe : la carte a-t-elle bien été enregistrée pour cette réservation ? */
export async function readCardSetup(sessionId: string, token: string): Promise<{ customer: string; method: string } | null> {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return null;
  const s = await stripe<{ status: string; customer: string | null; metadata?: { track?: string }; setup_intent?: { status: string; payment_method: string | null } | null }>("GET", `/checkout/sessions/${sessionId}`, { expand: ["setup_intent"] });
  if (s.status !== "complete" || s.metadata?.track !== token || s.setup_intent?.status !== "succeeded" || !s.customer || !s.setup_intent.payment_method) return null;
  return { customer: s.customer, method: s.setup_intent.payment_method };
}

/** Débit de la carte enregistrée, client absent. La même réservation n'est jamais débitée deux fois (clé d'idempotence). */
export async function chargeCard(o: { bookingId: string; cents: number; customer: string; method: string; description: string; email: string }): Promise<string> {
  const pi = await stripe<{ id: string; status: string }>("POST", "/payment_intents", {
    amount: o.cents, currency: "eur", customer: o.customer, payment_method: o.method, off_session: true, confirm: true,
    description: o.description, receipt_email: o.email, metadata: { booking: o.bookingId },
  }, `booking-${o.bookingId}-${o.method}`);
  if (pi.status !== "succeeded") throw new StripeError("Le paiement n'a pas abouti.", pi.status);
  return pi.id;
}
