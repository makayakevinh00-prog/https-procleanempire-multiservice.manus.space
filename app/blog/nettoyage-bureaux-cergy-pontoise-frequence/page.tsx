import Link from "next/link";
import { buildMetadata, siteConfig } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";

const path = "/blog/nettoyage-bureaux-cergy-pontoise-frequence";
const title = "Nettoyage de bureaux à Cergy-Pontoise : quelle fréquence choisir ?";

export const metadata = buildMetadata({
  title,
  description:
    "Entretien de bureaux et commerces à Cergy, Pontoise et dans le Val-d'Oise (95) : quelle fréquence de passage choisir, ce que comprend un passage et quels horaires privilégier.",
  path
});

const sections = [
  {
    heading: "Pourquoi l'entretien régulier change tout",
    paragraphs: [
      "Des bureaux propres ne servent pas seulement à faire bonne impression aux clients qui passent la porte. Ils comptent aussi pour les équipes : un poste de travail dégagé, une cuisine nette et des sanitaires impeccables rendent les journées plus agréables et limitent la circulation des microbes, surtout en automne et en hiver.",
      "Un entretien planifié demande aussi moins d'efforts qu'un grand nettoyage de rattrapage : la saleté ne s'installe pas, les sols et les surfaces s'usent moins vite et personne dans l'équipe n'a à « s'en occuper » à la dernière minute."
    ]
  },
  {
    heading: "Quelle fréquence choisir pour vos locaux ?",
    paragraphs: [
      "Pour un petit bureau de quelques postes avec peu de passage, un passage par semaine suffit généralement : sols, poussière des bureaux, cuisine, sanitaires et poubelles.",
      "Dès que l'équipe grandit ou que des clients sont reçus chaque jour, deux à trois passages par semaine permettent de garder un accueil et des sanitaires toujours présentables. Les commerces, les cabinets qui reçoivent du public et les grands plateaux ont souvent besoin d'un passage quotidien.",
      "Le bon rythme dépend donc du nombre de personnes, de l'accueil du public et des zones sensibles comme la cuisine ou les sanitaires. Le plus simple est de commencer par une fréquence raisonnable et de l'ajuster après quelques semaines."
    ]
  },
  {
    heading: "Ce que comprend un passage d'entretien",
    paragraphs: [
      "Un passage classique suit une check-list fixe : vidage des corbeilles, dépoussiérage des bureaux et des surfaces dégagées, nettoyage des points de contact (poignées, interrupteurs, rampes), cuisine ou coin café, sanitaires, puis aspiration et lavage des sols.",
      "Certaines tâches reviennent moins souvent et se planifient à part : vitres et vitrines, dépoussiérage en hauteur, nettoyage des chaises en tissu ou remise en état après des travaux ou un déménagement."
    ]
  },
  {
    heading: "Tôt le matin, le soir ou pendant la journée ?",
    paragraphs: [
      "La plupart des entreprises préfèrent un passage en dehors des heures de bureau, tôt le matin ou en fin de journée, pour ne pas déranger les équipes. Pour les commerces, le passage se fait avant l'ouverture ou après la fermeture.",
      "Un créneau fixe, le même jour et à la même heure chaque semaine, permet à tout le monde de s'organiser et à l'intervenant de bien connaître les locaux, leurs accès et leurs points d'attention."
    ]
  },
  {
    heading: "Un prestataire local à Cergy, Pontoise et dans le Val-d'Oise",
    paragraphs: [
      "ProClean Empire assure l'entretien des bureaux et des commerces à Cergy, Pontoise, Osny, Saint-Ouen-l'Aumône, Éragny, Herblay et dans les zones d'activité voisines, avec des passages planifiés selon vos horaires.",
      "Pour démarrer, il suffit de nous décrire vos locaux (surface, nombre de postes, sanitaires, accueil du public) et le rythme souhaité dans une demande de devis gratuite : nous vous proposons une formule adaptée."
    ]
  }
];

export default function ArticlePage() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    datePublished: "2026-10-19",
    inLanguage: "fr-FR",
    author: { "@type": "Organization", name: siteConfig.name },
    publisher: { "@type": "Organization", name: siteConfig.name },
    mainEntityOfPage: `${siteConfig.url}${path}`
  };

  return (
    <>
      <PageHero
        title={title}
        description="Un passage par semaine ou chaque jour ? Les repères pour bien entretenir vos bureaux et commerces à Cergy, Pontoise et dans le Val-d'Oise."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: "Nettoyage de bureaux Cergy-Pontoise" }
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
            <Link href="/nettoyage-bureaux-pontoise" className="btn-primary">
              Nettoyage de bureaux à Pontoise
            </Link>
            <Link href="/entreprise-de-nettoyage-cergy" className="btn-pill-ghost text-ink">
              Entreprise de nettoyage à Cergy
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
