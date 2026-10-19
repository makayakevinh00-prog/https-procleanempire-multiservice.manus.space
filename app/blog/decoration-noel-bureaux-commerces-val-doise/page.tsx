import Link from "next/link";
import { buildMetadata, siteConfig } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";

const path = "/blog/decoration-noel-bureaux-commerces-val-doise";

export const metadata = buildMetadata({
  title: "Décorer ses bureaux et sa boutique pour Noël dans le Val-d'Oise",
  description:
    "Conseils pour la décoration de Noël de vos bureaux et commerces à Cergy, Pontoise et Roissy : vitrine, accueil, open space, calendrier de commande, pose et dépose par une conciergerie d'entreprise.",
  path
});

const sections = [
  {
    heading: "Pourquoi décorer ses locaux pour Noël ?",
    paragraphs: [
      "Pour un commerce, la vitrine de fin d'année est souvent la première chose que voit un passant dans la rue ou dans la galerie d'un centre commercial. Une vitrine soignée donne envie d'entrer, signale que la boutique est ouverte et active, et accompagne la période la plus importante de l'année pour les ventes.",
      "Pour des bureaux, la décoration joue un autre rôle : elle accueille les clients et les visiteurs dans une ambiance chaleureuse, et elle marque la fin d'année pour les équipes. Un hall d'accueil décoré, un sapin dans l'espace pause ou quelques guirlandes dans l'open space suffisent souvent à changer l'atmosphère."
    ]
  },
  {
    heading: "Vitrine, accueil, open space : où concentrer la décoration",
    paragraphs: [
      "La vitrine et l'entrée sont prioritaires : c'est là que la décoration est la plus visible. Mieux vaut un décor cohérent, aux couleurs de votre enseigne, qu'une accumulation d'objets.",
      "L'accueil vient ensuite : comptoir, banque d'accueil, salle d'attente. Dans les bureaux, l'espace pause et les salles de réunion où vous recevez des clients sont les meilleurs emplacements. Les postes de travail, eux, restent dégagés : la décoration ne doit jamais gêner le travail ni le nettoyage.",
      "Pensez enfin à la sécurité : guirlandes adaptées à un usage intérieur, câbles fixés hors des passages, issues de secours et extincteurs toujours dégagés."
    ]
  },
  {
    heading: "Quand commander sa décoration de Noël ?",
    paragraphs: [
      "La plupart des commerces veulent une vitrine prête dès le début du mois de décembre, parfois dès la fin novembre. Pour y arriver sans stress, il faut définir le projet et passer commande avant la mi-novembre : cela laisse le temps de choisir le style, de réunir le matériel et de caler une date de pose.",
      "Un calendrier simple : choix du décor en octobre ou début novembre, pose fin novembre ou tout début décembre, petit contrôle pendant les fêtes, puis dépose dans la première quinzaine de janvier."
    ]
  },
  {
    heading: "Installer sans perturber votre activité",
    paragraphs: [
      "Une boutique ou des bureaux ne ferment pas pour être décorés. La pose se fait donc en dehors de vos heures d'ouverture : tôt le matin, le soir après la fermeture, ou un jour de fermeture.",
      "Le même principe vaut pour la dépose en janvier. Après la dépose, un passage de nettoyage remet les lieux en état : aiguilles de sapin, paillettes et poussière accumulée derrière les décors."
    ]
  },
  {
    heading: "Confier la décoration à une conciergerie d'entreprise",
    paragraphs: [
      "Faire appel à une conciergerie d'entreprise permet de ne rien gérer soi-même : nous construisons le décor avec vous, l'installons, vérifions qu'il reste impeccable pendant les fêtes, puis le retirons et nettoyons les lieux.",
      "ProClean Empire intervient dans tout le Val-d'Oise, notamment à Cergy, Pontoise, Saint-Ouen-l'Aumône et dans le secteur de Roissy, ainsi qu'à Paris et en Île-de-France. Le même service existe pour Halloween, la Saint-Valentin ou Pâques, et peut s'ajouter à l'entretien régulier de vos locaux."
    ]
  }
];

export default function ArticlePage() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "Décorer ses bureaux et sa boutique pour Noël dans le Val-d'Oise",
    datePublished: "2026-10-19",
    inLanguage: "fr-FR",
    author: { "@type": "Organization", name: siteConfig.name },
    publisher: { "@type": "Organization", name: siteConfig.name },
    mainEntityOfPage: `${siteConfig.url}${path}`
  };

  return (
    <>
      <PageHero
        title="Décorer ses bureaux et sa boutique pour Noël dans le Val-d'Oise"
        description="Vitrine, accueil, open space : les bonnes pratiques pour une décoration de fin d'année réussie à Cergy, Pontoise ou Roissy, et le bon moment pour la commander."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: "Décoration de Noël" }
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
            <Link href="/conciergerie-entreprise" className="btn-primary">
              Découvrir la conciergerie d&apos;entreprise
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
