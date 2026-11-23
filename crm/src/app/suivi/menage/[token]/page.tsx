import type { Metadata } from "next";
import { CheckCircle2, Circle } from "lucide-react";
import { agentClient, agentPrefs } from "@/lib/agent";
import { dayFr, eur, slot, ttc } from "@/lib/cleaner-ui";
import { LegalLinks } from "@/components/legal/links";
import { TrackRefresh } from "@/components/nettoyeur/track-refresh";
import { automationClient, automationSecret } from "@/lib/automation/deps";
import { cardPaymentsOn, readCardSetup } from "@/lib/stripe-card";
import { bookingCardAction, bookingRateAction } from "@/app/actions/nettoyeur";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Suivi de votre ménage — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Track = { status: "nouvelle" | "acceptee" | "refusee"; kind: string; date: string; city: string; postal_code: string; price_ht: number; window_start: string; window_end: string; job_status: string | null; cleaner: string | null; arrived_at: string | null; payment_status?: "carte" | "en_cours" | "payee" | "echec" | null; rating?: number | null };
const PAY: Record<string, string> = { facture: "réglé sur facture, après le ménage", carte: "carte enregistrée, débitée après le ménage", en_cours: "paiement en cours", payee: "payé par carte", echec: "paiement par carte refusé" };
const KIND: Record<string, string> = { studio: "Studio", t2: "2 pièces", t3: "3 pièces", maison: "Maison" };

/** Où en est la demande, en 5 étapes. Renvoie l'étape atteinte (0 à 4) et la phrase à afficher. */
function progress(t: Track): { step: number; title: string; text: string } {
  const who = t.cleaner ?? "Votre nettoyeur";
  if (t.status === "refusee") return { step: -1, title: "Demande non retenue", text: "Nous ne pouvons pas assurer ce ménage. Nous vous avons écrit par e-mail ; rien ne vous sera facturé." };
  if (t.status === "nouvelle") return { step: 0, title: "Demande reçue", text: "Nous validons votre demande. Vous recevez la confirmation par e-mail très vite." };
  if (t.job_status === "annulee") return { step: -1, title: "Ménage annulé", text: "Ce ménage a été annulé. Contactez-nous pour le reprogrammer." };
  if (t.job_status === "validee") return { step: 4, title: "Ménage terminé", text: `${who} a terminé et le ménage a été contrôlé. Merci de votre confiance.` };
  if (t.job_status === "a_verifier" || t.job_status === "a_reprendre") return { step: 3, title: "Ménage en cours de contrôle", text: `${who} a terminé ; nous vérifions le résultat sur photos.` };
  if (t.arrived_at) return { step: 3, title: `${who} est sur place`, text: `Arrivée à ${new Date(t.arrived_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}. Le ménage est en cours.` };
  if (t.job_status === "acceptee") return { step: 2, title: `${who} s'occupe de votre ménage`, text: `Rendez-vous ${dayFr(t.date)}, ${slot(t.window_start, t.window_end)}.` };
  return { step: 1, title: "Ménage confirmé", text: "Nous désignons votre nettoyeur. Son prénom s'affichera ici dès qu'il aura accepté." };
}
const STEPS = ["Demande reçue", "Confirmée", "Nettoyeur désigné", "Ménage en cours", "Terminé"];

export default async function BookingTrack({ params, searchParams }: { params: { token: string }; searchParams: { nouveau?: string; carte?: string; erreur?: string; merci?: string } }) {
  const ok = /^[0-9a-f]{64}$/.test(params.token);
  // Retour de la page Stripe : on vérifie auprès de Stripe que la carte est bien enregistrée pour cette réservation, puis on la rattache.
  const cardOn = ok && (await cardPaymentsOn());
  let cardSaved = false;
  if (cardOn && searchParams.carte) {
    const c = await readCardSetup(searchParams.carte, params.token).catch(() => null);
    if (c) cardSaved = !!(await automationClient().rpc("automation_set_booking_card", { p_secret: automationSecret(), p_token: params.token, p_customer: c.customer, p_method: c.method })).data;
  }
  const { data } = ok ? await agentClient().rpc("booking_track", { p_token: params.token }) : { data: null };
  const t = data as Track | null;
  const p = t ? progress(t) : null;
  return (
    <div className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]" data-theme={agentPrefs().theme} lang="fr">
      <main className="mx-auto max-w-md px-5 pb-12 pt-8">
        <div className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[var(--a-mute)]">ProClean Empire</div>
        {!t || !p ? (
          <section className="mt-4 rounded-3xl bg-[var(--a-card)] p-5">
            <h1 className="text-[22px] font-extrabold">Lien de suivi introuvable</h1>
            <p className="mt-2 text-[15px] text-[var(--a-mute)]">Ce lien est incomplet ou n&apos;est plus valable. Utilisez celui reçu par e-mail, ou écrivez-nous à contact@procleanempire.com.</p>
          </section>
        ) : (
          <>
            {cardSaved && <div role="status" className="mt-4 rounded-2xl bg-[var(--a-okbg)] p-4 text-[15px] font-semibold text-[var(--a-ok)]">Votre demande est enregistrée et votre carte aussi. Vous ne serez débité qu&apos;une fois le ménage terminé et contrôlé.</div>}
            {searchParams.merci && <div role="status" className="mt-4 rounded-2xl bg-[var(--a-okbg)] p-4 text-[15px] font-semibold text-[var(--a-ok)]">Merci pour votre note !</div>}
            {searchParams.erreur && <div role="alert" className="mt-4 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.erreur}</div>}
            {searchParams.nouveau && <div role="status" className="mt-4 rounded-2xl bg-[var(--a-okbg)] p-4 text-[15px] font-semibold text-[var(--a-ok)]">Merci ! Votre demande est enregistrée. Gardez cette page : elle se met à jour toute seule. Le lien vous est aussi envoyé par e-mail.</div>}
            <h1 className="mt-4 text-[28px] font-extrabold leading-tight tracking-tight" aria-live="polite">{p.title}</h1>
            <p className="mt-2 text-[16px] text-[var(--a-mute)]">{p.text}</p>
            {p.step >= 0 && (
              <ol className="mt-6 space-y-3 rounded-3xl bg-[var(--a-card)] p-5">
                {STEPS.map((s, i) => (
                  <li key={s} className={`flex items-center gap-3 text-[16px] ${i <= p.step ? "font-extrabold" : "text-[var(--a-mute)]"}`} aria-current={i === p.step ? "step" : undefined}>
                    {i <= p.step ? <CheckCircle2 className="h-6 w-6 shrink-0 text-[var(--a-ok)]" aria-hidden /> : <Circle className="h-6 w-6 shrink-0" aria-hidden />}
                    {s}
                  </li>
                ))}
              </ol>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-3xl border border-[var(--a-line)] p-5 text-[15px]">
              <div><dt className="text-[13px] font-bold text-[var(--a-mute)]">Logement</dt><dd className="font-bold">{KIND[t.kind] ?? t.kind}</dd></div>
              <div><dt className="text-[13px] font-bold text-[var(--a-mute)]">Lieu</dt><dd className="font-bold">{t.city} {t.postal_code}</dd></div>
              <div><dt className="text-[13px] font-bold text-[var(--a-mute)]">Date</dt><dd className="font-bold">{dayFr(t.date)}</dd></div>
              <div><dt className="text-[13px] font-bold text-[var(--a-mute)]">Créneau</dt><dd className="font-bold">{slot(t.window_start, t.window_end)}</dd></div>
              <div className="col-span-2"><dt className="text-[13px] font-bold text-[var(--a-mute)]">Prix</dt><dd className="font-bold">{eur(ttc(t.price_ht))} TTC — {PAY[t.payment_status ?? "facture"]}</dd></div>
            </dl>
            {p.step >= 0 && cardOn && (!t.payment_status || t.payment_status === "echec") && (
              <form action={bookingCardAction.bind(null, params.token)} className="mt-4 rounded-3xl bg-[var(--a-card)] p-5">
                <h2 className="text-[17px] font-extrabold">{t.payment_status === "echec" ? "Le paiement n'a pas abouti" : "Payer par carte"}</h2>
                <p className="mt-1 text-[14px] text-[var(--a-mute)]">{t.payment_status === "echec" ? "Enregistrez une autre carte pour régler ce ménage." : "Enregistrez votre carte maintenant : vous n'êtes débité qu'après le ménage terminé et contrôlé. Paiement sécurisé par Stripe."}</p>
                <button className="mt-3 h-12 w-full rounded-2xl bg-[var(--a-pri)] text-[16px] font-extrabold text-white active:opacity-90">{t.payment_status === "echec" ? "Enregistrer une autre carte" : "Enregistrer ma carte"}</button>
              </form>
            )}
            {p.step === 4 && (t.rating ? (
              <p className="mt-4 rounded-3xl bg-[var(--a-card)] p-5 text-[15px] font-bold">Votre note : {"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</p>
            ) : (
              <form action={bookingRateAction.bind(null, params.token)} className="mt-4 rounded-3xl bg-[var(--a-card)] p-5">
                <fieldset>
                  <legend className="text-[17px] font-extrabold">Comment s&apos;est passé votre ménage ?</legend>
                  <div className="mt-3 flex justify-between gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className="flex-1 cursor-pointer rounded-2xl border border-[var(--a-line)] py-3 text-center text-[16px] font-extrabold has-[:checked]:border-[var(--a-pri)] has-[:checked]:bg-[var(--a-pri)] has-[:checked]:text-white">
                        <input type="radio" name="rating" value={n} required className="sr-only" />{n} ★
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="mt-3 block"><span className="mb-1 block text-[14px] font-bold">Un commentaire (facultatif)</span><textarea name="comment" rows={3} maxLength={600} className="w-full rounded-2xl border border-[var(--a-line)] bg-[var(--a-bg)] p-3 text-[15px]" /></label>
                <button className="mt-3 h-12 w-full rounded-2xl bg-[var(--a-pri)] text-[16px] font-extrabold text-white active:opacity-90">Envoyer ma note</button>
              </form>
            ))}
            <p className="mt-4 text-[14px] text-[var(--a-mute)]">Une question ou un changement ? contact@procleanempire.com</p>
            {p.step >= 0 && p.step < 4 && <TrackRefresh />}
          </>
        )}
        <div className="mt-8"><LegalLinks /></div>
      </main>
    </div>
  );
}
