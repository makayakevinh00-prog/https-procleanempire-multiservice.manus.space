import Link from "next/link";
import { buildMetadata, siteConfig } from "@/lib/site";
import { PageHero } from "@/components/sections/page-hero";
import { SocialNetworksSection } from "@/components/phase3/social-networks-section";

export const metadata = buildMetadata({
  title: "Contact",
  description:
    "Contactez ProClean Empire pour organiser une visite, obtenir un devis ou être rappelé rapidement.",
  path: "/contact"
});

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Contact"
        description="Un besoin urgent, un nouveau site à reprendre ou une demande d'estimation? Notre équipe vous répond rapidement."
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Contact" }
        ]}
      />
      <section className="section pt-0">
        <div className="grid gap-6 md:grid-cols-2">
          <article className="card p-6 md:p-8">
            <h2 className="text-xl font-semibold text-slate-900">Coordonnées</h2>
            <p className="mt-3 text-sm text-slate-600">
              Téléphone: <a href={siteConfig.phoneHref}>{siteConfig.phone}</a>
            </p>
            <p className="mt-1 text-sm text-slate-600">Email: {siteConfig.email}</p>
            <p className="mt-1 text-sm text-slate-600">Zone: {siteConfig.city}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/devis" className="btn-primary">
                Demander un devis
              </Link>
              <a href={siteConfig.phoneHref} className="btn-secondary">
                Être rappelé
              </a>
            </div>
          </article>
          <article className="card p-6 md:p-8">
            <h2 className="text-xl font-semibold text-slate-900">Horaires de réponse</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Ouvert 7j/7, de 8h à 18h.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Demandes urgentes: intervention possible sous 24 à 48h en Île-de-France selon
              disponibilité.
            </p>
          </article>
        </div>
      </section>
      <SocialNetworksSection />
    </>
  );
}
