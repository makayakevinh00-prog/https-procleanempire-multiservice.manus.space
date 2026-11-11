"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [["/compta", "Accueil"], ["/compta/mois", "Comptabilité"], ["/compta/factures", "Factures (PDF)"], ["/compta/justificatifs", "Justificatifs"]] as const;

/** Menu de l'espace comptable : seulement ses quatre pages. */
export function ComptaNav() {
  const path = usePathname();
  return (
    <nav aria-label="Espace comptable" className="flex gap-1 overflow-x-auto border-b border-border bg-card px-4 md:px-10">
      {TABS.map(([href, label]) => {
        const on = href === "/compta" ? path === "/compta" : path.startsWith(href);
        return <Link key={href} href={href} aria-current={on ? "page" : undefined} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] font-medium ${on ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{label}</Link>;
      })}
    </nav>
  );
}
