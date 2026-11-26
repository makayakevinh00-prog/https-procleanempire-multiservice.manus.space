import { NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/server";
import { stripe, verifyStripeSignature } from "@/lib/stripe";
import { syncIdentity } from "@/lib/identity";

export const dynamic = "force-dynamic";

/**
 * Notifications de Stripe : mandat signé, prélèvement réussi, rejeté ou contesté.
 * Chaque message est vérifié par sa signature ; un message non signé est refusé. Traitement sans doublon : rejouer un message ne change rien.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"), secret)) return NextResponse.json({ error: "signature" }, { status: 400 });
  let event: any;
  try { event = JSON.parse(payload); } catch { return NextResponse.json({ error: "format" }, { status: 400 }); }
  const obj = event?.data?.object ?? {};
  if (typeof event.type === "string" && event.type.startsWith("identity.verification_session.")) {
    if (obj.id && obj.metadata?.cleaner_id) {
      try { await syncIdentity(obj.metadata.cleaner_id, obj.id); } catch (e) { console.error("[identité] webhook", e); return NextResponse.json({ error: "traitement" }, { status: 500 }); }
    }
    return NextResponse.json({ received: true });
  }
  const sb = createAdmin();

  try {
    if (typeof event.type === "string" && event.type.startsWith("identity.verification_session.") && obj.id && obj.metadata?.cleaner_id) {
      await syncIdentity(obj.metadata.cleaner_id, obj.id);
    } else if (event.type === "checkout.session.completed" && obj.mode === "setup" && obj.setup_intent) {
      const clientId = obj.metadata?.client_id;
      if (clientId) {
        const si = await stripe<any>("GET", `/setup_intents/${obj.setup_intent}`, { expand: ["payment_method"] });
        const pm = si.payment_method;
        if (si.status === "succeeded" && pm?.id) {
          await sb.from("clients").update({
            sepa_mandate_status: "actif", sepa_payment_method_id: pm.id, sepa_mandate_id: typeof si.mandate === "string" ? si.mandate : si.mandate?.id ?? null,
            sepa_last4: pm.sepa_debit?.last4 ?? null, sepa_mandate_at: new Date().toISOString(), sepa_mandate_url: null, sepa_mandate_url_at: null
          }).eq("id", clientId);
        }
      }
    } else if (event.type === "mandate.updated" && obj.status === "inactive") {
      await sb.from("clients").update({ sepa_mandate_status: "revoque" }).eq("sepa_mandate_id", obj.id);
    } else if (event.type === "payment_intent.succeeded" && obj.metadata?.invoice_id) {
      const { data: inv } = await sb.from("invoices").select("id, number, status, sepa_status, clients(name)").eq("id", obj.metadata.invoice_id).maybeSingle();
      const { data: already } = await sb.from("payments").select("id").eq("reference", obj.id).maybeSingle();
      if (inv && !already) {
        const amount = Number(obj.amount_received ?? obj.amount) / 100;
        const { data: pay, error } = await sb.from("payments").insert({
          source: "stripe", amount, received_at: new Date().toISOString(), counterparty: (inv as any).clients?.name ?? null,
          label: `Prélèvement SEPA · ${(inv as any).number}`, reference: obj.id
        }).select("id").single();
        if (error) throw new Error(error.message);
        if (["envoye", "en_retard"].includes((inv as any).status)) {
          // Le patron a lancé lui-même ce prélèvement : le rapprochement est son geste, y compris pour un contact réservé.
          const { error: e2 } = await sb.rpc("reconcile_payment", { p_payment_id: pay!.id, p_invoice_id: (inv as any).id, p_ack_reserved: true });
          if (e2) throw new Error(e2.message);
        }
      }
      if (inv) await sb.from("invoices").update({ sepa_status: "paye", sepa_failure: null }).eq("id", (inv as any).id);
    } else if (event.type === "payment_intent.payment_failed" && obj.metadata?.invoice_id) {
      await sb.from("invoices").update({ sepa_status: "rejete", sepa_failure: String(obj.last_payment_error?.message ?? "Prélèvement rejeté par la banque").slice(0, 300) }).eq("id", obj.metadata.invoice_id);
    } else if (event.type === "charge.dispute.created" && obj.payment_intent) {
      await sb.from("invoices").update({ sepa_status: "conteste", sepa_failure: "Le client a contesté ce prélèvement auprès de sa banque : la somme est reprise par Stripe." }).eq("stripe_payment_intent_id", obj.payment_intent);
    }
  } catch (e) {
    console.error("[stripe] notification non traitée", event?.type, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "traitement" }, { status: 500 }); // Stripe renverra le message
  }
  return NextResponse.json({ received: true });
}
