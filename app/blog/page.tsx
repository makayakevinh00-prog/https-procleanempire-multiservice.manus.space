import Link from "next/link";
import { buildMetadata } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { blogPageContent } from "@/lib/content/phase3";

export const metadata = buildMetadata({
  title: "Blog",
  description:
    "Structure blog ProClean Empire pour publier des contenus SEO local et expertise nettoyage professionnel.",
  path: "/blog"
});

export default function BlogPage() {
  return (
    <>
      <PageHero
        title={blogPageContent.title}
        description={blogPageContent.description}
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
        <div className="card p-6 md:p-8">
          <h2 className="text-xl font-semibold text-[#14213d]">Catégories éditoriales prévues</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {blogPageContent.categories.map((category) => (
              <span
                key={category}
                className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {category}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm leading-relaxed text-slate-600">{blogPageContent.placeholder}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {blogPageContent.categories.slice(0, 6).map((category) => (
              <article key={category} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#c9a227]">
                  {category}
                </p>
                <h3 className="mt-2 text-base font-semibold text-[#14213d]">
                  [A REMPLIR PAR VOUS] Titre d&apos;article
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  [A REMPLIR PAR VOUS] Extrait d&apos;article optimisé SEO local.
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
