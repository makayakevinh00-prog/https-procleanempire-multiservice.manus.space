import Link from "next/link";
import { buildMetadata, siteConfig } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";

const path = "/blog/menage-airbnb-val-doise-entre-deux-voyageurs";

export const metadata = buildMetadata({
  title: "Ménage Airbnb dans le Val-d'Oise : préparer son logement entre deux voyageurs",
  description:
    "Ménage de fin de séjour Airbnb à Pontoise, Cergy et dans le Val-d'Oise (95) : les étapes d'un check-out réussi, le linge, les consommables et comment organiser les rotations entre deux voyageurs.",
  path
});

const sections = [
  {
    heading: "Pourquoi le ménage fait la note de votre annonce",
    paragraphs: [
      "Sur Airbnb comme sur les autres plateformes de location courte durée, la propreté fait partie des critères notés par chaque voyageur. Un cheveu dans la douche ou une poussière sur une étagère suffisent à faire perdre une étoile, et quelques notes moyennes font reculer l'annonce dans les résultats de recherche.",
      "À l'inverse, un logement impeccable à chaque arrivée rassure, génère des commentaires positifs et permet de garder un bon taux de réservation tout au long de l'année, y compris dans le Val-d'Oise où la concurrence entre logements se joue souvent sur les détails."
    ]
  },
  {
    heading: "Les étapes d'un ménage de fin de séjour",
    paragraphs: [
      "Un ménage de check-out suit toujours le même ordre : aérer, retirer le linge sale, vider les poubelles, puis nettoyer du haut vers le bas pour que la poussière ne retombe pas sur ce qui est déjà propre.",
      "La cuisine et la salle de bain demandent le plus d'attention : plan de travail, plaques, intérieur du micro-ondes et du réfrigérateur, évier, robinetterie, douche, WC et miroirs. Viennent ensuite les sols, aspirés puis lavés, et les surfaces souvent oubliées : interrupteurs, poignées, télécommandes.",
      "La dernière étape est la mise en place : lits faits avec du linge propre, serviettes pliées, vaisselle rangée, et un dernier tour du logement avec les yeux d'un voyageur qui arrive."
    ]
  },
  {
    heading: "Linge et consommables : ne rien laisser au hasard",
    paragraphs: [
      "Le linge est souvent ce qui complique le plus les rotations rapides. Prévoir au moins deux jeux complets par lit et par voyageur permet d'en avoir toujours un propre pendant que l'autre est en lavage.",
      "Les consommables comptent aussi dans l'expérience : papier toilette, savon, liquide vaisselle, éponges, sacs poubelle, et éventuellement café ou thé. Un petit stock sur place, vérifié à chaque passage, évite la mauvaise surprise d'un voyageur qui arrive sans le nécessaire."
    ]
  },
  {
    heading: "Organiser les rotations quand les départs s'enchaînent",
    paragraphs: [
      "Entre l'heure de départ d'un voyageur et l'arrivée du suivant, il reste parfois seulement quelques heures. Le planning doit donc suivre de près le calendrier de réservation, avec des créneaux réservés en priorité pour les jours de départ et d'arrivée.",
      "Pour les hôtes et les conciergeries qui gèrent plusieurs logements, le plus simple est de confier ces rotations à un prestataire qui connaît chaque logement : ses accès, l'emplacement du linge et des produits, et ses points d'attention."
    ]
  },
  {
    heading: "Un prestataire local à Pontoise, Cergy et dans tout le Val-d'Oise",
    paragraphs: [
      "ProClean Empire réalise le ménage de fin de séjour pour les hôtes et les conciergeries dans tout le Val-d'Oise, notamment à Pontoise, Cergy, Osny, Saint-Ouen-l'Aumône et Goussainville, ainsi qu'à Saint-Ouen et dans le nord de Paris.",
      "Nous intervenons entre deux séjours, pour un logement ou pour plusieurs, avec une gestion du linge sur demande. Le plus simple pour démarrer : nous décrire vos logements et votre rythme de réservations dans une demande de devis."
    ]
  }
];

export default function ArticlePage() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "Ménage Airbnb dans le Val-d'Oise : préparer son logement entre deux voyageurs",
    datePublished: "2026-10-19",
    inLanguage: "fr-FR",
    author: { "@type": "Organization", name: siteConfig.name },
    publisher: { "@type": "Organization", name: siteConfig.name },
    mainEntityOfPage: `${siteConfig.url}${path}`
  };

  return (
    <>
      <PageHero
        title="Ménage Airbnb dans le Val-d'Oise : préparer son logement entre deux voyageurs"
        description="Check-out, linge, consommables, rotations rapides : les bonnes pratiques pour un logement impeccable à chaque arrivée à Pontoise, Cergy et dans le Val-d'Oise."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: "Ménage Airbnb Val-d'Oise" }
        ]}
      />
      <article className="section pt-0">
        <div className="max-w-3xl">
          {sections.map((section) => (
            <section key={section.heading} className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="mt-4 text-lg leading-relaxed text-slate-700">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/menage-airbnb" className="btn-primary">
              Découvrir le ménage Airbnb
            </Link>
            <Link href="/devis" className="btn-pill-ghost text-ink">
              Demander un devis
            </Link>
          </div>
        </div>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
    </>
  );
}
