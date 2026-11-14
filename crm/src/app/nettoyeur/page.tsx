import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FIELD_CSS } from "@/components/agent/theme";
import { Resume } from "@/components/nettoyeur/live";
import { agentPrefs } from "@/lib/agent";

export const metadata: Metadata = { title: "ProClean Nettoyeur", robots: { index: false, follow: false } };

/** Entrée de l'application nettoyeur : déjà connecté sur ce téléphone → ses ménages ; sinon créer un compte ou retrouver son lien. */
export default function CleanerHome({ searchParams }: { searchParams: { reset?: string } }) {
  return (
    <div className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]" data-theme={agentPrefs().theme} lang="fr">
      <style dangerouslySetInnerHTML={{ __html: FIELD_CSS }} />
      <main className="mx-auto max-w-md px-4 py-10">
        <Resume reset={!!searchParams.reset}>
          <Image src="/logo.png" alt="ProClean Empire" width={187} height={344} className="mb-4 h-20 w-auto" priority />
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Faites des ménages près de chez vous</h1>
          <p className="mt-2 text-[17px] text-[var(--a-mute)]">Les ménages Airbnb autour de vous apparaissent en direct. Vous acceptez ceux qui vous conviennent, vous êtes payé par virement.</p>
          <ul className="mt-5 space-y-2 text-[16px]">
            <li>📍 Vous choisissez votre rayon de déplacement</li>
            <li>⚡ Le premier qui accepte obtient le ménage</li>
            <li>💶 Vous voyez ce que vous gagnez avant d&apos;accepter</li>
          </ul>
          <Link href="/nettoyeur/inscription" className="mt-7 flex h-14 items-center justify-center rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white">Créer mon compte</Link>
          <Link href="/connexion" className="mt-3 flex h-12 items-center justify-center rounded-2xl border border-[var(--a-pri)] text-base font-extrabold text-[var(--a-pri)]">J&apos;ai déjà un compte : me connecter</Link>
        </Resume>
      </main>
    </div>
  );
}
