import Link from "next/link";
import { navLinks } from "@/lib/data";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-200">
      <div className="section grid gap-12 md:grid-cols-3">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">ProClean Empire</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Société de propreté B2B en Île-de-France. Nous aidons les entreprises à
            garder des locaux propres, sains et valorisants.
          </p>
          <p className="text-sm text-slate-300">
            {siteConfig.phone} · {siteConfig.email}
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Navigation
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
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
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
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 px-6 py-6 text-center text-xs text-slate-400 md:px-8">
        © {new Date().getFullYear()} ProClean Empire. Tous droits réservés.
      </div>
    </footer>
  );
}
