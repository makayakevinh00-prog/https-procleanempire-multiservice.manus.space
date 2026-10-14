"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { siteConfig } from "@/lib/site";

/** Bouton « Prendre RDV » toujours visible (bas d'écran). */
export function BookingButton() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.4, ease: "easeOut" }}
      className="fixed bottom-5 right-5 z-40 md:bottom-8 md:right-8"
    >
      <Link
        href={siteConfig.bookingUrl}
        className="flex items-center gap-2 rounded-full bg-[#1d6fe0] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(29,111,224,0.7)] transition hover:-translate-y-0.5 hover:bg-[#1559bd]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" strokeLinecap="round" />
        </svg>
        Prendre RDV
      </Link>
    </motion.div>
  );
}
