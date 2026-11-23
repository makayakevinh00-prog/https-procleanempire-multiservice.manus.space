import "server-only";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { mailConfigured, sendMail } from "@/lib/mail";
import { chargeCard, StripeError, stripeConfigured } from "@/lib/stripe";
import { ttc } from "@/lib/cleaner-ui";
import { trackUrl } from "@/lib/marketplace/auto-accept";

type Due = { id: string; name: string; email: string; kind: string; city: string; date: string; price_ht: number; customer: string; method: string; track_token: string };
const KIND: Record<string, string> = { studio: "Studio", t2: "2 pièces", t3: "3 pièces", maison: "Maison" };
const eur = (n: number) => `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const admin = () => process.env.MAIL_ADMIN ?? "contact@procleanempire.com";

/**
 * Débite les ménages validés dont le client a enregistré sa carte. Une réservation n'est prise qu'une fois par la base ;
 * en cas de refus, elle passe « en échec » : le client peut enregistrer une autre carte, sinon le patron facture.
 */
export async function chargeValidatedBookings(): Promise<{ paid: number; failed: number }> {
  if (!stripeConfigured()) return { paid: 0, failed: 0 };
  const sb = automationClient(), secret = automationSecret();
  const { data, error } = await sb.rpc("automation_claim_booking_charges", { p_secret: secret });
  if (error) throw new Error(error.message);
  let paid = 0, failed = 0;
  for (const b of (data ?? []) as Due[]) {
    const total = ttc(b.price_ht), label = `Ménage ${KIND[b.kind] ?? b.kind} du ${b.date} à ${b.city}`;
    try {
      const intent = await chargeCard({ bookingId: b.id, cents: Math.round(total * 100), customer: b.customer, method: b.method, description: `${label} — ProClean Empire`, email: b.email });
      await sb.rpc("automation_set_booking_payment", { p_secret: secret, p_id: b.id, p_ok: true, p_intent: intent, p_error: null });
      paid++;
      if (mailConfigured()) {
        await sendMail({ to: b.email, subject: "Votre ménage est terminé — paiement reçu", text: `Bonjour ${b.name.split(" ")[0]},\n\nVotre ménage est terminé et contrôlé. Nous avons débité ${eur(total)} TTC sur la carte enregistrée (${label}).\n\nVotre avis nous aide : notez votre ménage en 10 secondes.\n${trackUrl(b.track_token) ?? ""}\n\nMerci de votre confiance,\nProClean Empire` }).catch(() => undefined);
        await sendMail({ to: admin(), subject: `Paiement reçu par carte : ${eur(total)}`, text: `${b.name} — ${label}.\n${eur(b.price_ht)} HT, ${eur(total)} TTC, débités après validation du ménage.\nRéférence Stripe : ${intent}\nFacture à émettre « payée » dans le CRM.` }).catch(() => undefined);
      }
    } catch (e) {
      const why = e instanceof StripeError ? `${e.message}${e.code ? ` (${e.code})` : ""}` : "Paiement impossible pour le moment";
      await sb.rpc("automation_set_booking_payment", { p_secret: secret, p_id: b.id, p_ok: false, p_intent: e instanceof StripeError ? e.intent ?? null : null, p_error: why });
      failed++;
      if (mailConfigured()) {
        await sendMail({ to: b.email, subject: "Votre paiement n'a pas abouti — ProClean Empire", text: `Bonjour ${b.name.split(" ")[0]},\n\nVotre ménage est terminé, mais le paiement de ${eur(total)} TTC n'a pas pu être débité sur votre carte.\n\nVous pouvez enregistrer une autre carte ici :\n${trackUrl(b.track_token) ?? ""}\n\nSans nouvelle carte, vous recevrez une facture à régler par virement.\n\nProClean Empire` }).catch(() => undefined);
        await sendMail({ to: admin(), subject: `Paiement par carte refusé : ${b.name}`, text: `${label} — ${eur(total)} TTC.\nMotif : ${why}\nLe client a reçu un lien pour enregistrer une autre carte. À défaut : facture classique.` }).catch(() => undefined);
      }
    }
  }
  return { paid, failed };
}
