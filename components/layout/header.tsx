"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinks } from "@/lib/data";
import { siteConfig } from "@/lib/site";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/media/logo/proclean-empire-icon.png"
            alt="ProClean Empire"
            className="h-10 w-auto"
          />
          <span className="text-lg font-bold text-slate-900">ProClean Empire</span>
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition ${
                  active ? "text-[#14213d]" : "text-slate-600 hover:text-[#14213d]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/devis" className="btn-primary text-sm">
          Obtenir un devis
        </Link>
      </div>
      <div className="border-t border-slate-100 bg-slate-50 px-6 py-2 text-center text-xs text-slate-600 md:px-8">
        {siteConfig.responseDelay} · Réponse rapide au {siteConfig.phone}
      </div>
    </header>
  );
}
