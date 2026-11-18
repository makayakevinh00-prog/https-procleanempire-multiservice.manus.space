import { ReactNode } from "react";

export const NAVY = "bg-[#0a1020]";
export const PAPER = "bg-[#f4f1ea]";
export const LABEL = "text-[12px] font-semibold uppercase tracking-[0.24em]";
export const H2 = "lp-serif text-[2.6rem] leading-[1.02] [text-wrap:balance] sm:text-6xl xl:text-[4.75rem]";
export const LINK =
  "inline-flex min-h-11 items-center gap-2 border-b border-current pb-0.5 text-base font-semibold transition-opacity duration-200 hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4";
export const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4";

/** Bouton principal : pastille pleine et flèche dans un rond qui avance au survol. */
export function Cta({ href, children, tone = "light" }: { href: string; children: ReactNode; tone?: "light" | "dark" }) {
  const light = tone === "light";
  return (
    <a
      href={href}
      className={`group inline-flex min-h-14 items-center gap-5 self-start rounded-full py-2 pl-7 pr-2 text-base font-semibold transition-colors duration-200 ${FOCUS} ${
        light
          ? "bg-white text-[#0a1020] hover:bg-[#dfe9fb] focus-visible:outline-white"
          : "bg-[#0a1020] text-white hover:bg-[#16224a] focus-visible:outline-[#0a1020]"
      }`}
    >
      {children}
      <span
        aria-hidden
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none ${
          light ? "bg-[#0a1020] text-white" : "bg-white text-[#0a1020]"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </a>
  );
}

