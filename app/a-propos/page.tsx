import Image from "next/image";
import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { CtaBand } from "@/components/sections/cta-band";

export const metadata = buildMetadata({
  title: "À propos de ProClean Empire, entreprise de nettoyage à Pontoise",
  description:
    "ProClean Empire, entreprise de nettoyage installée à Pontoise : interlocuteur unique, suivi personnalisé et réactivité pour les entreprises et propriétaires du Val-d'Oise et de Paris.",
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
            <h2 className="text-2xl lp-serif text-[#101828]">Notre engagement</h2>
            <p className="mt-4 text-lg leading-relaxed text-[#475467]">
              Nous avons construit ProClean Empire pour offrir aux entreprises une gestion des
              prestations plus simple: un interlocuteur unique, une réactivité opérationnelle,
              des équipes suivies et une qualité contrôlée dans le temps.
            </p>
            <ul className="mt-6 space-y-3 text-base text-[#101828]">
              <li>✓ Contrats ajustables selon votre activité réelle</li>
              <li>✓ Coordination simplifiée pour les office managers</li>
              <li>✓ Pilotage clair pour les dirigeants et services généraux</li>
            </ul>
          </article>
          <Image
            src="/media/photos/landing/boutique-presentoirs.webp"
            alt="Présentoirs de lunettes d'une boutique, étagères et vitres nettoyées"
            width={938}
            height={704}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-[4/3] w-full rounded-[28px] object-cover"
          />
        </div>
      </section>
      <CtaBand />
    </>
  );
}
