import Link from "next/link";
import { cn } from "@/lib/utils";

export type TabItem = { href: string; label: string; count?: number | null; active: boolean };

/** Onglets-lien : l'onglet actif est souligné, avec le nombre d'éléments quand il est connu. */
export function Tabs({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <nav aria-label="Sections" className={cn("-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-border px-1", className)}>
      {items.map((t) => (
        <Link key={t.href + t.label} href={t.href} aria-current={t.active ? "page" : undefined}
          className={cn("relative flex shrink-0 items-center gap-2 px-4 py-3 text-[14px] font-medium transition-colors",
            t.active ? "text-foreground after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-foreground" : "text-muted-foreground hover:text-foreground")}>
          {t.label}
          {t.count !== undefined && t.count !== null && <span className={cn("num rounded-full px-2 py-0.5 text-xs font-medium", t.active ? "bg-secondary text-foreground" : "bg-secondary/70 text-muted-foreground")}>{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
