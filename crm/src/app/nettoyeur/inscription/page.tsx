import type { Metadata } from "next";
import Image from "next/image";
import { cleanerSignupAction } from "@/app/actions/nettoyeur";
import { FIELD_CSS } from "@/components/agent/theme";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Devenir nettoyeur — ProClean Empire", robots: { index: false, follow: false } };

const input = "h-12 w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-bg)] px-3 text-base";

/** Inscription publique d'un nettoyeur indépendant (étudiant, auto-entrepreneur, entreprise). Le patron valide avant tout accès. */
export default function CleanerSignup({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  return (
    <div className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]" data-theme="system" lang="fr">
      <style dangerouslySetInnerHTML={{ __html: FIELD_CSS }} />
      <main className="mx-auto max-w-md px-4 py-8">
        <Image src="/logo.png" alt="ProClean Empire" width={187} height={344} className="mb-3 h-16 w-auto" priority />
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Devenir nettoyeur</h1>
        <p className="mt-1 text-[15px] text-[var(--a-mute)]">Étudiant, auto-entrepreneur ou entreprise : choisissez vos ménages Airbnb, près de chez vous, et soyez payé par virement chaque semaine ou fin de mois.</p>
        {searchParams.ok && <div role="status" className="mt-4 rounded-2xl bg-[var(--a-okbg)] p-4 text-[15px] font-semibold text-[var(--a-ok)]">Merci ! Votre demande est bien reçue. Nous vérifions votre dossier puis vous envoyons votre lien personnel par e-mail.</div>}
        {searchParams.error && <div role="alert" className="mt-4 rounded-2xl bg-[var(--a-badbg)] p-3 text-sm font-semibold text-[var(--a-bad)]">{searchParams.error}</div>}
        {!searchParams.ok && (
          <form action={cleanerSignupAction} className="mt-5 space-y-4 rounded-3xl bg-[var(--a-card)] p-4">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Nom et prénom *</span><input name="full_name" required minLength={2} className={input} autoComplete="name" /></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">E-mail *</span><input name="email" type="email" required className={input} autoComplete="email" /></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Téléphone</span><input name="phone" inputMode="tel" className={input} autoComplete="tel" /></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Votre situation</span>
              <select name="statut_pro" defaultValue="auto_entrepreneur" className={input}><option value="etudiant">Étudiant(e) (je crée mon statut d&apos;auto-entrepreneur)</option><option value="auto_entrepreneur">Auto-entrepreneur</option><option value="entreprise">Entreprise</option></select></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">SIRET</span><input name="siret" inputMode="numeric" className={input} placeholder="14 chiffres" /><span className="text-xs text-[var(--a-mute)]">Obligatoire pour être payé : travailler en indépendant demande un SIRET (gratuit à créer sur autoentrepreneur.urssaf.fr).</span></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Ville</span><input name="city" className={input} /></label>
            <label className="block"><span className="mb-1 block text-[14px] font-bold">Départements où vous travaillez *</span><input name="departments" required className={input} placeholder="95, 78, 75" /></label>
            <button className="h-14 w-full rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white">Envoyer ma demande</button>
          </form>
        )}
      </main>
    </div>
  );
}
