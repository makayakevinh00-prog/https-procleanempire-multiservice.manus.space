import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildMetadata, siteConfig } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { CtaBand } from "@/components/sections/cta-band";
import { articles, getArticle } from "@/lib/content/articles";

export const dynamicParams = false;

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return buildMetadata({
    title: article.title,
    description: article.metaDescription,
    path: `/blog/${article.slug}`
  });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    notFound();
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    datePublished: article.isoDate,
    author: { "@type": "Organization", name: siteConfig.name },
    publisher: { "@id": `${siteConfig.url}/#entreprise` },
    mainEntityOfPage: `${siteConfig.url}/blog/${article.slug}`
  };

  return (
    <>
      <PageHero
        title={article.title}
        description={article.excerpt}
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: article.title }
        ]}
      />
      <section className="section pt-0">
        <article className="card mx-auto max-w-3xl p-6 md:p-10">
          <p className="text-xs text-slate-500">
            Publié le {article.date} · {article.category}
          </p>
          {article.sections.map((section) => (
            <div key={section.title} className="mt-8">
              <h2 className="text-2xl font-semibold text-[#14213d]">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-4 leading-relaxed text-slate-700">
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/devis" className="btn-primary">
              Demander un devis gratuit
            </Link>
            <Link href="/entreprise-nettoyage-pontoise" className="btn-secondary">
              Nettoyage à Pontoise
            </Link>
          </div>
        </article>
      </section>
      <CtaBand />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
    </>
  );
}
