import "server-only";

/** Paiement par carte (Stripe). Tant que la clé n'est pas en place dans Vercel, tout reste « sur facture ». */
export const stripeConfigured = () => /^sk_(test|live)_/.test(process.env.STRIPE_SECRET_KEY?.trim() ?? "");
export const stripeTestMode = () => (process.env.STRIPE_SECRET_KEY ?? "").trim().startsWith("sk_test_");

export class StripeError extends Error {
  constructor(message: string, readonly code?: string, readonly intent?: string) { super(message); }
}

/** Aplatit un objet en champs de formulaire Stripe : { a: { b: 1 }, c: ["x"] } → a[b]=1&c[0]=x */
export function stripeForm(o: Record<string, unknown>, prefix = "", out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === "object" && x !== null ? stripeForm(x as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(x))));
    else if (typeof v === "object") stripeForm(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function call<T>(method: "GET" | "POST", path: string, body?: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new StripeError("Paiement par carte non configuré.");
  const qs = method === "GET" && body ? `?${stripeForm(body)}` : "";
  const res = await fetch(`https://api.stripe.com/v1${path}${qs}`, {
    method, cache: "no-store", signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${key}`, ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}), ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    body: method === "POST" ? stripeForm(body ?? {}) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string; decline_code?: string; payment_intent?: { id?: string } } };
  if (!res.ok) throw new StripeError(json.error?.message ?? `Stripe a répondu ${res.status}`, json.error?.decline_code ?? json.error?.code, json.error?.payment_intent?.id);
  return json as T;
}

/** Page Stripe où le client enregistre sa carte (aucun débit). Rend l'adresse où l'envoyer. */
export async function createCardSetup(o: { email?: string; token: string; success: string; cancel: string }): Promise<string> {
  const s = await call<{ url: string }>("POST", "/checkout/sessions", {
    mode: "setup", payment_method_types: ["card"], customer_creation: "always", customer_email: o.email || undefined, locale: "fr",
    success_url: o.success, cancel_url: o.cancel, metadata: { track: o.token }, setup_intent_data: { metadata: { track: o.token } },
  });
  return s.url;
}

/** Au retour de Stripe : la carte a-t-elle bien été enregistrée pour cette réservation ? */
export async function readCardSetup(sessionId: string, token: string): Promise<{ customer: string; method: string } | null> {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return null;
  const s = await call<{ status: string; customer: string | null; metadata?: { track?: string }; setup_intent?: { status: string; payment_method: string | null } | null }>("GET", `/checkout/sessions/${sessionId}`, { expand: ["setup_intent"] });
  if (s.status !== "complete" || s.metadata?.track !== token || s.setup_intent?.status !== "succeeded" || !s.customer || !s.setup_intent.payment_method) return null;
  return { customer: s.customer, method: s.setup_intent.payment_method };
}

/** Débit de la carte enregistrée, client absent. La même réservation n'est jamais débitée deux fois (clé d'idempotence). */
export async function chargeCard(o: { bookingId: string; cents: number; customer: string; method: string; description: string; email: string }): Promise<string> {
  const pi = await call<{ id: string; status: string }>("POST", "/payment_intents", {
    amount: o.cents, currency: "eur", customer: o.customer, payment_method: o.method, off_session: true, confirm: true,
    description: o.description, receipt_email: o.email, metadata: { booking: o.bookingId },
  }, `booking-${o.bookingId}-${o.method}`);
  if (pi.status !== "succeeded") throw new StripeError("Le paiement n'a pas abouti.", pi.status, pi.id);
  return pi.id;
}
