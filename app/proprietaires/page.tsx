import Link from "next/link";
import { PageHero } from "@/components/sections/page-hero";
import { buildMetadata, siteConfig } from "@/lib/site";

// Page volontairement discrète (règle §7.4) : hors menu, hors plan du site, non indexée.
export const metadata = {
  ...buildMetadata({
    title: "Propriétaires : nous pouvons aussi gérer votre bien",
    description:
      "Propriétaire d'un logement en location courte durée à Pontoise, Cergy ou en Île-de-France ? ProClean Empire peut aussi s'occuper de la gestion de votre bien.",
    path: "/proprietaires"
  }),
  robots: { index: false, follow: true }
};

const points = [
  {
    title: "Ménage et linge",
    text: "Le logement est préparé entre chaque voyageur par notre propre équipe, avec la même checklist à chaque passage."
  },
  {
    title: "Accueil des voyageurs",
    text: "Remise des clés ou boîte à clés, réponses aux questions pratiques et suivi des arrivées et des départs."
  },
  {
    title: "Petits imprévus",
    text: "Consommables, petite casse, objet oublié : nous vous prévenons et nous organisons la solution avec vous."
  },
  {
    title: "Un seul interlocuteur",
    text: "Vous gardez la main sur votre bien et vos décisions ; nous nous occupons du quotidien."
  }
];

export default function ProprietairesPage() {
  return (
    <>
      <PageHero
        title="Propriétaire ? Nous pouvons aussi gérer votre bien."
        description="Pour les propriétaires qui louent leur logement en courte durée à Pontoise, Cergy, Paris et en Île-de-France et qui veulent déléguer le quotidien."
        breadcrumbs={[{ label: "Accueil", href: "/" }, { label: "Propriétaires" }]}
        actions={
          <>
            <Link href="/contact#devis" className="btn-pill">
              En parler avec nous
            </Link>
            <a href={siteConfig.phoneHref} className="btn-pill-ghost text-ink">
              Appeler le {siteConfig.phone}
            </a>
          </>
        }
      />
      <section className="section pt-0">
        <ul className="grid gap-6 md:grid-cols-2">
          {points.map((point) => (
            <li key={point.title} className="rounded-3xl bg-mist p-8">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">{point.title}</h2>
              <p className="mt-3 text-slate-600">{point.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-10 max-w-3xl text-slate-600">
          Chaque bien est différent : nous commençons par un échange pour comprendre votre logement et vos
          attentes, puis nous vous proposons une formule sur mesure.
        </p>
      </section>
    </>
  );
}
