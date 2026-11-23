import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal";

/** Liens légaux à placer en bas de chaque page publique (réservation, inscription, présentation). */
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label="Informations légales"
      className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] text-[var(--a-mute)] ${className}`}
    >
      {LEGAL_LINKS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className="underline underline-offset-2 hover:text-[var(--a-pri)]"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
