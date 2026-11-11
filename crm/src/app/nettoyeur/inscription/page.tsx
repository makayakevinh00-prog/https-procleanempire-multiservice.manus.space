import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import { cleanerRecoverAction, cleanerSignupAction } from "@/app/actions/nettoyeur";
import { FIELD_CSS } from "@/components/agent/theme";
import { agentPrefs } from "@/lib/agent";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Devenir nettoyeur — ProClean Empire", robots: { index: false, follow: false } };

const input = "h-12 w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] px-3 text-base";

/** Inscription publique d'un nettoyeur indépendant (étudiant, auto-entrepreneur, entreprise). Accès immédiat après contrôle automatique du SIRET. */
export default function CleanerSignup({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const welcome = searchParams.ok === "actif" ? cookies().get("cleaner_welcome")?.value ?? null : null;
  return (
    <div className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]" data-theme={agentPrefs().theme} lang="fr">
      <style dangerouslySetInnerHTML={{ __html: FIELD_CSS }} />
      <main className="mx-auto max-w-md px-4 py-8">
        <Image src="/logo.png" alt="ProClean Empire" width={187} height={344} className="mb-3 h-16 w-auto" priority />
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Devenir nettoyeur</h1>
        <p className="mt-1 text-[15px] text-[var(--a-mute)]">Étudiant, auto-entrepreneur ou entreprise : voyez les ménages Airbnb disponibles autour de chez vous, acceptez-les en un geste, et soyez payé par virement.</p>
        {searchParams.ok === "actif" && (
          <div role="status" className="mt-4 space-y-3 rounded-2xl bg-[var(--a-okbg)] p-4 text-[15px] font-semibold text-[var(--a-ok)]">
            <p>Bienvenue ! Votre SIRET est vérifié, votre compte est actif. Votre lien personnel vous a aussi été envoyé par e-mail.</p>
            {welcome && <a href={welcome} className="flex h-14 items-center justify-center rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white">Ouvrir mon application</a>}
          </div>
        )}
        {searchParams.ok === "attente" && <div role="status" className="mt-4 rounded-2xl bg-[var(--a-okbg)] p-4 text-[15px] font-semibold text-[var(--a-ok)]">Merci ! L&apos;annuaire des entreprises ne répond pas : nous vérifions votre SIRET à la main et vous envoyons votre lien par e-mail très vite.</div>}
        {searchParams.ok === "lien" && <div role="status" className="mt-4 rounded-2xl bg-[var(--a-okbg)] p-4 text-[15px] font-semibold text-[var(--a-ok)]">Si ce compte existe, un nouveau lien vient d&apos;être envoyé à cette adresse e-mail (l&apos;ancien ne fonctionne plus). Vérifiez aussi vos courriers indésirables.</div>}
        {searchParams.ok === "1" && <div role="status" className="mt-4 rounded-2xl bg-[var(--a-okbg)] p-4 text-[15px] font-semibold text-[var(--a-ok)]">Merci ! Votre demande est bien reçue.</div>}
        {searchParams.error && <div role="alert" className="mt-4 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
        {(!searchParams.ok || searchParams.ok === "lien") && !welcome && (
          <form action={cleanerSignupAction} className="mt-5 space-y-4 rounded-3xl bg-[var(--a-card)] p-4">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Nom et prénom *</span><input name="full_name" required minLength={2} className={input} autoComplete="name" /></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">E-mail *</span><input name="email" type="email" required className={input} autoComplete="email" /></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Téléphone</span><input name="phone" inputMode="tel" className={input} autoComplete="tel" /></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Votre situation</span>
              <select name="statut_pro" defaultValue="auto_entrepreneur" className={input}><option value="etudiant">Étudiant(e) (je crée mon statut d&apos;auto-entrepreneur)</option><option value="auto_entrepreneur">Auto-entrepreneur</option><option value="entreprise">Entreprise</option></select></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">SIRET *</span><input name="siret" required inputMode="numeric" className={input} placeholder="14 chiffres" /><span className="text-xs text-[var(--a-mute)]">Contrôlé automatiquement dans l&apos;annuaire officiel. Pas de SIRET ? Il se crée gratuitement sur autoentrepreneur.urssaf.fr.</span></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Votre adresse *</span><input name="address_line" required className={input} placeholder="12 rue de la Paix" autoComplete="street-address" /></label>
            <div className="grid grid-cols-[110px_1fr] gap-3">
              <label className="block"><span className="mb-1 block text-[14px] font-bold">Code postal *</span><input name="postal_code" required inputMode="numeric" pattern="\d{5}" maxLength={5} className={input} autoComplete="postal-code" /></label>
              <label className="block"><span className="mb-1 block text-[14px] font-bold">Ville *</span><input name="city" required className={input} autoComplete="address-level2" /></label>
            </div>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Jusqu&apos;où acceptez-vous de vous déplacer ?</span>
              <select name="radius_km" defaultValue="15" className={input}><option value="5">5 km autour de chez moi</option><option value="10">10 km</option><option value="15">15 km</option><option value="25">25 km</option><option value="40">40 km</option><option value="60">60 km</option></select>
              <span className="text-xs text-[var(--a-mute)]">Vous verrez les ménages dans ce rayon, avec la distance.</span></label>
            <button className="h-14 w-full rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white">Créer mon compte</button>
          </form>
        )}
        <form action={cleanerRecoverAction} className="mt-6 space-y-2 rounded-3xl border border-[var(--a-line)] p-4">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          <b className="block text-[15px]">Déjà inscrit(e) ? J&apos;ai perdu mon lien</b>
          <input name="email" type="email" required placeholder="Votre e-mail" className={input} autoComplete="email" />
          <button className="h-12 w-full rounded-2xl border border-[var(--a-pri)] text-base font-extrabold text-[var(--a-pri)]">Recevoir un nouveau lien</button>
        </form>
      </main>
    </div>
  );
}
