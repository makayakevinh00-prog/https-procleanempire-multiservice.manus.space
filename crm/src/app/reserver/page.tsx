import type { Metadata } from "next";
import Image from "next/image";
import { agentClient } from "@/lib/agent";
import { bookCleaningAction } from "@/app/actions/nettoyeur";
import { FIELD_CSS } from "@/components/agent/theme";
import { eur } from "@/lib/cleaner-ui";
import { agentPrefs } from "@/lib/agent";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Réserver un ménage — ProClean Empire", description: "Réservez un ménage à domicile en quelques clics : un nettoyeur vient chez vous entre 11 h et 14 h." };

const input = "h-12 w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] px-3 text-base";
const KINDS: [string, string][] = [["studio", "Studio"], ["t2", "2 pièces"], ["t3", "3 pièces"], ["maison", "Maison"]];

/** Réservation d'un ménage à domicile, comme une application de VTC : choisir le logement, le jour, l'adresse ; la demande est confirmée par l'entreprise. */
export default async function Reserve({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const { data } = await agentClient().rpc("booking_prices");
  const prices = (data ?? {}) as Record<string, number | string>;
  const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const max = new Date(Date.now() + 90 * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  return (
    <div className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]" data-theme={agentPrefs().theme} lang="fr">
      <style dangerouslySetInnerHTML={{ __html: FIELD_CSS }} />
      <main className="mx-auto max-w-md px-4 py-8">
        <Image src="/logo.png" alt="ProClean Empire" width={187} height={344} className="mb-3 h-16 w-auto" priority />
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Un ménage chez vous</h1>
        <p className="mt-1 text-[15px] text-[var(--a-mute)]">Choisissez le jour : un nettoyeur de confiance passe entre 11 h et 14 h. Le paiement se fait après le ménage, sur facture.</p>
        {searchParams.ok && <div role="status" className="mt-4 rounded-2xl bg-[var(--a-okbg)] p-4 text-[15px] font-semibold text-[var(--a-ok)]">Merci ! Votre demande est bien reçue. Nous vous confirmons le créneau par e-mail très vite.</div>}
        {searchParams.error && <div role="alert" className="mt-4 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
        {!searchParams.ok && (
          <form action={bookCleaningAction} className="mt-5 space-y-4 rounded-3xl bg-[var(--a-card)] p-4">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            <fieldset>
              <legend className="mb-1 text-[14px] font-bold">Votre logement *</legend>
              <div className="grid grid-cols-2 gap-2">
                {KINDS.map(([k, l], i) => (
                  <label key={k} className="flex cursor-pointer flex-col rounded-2xl border-2 border-[var(--a-line)] bg-[var(--a-bg)] p-3 has-[:checked]:border-[var(--a-pri)] has-[:checked]:bg-[var(--a-soft)]">
                    <input type="radio" name="kind" value={k} required defaultChecked={i === 1} className="sr-only" />
                    <b className="text-[16px]">{l}</b>
                    <span className="text-[13px] text-[var(--a-mute)]">{prices[k] != null ? `${eur(Number(prices[k]))} HT` : ""}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Jour du ménage *</span><input name="job_date" type="date" required min={tomorrow} max={max} className={input} /></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Adresse *</span><input name="address" required minLength={5} autoComplete="street-address" className={input} placeholder="12 rue de la Paix" /></label>
            <div className="grid grid-cols-[7rem_1fr] gap-2">
              <label className="block"><span className="mb-1 block text-[14px] font-bold">Code postal *</span><input name="postal_code" required inputMode="numeric" pattern="\d{5}" maxLength={5} autoComplete="postal-code" className={input} /></label>
              <label className="block"><span className="mb-1 block text-[14px] font-bold">Ville *</span><input name="city" required autoComplete="address-level2" className={input} /></label>
            </div>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Comment entrer ? (code, boîte à clés…)</span><input name="access_notes" maxLength={400} className={input} /></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Nom et prénom *</span><input name="name" required minLength={2} autoComplete="name" className={input} /></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">E-mail *</span><input name="email" type="email" required autoComplete="email" className={input} /></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Téléphone</span><input name="phone" inputMode="tel" autoComplete="tel" className={input} /></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Une précision ?</span><textarea name="note" rows={2} maxLength={1000} className="w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] p-3 text-base" placeholder="Linge à changer, animaux, points d'attention…" /></label>
            <button className="h-14 w-full rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white">Demander ce ménage</button>
            <p className="text-center text-xs text-[var(--a-mute)]">Prix hors taxes pour un ménage standard. Votre demande est confirmée par l&apos;entreprise avant tout engagement.</p>
          </form>
        )}
      </main>
    </div>
  );
}
