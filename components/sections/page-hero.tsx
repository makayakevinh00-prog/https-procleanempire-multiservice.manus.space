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
      <section className="section pb-8">
        <Breadcrumbs items={breadcrumbs} />
        <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">{description}</p>
        {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
      </section>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
