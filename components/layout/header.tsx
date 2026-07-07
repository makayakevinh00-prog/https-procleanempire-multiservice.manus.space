"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { navLinks } from "@/lib/data";
import { siteConfig } from "@/lib/site";

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="border-b border-slate-100 bg-slate-50/90 px-6 py-2 text-center text-xs text-slate-600 md:px-8">
        <span className="font-semibold text-slate-700">{siteConfig.openingHours}</span>
        <span className="mx-2 text-slate-300">|</span>
        <a href={`tel:${siteConfig.phone}`} className="font-medium hover:text-[#14213d]">
          Appel direct: {siteConfig.phone}
        </a>
      </div>
      <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4 md:px-8">
        <Link href="/" className="flex items-center" aria-label={siteConfig.name} onClick={closeMobileMenu}>
          <Image src="/logo.svg" alt={siteConfig.name} width={220} height={60} className="h-10 w-auto" priority />
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
        <div className="flex items-center gap-3">
          <Link href="/devis" className="hidden text-sm md:inline-flex btn-primary">
            Obtenir un devis
          </Link>
          <button
            type="button"
            className="inline-flex items-center rounded-xl border border-slate-200 p-2 text-slate-700 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <span className="sr-only">{mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}</span>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {mobileOpen ? (
                <path d="M6 6L18 18M6 18L18 6" strokeLinecap="round" />
              ) : (
                <path d="M4 7H20M4 12H20M4 17H20" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>
      <div
        id="mobile-navigation"
        className={`border-t border-slate-100 bg-white px-6 transition-all md:px-8 lg:hidden ${
          mobileOpen ? "max-h-[520px] py-4 opacity-100" : "max-h-0 overflow-hidden py-0 opacity-0"
        }`}
      >
        <nav className="space-y-1">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? "bg-[#14213d]/10 text-[#14213d]" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/devis" onClick={closeMobileMenu} className="mt-4 inline-flex w-full btn-primary text-sm">
          Obtenir un devis
        </Link>
      </div>
    </header>
  );
}
