import Link from "next/link";
import { navLinks } from "@/lib/data";
import { siteConfig } from "@/lib/site";
import { legalInfo } from "@/lib/content/legal";
import { socialLinks } from "@/lib/content/phase3";

const realSocialLinks = socialLinks.filter((social) => !social.href.startsWith("["));

export function Footer() {
  const services = [
    { label: "Gestion de flottes automobiles", href: "/nettoyage-automobile" },
    { label: "Entretien bureaux", href: "/nettoyage-bureaux" },
    { label: "Entretien restaurants", href: "/nettoyage-restaurants" },
    { label: "Entretien hotels", href: "/nettoyage-hotels" },
    { label: "Entretien commerces", href: "/nettoyage-commerces" },
    { label: "Entretien vitrerie", href: "/nettoyage-vitrerie" },
    { label: "Apres chantier", href: "/apres-chantier" },
    { label: "Remise en etat", href: "/remise-en-etat" }
  ];

  const sectors = [
    "Bureaux",
    "Restaurants",
    "Hotels",
    "Commerces",
    "Cabinets",
    "Coworking"
  ];

  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-200">
      <div className="section grid gap-10 md:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-4">
          <img
            src="/media/logo/proclean-empire-logo.png"
            alt="ProClean Empire"
            className="h-24 w-auto"
          />
          <p className="text-sm leading-relaxed text-slate-300">
            Votre partenaire en propreté, entretien et multiservices pour les
            entreprises, commerces, copropriétés et établissements
            professionnels.
          </p>
          <p className="text-sm text-slate-300">
            {siteConfig.phone} · {siteConfig.email}
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
            Secteurs
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {sectors.map((sector) => (
              <li key={sector}>{sector}</li>
            ))}
          </ul>
          <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-300">
            Zones
          </h3>
          <p className="text-sm text-slate-300">Pontoise · Val d&apos;Oise · Île-de-France</p>
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
            Blog & reseaux
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/blog" className="transition hover:text-white">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/videos" className="transition hover:text-white">
                Videos
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
      <div className="border-t border-slate-800 px-6 py-6 text-center text-xs text-slate-400 md:px-8">
        © {new Date().getFullYear()} ProClean Empire. Tous droits réservés.
      </div>
    </footer>
  );
}
