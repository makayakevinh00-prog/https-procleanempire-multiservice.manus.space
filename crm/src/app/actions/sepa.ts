"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checked, dbMessage, flash } from "@/lib/data";
import { requireReservedAck } from "@/lib/action-helpers";
import { loadPriceCheck } from "@/lib/price-check-data";
import { stripe, stripeConfigured, StripeError, toCents } from "@/lib/stripe";

const site = () => `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "proclean-crm.vercel.app"}`;
const NOT_READY = "Le prélèvement SEPA n'est pas encore branché : la clé Stripe n'est pas renseignée dans l'hébergement.";

/**
 * Crée le lien que le client ouvre pour saisir son IBAN et signer le mandat de prélèvement chez Stripe.
 * Le lien est valable 24 heures ; rien n'est prélevé à cette étape.
 */
export async function createMandateLinkAction(clientId: string) {
  await requireOwner();
  const back = `/clients/${clientId}`;
  if (!stripeConfigured()) flash(back, "error", NOT_READY);
  const supabase = createClient();
  const { data: c } = await supabase.from("clients").select("id, name, email, stripe_customer_id, sepa_mandate_status").eq("id", clientId).maybeSingle();
  if (!c) flash(back, "error", "Client introuvable.");
  const client = c as any;
  let failure: string | null = null;
  try {
    let customerId: string | null = client.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe<{ id: string }>("POST", "/customers", { name: client.name, email: client.email ?? undefined, preferred_locales: ["fr"], metadata: { client_id: client.id } }, `client-${client.id}`);
      customerId = customer.id;
      await supabase.from("clients").update({ stripe_customer_id: customerId }).eq("id", client.id);
    }
    const session = await stripe<{ url: string }>("POST", "/checkout/sessions", {
      mode: "setup", customer: customerId, payment_method_types: ["sepa_debit"], locale: "fr",
      success_url: `${site()}/mandat/merci`, cancel_url: `${site()}/mandat/merci?annule=1`,
      metadata: { client_id: client.id }, setup_intent_data: { metadata: { client_id: client.id } }
    });
    const patch: Record<string, unknown> = { sepa_mandate_url: session.url, sepa_mandate_url_at: new Date().toISOString() };
    if (client.sepa_mandate_status !== "actif") patch.sepa_mandate_status = "en_attente";
    const { error } = await supabase.from("clients").update(patch).eq("id", client.id);
    if (error) failure = dbMessage(error);
  } catch (e) {
    failure = e instanceof StripeError ? `Stripe : ${e.message}` : "Le lien n'a pas pu être créé.";
  }
  if (failure) flash(back, "error", failure);
  revalidatePath(back);
  flash(back, "ok", "Lien de mandat créé : envoyez-le au client, il est valable 24 heures.");
}

/**
 * Prélève une facture émise sur le compte du client, par son mandat SEPA. Action volontaire du patron, facture par facture :
 * jamais automatique. Le contrôle des prix s'applique comme à l'envoi. La facture ne passe « payée » qu'à la confirmation de Stripe.
 */
export async function chargeInvoiceSepaAction(invoiceId: string, fd: FormData) {
  await requireOwner();
  const back = `/factures/${invoiceId}`;
  if (!stripeConfigured()) flash(back, "error", NOT_READY);
  if (!checked(fd, "ack_notice")) flash(back, "error", "Confirmez que le client a été prévenu du prélèvement.");
  const supabase = createClient();
  const { data: row } = await supabase.from("invoices")
    .select("id, number, client_id, status, total_ht, total_ttc, paid_amount, issue_date, sepa_status, invoice_lines(description, quantity, unit_price_ht), clients(name, stripe_customer_id, sepa_mandate_status, sepa_payment_method_id, sepa_mandate_id)")
    .eq("id", invoiceId).maybeSingle();
  if (!row) flash(back, "error", "Facture introuvable.");
  const inv = row as any, client = inv.clients;
  if (!["envoye", "en_retard"].includes(inv.status)) flash(back, "error", "Seule une facture envoyée ou en retard peut être prélevée.");
  if (inv.sepa_status === "en_cours") flash(back, "error", "Un prélèvement est déjà en cours pour cette facture.");
  if (client?.sepa_mandate_status !== "actif" || !client?.sepa_payment_method_id || !client?.stripe_customer_id) flash(back, "error", "Ce client n'a pas de mandat de prélèvement actif.");
  await requireReservedAck(inv.client_id, fd, back);
  const price = await loadPriceCheck(supabase, inv);
  if (price.verdict === "bloquant") flash(back, "error", `Contrôle des prix : ${price.findings.filter((f) => f.level === "bloquant").map((f) => f.title).join(" · ")}. Rien n'a été prélevé.`);
  if (price.verdict === "a_confirmer" && !checked(fd, "ack_price")) flash(back, "error", `Contrôle des prix : ${price.findings.map((f) => f.title).join(" · ")}. Cochez « J'ai vérifié le prix » pour prélever quand même.`);
  const remaining = Math.round((Number(inv.total_ttc) - Number(inv.paid_amount)) * 100) / 100;
  if (!(remaining > 0)) flash(back, "error", "Il ne reste rien à payer sur cette facture.");

  let intentId = "", refused: string | null = null;
  try {
    const intent = await stripe<{ id: string; status: string }>("POST", "/payment_intents", {
      amount: toCents(remaining), currency: "eur", customer: client.stripe_customer_id, payment_method: client.sepa_payment_method_id,
      payment_method_types: ["sepa_debit"], mandate: client.sepa_mandate_id ?? undefined, confirm: true, off_session: true,
      description: `Facture ${inv.number} — ProClean Empire`, metadata: { invoice_id: inv.id, invoice_number: inv.number }
    }, `facture-${inv.id}-${toCents(remaining)}`); // même facture, même montant : Stripe ne crée jamais deux prélèvements
    intentId = intent.id;
  } catch (e) {
    refused = e instanceof StripeError ? `Stripe a refusé le prélèvement : ${e.message}` : "Le prélèvement n'a pas pu être lancé.";
  }
  if (refused) flash(back, "error", refused);
  const { error } = await supabase.from("invoices").update({ stripe_payment_intent_id: intentId, sepa_status: "en_cours", sepa_failure: null, sepa_requested_at: new Date().toISOString() }).eq("id", inv.id);
  if (error) flash(back, "error", `Prélèvement lancé chez Stripe (${intentId}) mais non enregistré ici : ${dbMessage(error)}`);
  revalidatePath(back); revalidatePath("/factures");
  flash(back, "ok", `Prélèvement de ${remaining.toFixed(2).replace(".", ",")} € lancé. La facture passera « payée » quand la banque aura confirmé (quelques jours).`);
}
