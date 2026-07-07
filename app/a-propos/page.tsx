import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { CtaBand } from "@/components/sections/cta-band";
import { VisualPlaceholder } from "@/components/ui/visual-placeholder";

export const metadata = buildMetadata({
  title: "À propos",
  description:
    "Découvrez l'approche ProClean Empire: interlocuteur unique, suivi personnalisé et réactivité pour les entreprises d'Île-de-France.",
  path: "/a-propos"
});

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="Une entreprise agile, structurée pour le B2B"
        description="ProClean Empire accompagne les entreprises qui veulent un partenaire fiable, réactif et facile à piloter au quotidien."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "À propos" }
        ]}
        actions={
          <>
            <Link href="/devis" className="btn-primary">
              Obtenir un devis
            </Link>
            <Link href="/contact" className="btn-secondary">
              Nous parler de vos besoins
            </Link>
          </>
        }
      />
      <section className="section pt-0">
        <div className="grid gap-8 lg:grid-cols-2">
          <article className="card p-6 md:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">Notre engagement</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Nous avons construit ProClean Empire pour offrir aux entreprises un service de
              propreté plus simple à gérer: un interlocuteur unique, des décisions rapides,
              des équipes suivies et une qualité contrôlée dans le temps.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li>✓ Contrats ajustables selon votre activité réelle</li>
              <li>✓ Coordination simplifiée pour les office managers</li>
              <li>✓ Pilotage clair pour les dirigeants et services généraux</li>
            </ul>
          </article>
          <VisualPlaceholder label="PHOTO ÉQUIPE" ratio="wide" />
        </div>
      </section>
      <CtaBand />
    </>
  );
}
