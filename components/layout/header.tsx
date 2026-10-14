"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { navLinks } from "@/lib/data";
import { siteConfig } from "@/lib/site";

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sur l'accueil, l'en-tête est transparent au-dessus du hero plein écran.
  const overHero = pathname === "/" && !scrolled && !menuOpen;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        overHero
          ? "bg-transparent text-white"
          : "border-b border-black/5 bg-white/80 text-ink backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="ProClean Empire — accueil">
          <span className={`rounded-md ${overHero ? "bg-white/90 p-1" : ""}`}>
            <Image
              src="/media/logo/proclean-empire-logo.png"
              alt="Logo ProClean Empire"
              width={187}
              height={344}
              priority
              className="h-9 w-auto"
            />
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight">
            ProClean Empire
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-7 xl:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[13px] font-medium transition-opacity ${
                  active ? "opacity-100" : "opacity-75 hover:opacity-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={siteConfig.bookingUrl}
            className="hidden rounded-full bg-[#1d6fe0] px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#1559bd] sm:inline-flex"
          >
            Prendre RDV
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full xl:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
              {menuOpen ? (
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path strokeLinecap="round" d="M4 8h16M4 16h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="menu-mobile"
            aria-label="Navigation mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "100dvh" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden bg-white xl:hidden"
          >
            <ul className="flex flex-col gap-1 px-6 pt-4">
              {navLinks.map((link, index) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index + 0.1 }}
                >
                  <Link
                    href={link.href}
                    className="block py-3 font-display text-3xl font-semibold tracking-tight text-ink"
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
            <div className="px-6 pt-6">
              <Link href={siteConfig.bookingUrl} className="btn-pill w-full">
                Prendre RDV
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

/** Réserve la hauteur de l'en-tête fixe, sauf sur l'accueil (hero plein écran). */
export function HeaderSpacer() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <div aria-hidden className="h-16" />;
}
