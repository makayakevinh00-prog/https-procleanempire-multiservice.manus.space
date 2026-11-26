import type { Metadata } from "next";
import { agentClient, agentMessage, isToken, type CleanerOverview } from "@/lib/agent";
import { cleanerProfileAction, cleanerPhoneAction, cleanerIbanAction } from "@/app/actions/nettoyeur";
import { Gate } from "@/components/agent/gate";
import { GpsButton } from "@/components/nettoyeur/live";
import { BackToProfile, sectionLabel } from "@/components/nettoyeur/profile-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mes informations — ProClean Empire", robots: { index: false, follow: false }, referrer: "no-referrer" };

const input = "h-12 w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] px-3 text-base";
const lab = "mb-1 block text-[14px] font-bold";
const hint = "mt-1 block text-xs text-[var(--a-mute)]";

/** Mes informations : trois rubriques indépendantes (adresse et secteur, contact, paiement), chacune avec son propre bouton Enregistrer. */
export default async function CleanerInfos({ params, searchParams }: { params: { token: string }; searchParams: { error?: string; ok?: string } }) {
  const token = params.token;
  if (!isToken(token)) return <Gate text="Ce lien n'est pas valide." />;
  const { data, error } = await agentClient().rpc("cleaner_overview", { p_token: token });
  if (error) return <Gate text={agentMessage(error.message)} />;
  const o = data as CleanerOverview;
  return (
    <>
      <BackToProfile token={token} />
      <h1 className="text-[30px] font-extrabold tracking-tight">Mes informations</h1>
      {searchParams.error && <div role="alert" className="mt-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
      {searchParams.ok && <div role="status" className="mt-3 rounded-2xl bg-[var(--a-okbg)] p-3 text-sm font-semibold text-[var(--a-ok)]">{searchParams.ok}</div>}
      <form action={cleanerProfileAction.bind(null, token)}>
        <h2 id="adresse" className={`${sectionLabel} scroll-mt-4`}>Adresse et secteur</h2>
        <div className="space-y-4 rounded-3xl bg-[var(--a-card)] p-4">
          <label className="block"><span className={lab}>Votre adresse</span><input name="address_line" defaultValue={o.address_line ?? ""} className={input} autoComplete="street-address" /></label>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <label className="block"><span className={lab}>Code postal</span><input name="postal_code" defaultValue={o.postal_code ?? ""} required inputMode="numeric" pattern="\d{5}" maxLength={5} className={input} /></label>
            <label className="block"><span className={lab}>Ville</span><input name="city" defaultValue={o.city ?? ""} className={input} /></label>
          </div>
          <GpsButton />
          <label className="block"><span className={lab}>Rayon de déplacement (km)</span><input name="radius_km" type="number" min={1} max={100} defaultValue={o.radius_km} required className={input} /><span className={hint}>{o.has_location ? "Adresse localisée : vous voyez les ménages dans ce rayon, avec la distance." : "Adresse non localisée : vous voyez les ménages de votre département. Complétez l'adresse pour activer le rayon."}</span></label>
          <button className="fx-press h-12 w-full rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">Enregistrer l&apos;adresse</button>
        </div>
      </form>
      <form action={cleanerPhoneAction.bind(null, token)}>
        <h2 id="contact" className={`${sectionLabel} scroll-mt-4`}>Contact</h2>
        <div className="space-y-4 rounded-3xl bg-[var(--a-card)] p-4">
          <label className="block"><span className={lab}>Téléphone</span><input name="phone" defaultValue={o.phone ?? ""} inputMode="tel" className={input} /><span className={hint}>Utilisé si la direction doit vous joindre pendant un ménage.</span></label>
          <button className="fx-press h-12 w-full rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">Enregistrer le téléphone</button>
        </div>
      </form>
      <form action={cleanerIbanAction.bind(null, token)}>
        <h2 id="paiement" className={`${sectionLabel} scroll-mt-4`}>Paiement</h2>
        <div className="space-y-4 rounded-3xl bg-[var(--a-card)] p-4">
          <label className="block"><span className={lab}>IBAN pour vos virements</span><input name="iban" autoComplete="off" required className={input} placeholder={o.has_iban ? `Enregistré (${o.iban_hint}) : saisissez pour le remplacer` : "FR76 …"} /><span className={hint}>Il n&apos;est jamais affiché en entier, ni à vous ni aux propriétaires.</span></label>
          <button className="fx-press h-12 w-full rounded-2xl bg-[var(--a-pri)] text-base font-extrabold text-white">Enregistrer l&apos;IBAN</button>
        </div>
      </form>
    </>
  );
}
