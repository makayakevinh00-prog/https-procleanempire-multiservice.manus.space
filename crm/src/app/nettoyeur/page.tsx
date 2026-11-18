import type { Metadata } from "next";
import { FIELD_CSS } from "@/components/agent/theme";
import { CleanerLanding } from "@/components/nettoyeur/landing";
import { Resume } from "@/components/nettoyeur/live";
import { agentPrefs } from "@/lib/agent";

export const metadata: Metadata = {
  title: "ProClean Nettoyeur — Des ménages Airbnb près de chez vous",
  description:
    "Application pour nettoyeurs indépendants : recevez en direct les ménages Airbnb autour de vous, acceptez ceux qui vous conviennent, soyez payé par virement.",
  robots: { index: false, follow: false },
};

/** Entrée de l'application nettoyeur : déjà connecté sur ce téléphone → ses ménages ; sinon la page de présentation. */
export default function CleanerHome({
  searchParams,
}: {
  searchParams: { reset?: string };
}) {
  return (
    <div
      className="agent-app min-h-screen bg-[var(--a-bg)] text-[var(--a-ink)]"
      data-theme={agentPrefs().theme}
      lang="fr"
    >
      <style dangerouslySetInnerHTML={{ __html: FIELD_CSS }} />
      <Resume reset={!!searchParams.reset}>
        <CleanerLanding />
      </Resume>
    </div>
  );
}
