import "@/components/landing/landing.css";
import { ReactNode } from "react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { siteConfig } from "@/lib/site";

type PageHeroProps = {
  title: string;
  description: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
};

export function PageHero({ title, description, breadcrumbs, actions }: PageHeroProps) {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${siteConfig.url}${item.href}` } : {})
    }))
  };

  return (
    <>
      {/* Même en-tête que l'accueil : bande bleu très pâle, titre très gras, un mot d'accroche court. */}
      <section className="bg-[#f0f4fc]">
        <div className="mx-auto max-w-content px-6 pb-14 pt-10 md:px-8 md:pb-20 md:pt-14">
          <Breadcrumbs items={breadcrumbs} />
          <h1 className="lp-serif mt-6 max-w-4xl text-[2.5rem] leading-[1.03] text-[#101828] [text-wrap:balance] sm:text-6xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#475467]">{description}</p>
          {actions ? <div className="mt-9 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </section>
      <div aria-hidden className="h-12 md:h-16" />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
