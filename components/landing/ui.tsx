import { ReactNode } from "react";

/* Fonds clairs, repris de la page des nettoyeurs : bleu très pâle, bleu doux, blanc cassé froid. */
export const NAVY = "bg-[#f0f4fc]";
export const SOFT = "bg-[#dbe6fc]";
export const PAPER = "bg-[#f7f9fd]";
export const LABEL = "text-[12px] font-semibold uppercase tracking-[0.24em]";
export const H2 = "lp-serif text-[2.6rem] leading-[1.02] [text-wrap:balance] sm:text-6xl xl:text-[4.75rem]";
export const LINK =
  "inline-flex min-h-11 items-center gap-2 border-b border-current pb-0.5 text-base font-semibold transition-opacity duration-200 hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4";
export const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4";

/** Bouton principal : pastille pleine et flèche dans un rond qui avance au survol. */
export function Cta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className={`group inline-flex min-h-14 items-center gap-5 self-start rounded-full py-2 pl-7 pr-2 text-base font-semibold transition-colors duration-200 ${FOCUS} bg-[#1e3a6e] text-white shadow-[0_14px_30px_-14px_#1e3a6e] hover:bg-[#17305c] focus-visible:outline-[#1e3a6e]`}
    >
      {children}
      <span
        aria-hidden
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none bg-white text-[#1e3a6e]`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </a>
  );
}

