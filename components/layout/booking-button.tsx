"use client";

import { motion, useReducedMotion } from "framer-motion";
import { siteConfig } from "@/lib/site";
import { getDictionary } from "@/lib/i18n";

const t = getDictionary("fr");

/**
 * Accès rapide toujours visible :
 * - mobile : barre basse Appeler · WhatsApp · Prendre RDV ;
 * - ordinateur : petit bouton flottant « Prendre RDV ».
 */
export function BookingButton() {
  const reduce = useReducedMotion();
  return (
    <>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4, ease: "easeOut" }}
        className="fixed bottom-6 right-6 z-40 hidden md:block"
      >
        <a
          href={siteConfig.bookingUrl}
          aria-label={t.cta.bookingLong}
          className="flex items-center gap-2 rounded-full bg-[#1d6fe0] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(29,111,224,0.7)] transition hover:-translate-y-0.5 hover:bg-[#1559bd]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18" strokeLinecap="round" />
          </svg>
          {t.cta.booking}
        </a>
      </motion.div>

      <nav
        aria-label={t.cta.quickContact}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-black/10 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <a href={siteConfig.phoneHref} className="flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold text-ink">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" strokeLinejoin="round" />
          </svg>
          {t.cta.call}
        </a>
        <a
          href={siteConfig.whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M4 20l1.3-3.9A8 8 0 1112 20a8 8 0 01-3.9-1L4 20z" strokeLinejoin="round" />
          </svg>
          WhatsApp
        </a>
        <a
          href={siteConfig.bookingUrl}
          className="m-1.5 flex flex-col items-center justify-center gap-0.5 rounded-xl bg-[#1d6fe0] text-xs font-semibold text-white"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18" strokeLinecap="round" />
          </svg>
          {t.cta.booking}
        </a>
      </nav>
      <div aria-hidden className="h-16 md:hidden" />
    </>
  );
}
