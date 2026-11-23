import Image from "next/image";
import Link from "next/link";
import { navLinks } from "@/lib/data";
import { siteConfig } from "@/lib/site";
import { legalInfo } from "@/lib/content/legal";
import { socialLinks } from "@/lib/content/phase3";
import { localPages } from "@/lib/content/local-pages";

const realSocialLinks = socialLinks.filter((social) => !social.href.startsWith("["));

export function Footer() {
  const services = [
    { label: "Ménage Airbnb", href: "/menage-airbnb" },
    { label: "Nettoyage de bureaux", href: "/nettoyage-bureaux" },
    { label: "Nettoyage de commerces", href: "/nettoyage-commerces" },
    { label: "Conciergerie d'entreprise", href: "/conciergerie-entreprise" },
    { label: "Remise en état / fin de chantier", href: "/remise-en-etat" },
    { label: "Nettoyage après travaux", href: "/apres-chantier" },
    { label: "Nettoyage d'hôtels", href: "/nettoyage-hotels" },
    { label: "Nettoyage de restaurants", href: "/nettoyage-restaurants" },
    { label: "Nettoyage de vitres", href: "/nettoyage-vitrerie" },
    { label: "Nettoyage automobile", href: "/nettoyage-automobile" },
    { label: "Désinfection", href: "/services/desinfection" },
    { label: "Entretien régulier", href: "/services/entretien-regulier" },
    { label: "Parties communes", href: "/services/parties-communes" },
    { label: "Tous nos services", href: "/services" }
  ];

  // Pages utiles à Google comme aux visiteurs : liées depuis chaque page du site.
  const company = [
    { label: "À propos", href: "/a-propos" },
    { label: "Notre équipe", href: "/equipe" },
    { label: "Questions fréquentes", href: "/faq" },
    { label: "Réalisations", href: "/realisations" },
    { label: "Galerie photos", href: "/galerie" },
    { label: "Propriétaires", href: "/proprietaires" },
    { label: "Bureaux à Cergy-Pontoise : quelle fréquence ?", href: "/blog/nettoyage-bureaux-cergy-pontoise-frequence" },
    { label: "Ménage Airbnb entre deux voyageurs", href: "/blog/menage-airbnb-val-doise-entre-deux-voyageurs" },
    { label: "Décorer ses locaux pour Noël", href: "/blog/decoration-noel-bureaux-commerces-val-doise" }
  ];

  const actions = [
    { label: "Prendre RDV", href: siteConfig.bookingUrl },
    { label: "Demander un devis", href: "/contact#devis" },
    { label: "Laisser un avis Google", href: siteConfig.googleReviewsUrl }
  ];

  return (
    <footer className="bg-[#1e3a6e] text-slate-200">
      <div className="section grid gap-10 md:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-4">
          <Image
            src="/media/logo/proclean-empire-logo.png"
            alt="Logo ProClean Empire"
            width={187}
            height={344}
            className="h-24 w-auto"
          />
          <p className="text-sm leading-relaxed text-slate-300">
            Ménage Airbnb, nettoyage des bureaux et commerces, conciergerie
            d&apos;entreprise. Pontoise, Val-d&apos;Oise et Île-de-France.
          </p>
          <p className="text-sm text-slate-300">
            {siteConfig.email}
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Services
          </h3>
          <ul className="space-y-2 text-sm">
            {services.map((service) => (
              <li key={service.href}>
                <Link href={service.href} className="transition hover:text-white">
                  {service.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Passer à l&apos;action
          </h3>
          <ul className="space-y-2 text-sm">
            {actions.map((action) => (
              <li key={action.label}>
                <Link href={action.href} className="font-semibold text-[#8db8ff] transition hover:text-white">
                  {action.label} ›
                </Link>
              </li>
            ))}
          </ul>
          <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Zones
          </h3>
          <ul className="space-y-1 text-sm">
            {localPages.map((page) => (
              <li key={page.slug}>
                <Link href={`/${page.slug}`} className="text-slate-300 transition hover:text-white">
                  {page.label ?? page.city}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/zones-intervention" className="mt-1 inline-block text-sm text-slate-300 underline transition hover:text-white">
            Voir toutes les zones
          </Link>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Entreprise
          </h3>
          <ul className="space-y-2 text-sm">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Blog & réseaux
          </h3>
          <ul className="space-y-2 text-sm">
            {company.map((c) => (
              <li key={c.href}>
                <Link href={c.href} className="transition hover:text-white">
                  {c.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/blog" className="transition hover:text-white">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/videos" className="transition hover:text-white">
                Vidéos
              </Link>
            </li>
            {realSocialLinks.map((social) => (
              <li key={social.label}>
                <a href={social.href} target="_blank" rel="noreferrer" className="transition hover:text-white">
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Informations légales
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/mentions-legales" className="transition hover:text-white">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link
                href="/politique-confidentialite"
                className="transition hover:text-white"
              >
                Politique de confidentialité
              </Link>
            </li>
            <li>RCS {legalInfo.rcsCity}: {legalInfo.rcsNumber}</li>
            <li>Capital: {legalInfo.capital}</li>
            <li>SIREN: {legalInfo.siren}</li>
            <li>SIRET: {legalInfo.siret}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15 px-6 py-6 text-center text-xs text-slate-300 md:px-8">
        <p>© {new Date().getFullYear()} ProClean Empire. Tous droits réservés.</p>
        <p className="mt-2">
          Propriétaire ?{" "}
          <Link href="/proprietaires" className="underline transition hover:text-white">
            Nous pouvons aussi gérer votre bien
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}
