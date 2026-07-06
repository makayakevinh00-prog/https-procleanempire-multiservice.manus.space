import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";

export const metadata = buildMetadata({
  title: "Blog",
  description:
    "Conseils pratiques et retours terrain sur l'hygiène, l'entretien des locaux et la performance des espaces professionnels.",
  path: "/blog"
});

const posts = [
  {
    title: "Comment réduire les incidents d'hygiène en environnement bureau",
    excerpt:
      "Les points de contrôle à mettre en place pour préserver des locaux sains sans alourdir votre organisation."
  },
  {
    title: "Nettoyage multi-sites: quels indicateurs suivre pour garder la qualité",
    excerpt:
      "Un cadre simple pour piloter plusieurs adresses avec le même niveau d'exigence."
  },
  {
    title: "Préparer une remise en état efficace après travaux",
    excerpt:
      "Checklist opérationnelle pour reprendre l'activité rapidement dans de bonnes conditions."
  }
];

export default function BlogPage() {
  return (
    <>
      <PageHero
        title="Blog"
        description="Des contenus utiles pour mieux piloter la propreté de vos locaux professionnels."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Blog" }
        ]}
        actions={
          <Link href="/devis" className="btn-primary">
            Recevoir une estimation
          </Link>
        }
      />
      <section className="section pt-0">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article key={post.title} className="card p-6">
              <h2 className="text-xl font-semibold text-slate-900">{post.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>
              <Link
                href="/contact"
                className="mt-5 inline-flex text-sm font-semibold text-brand-700 hover:text-brand-900"
              >
                Échanger avec un expert →
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
