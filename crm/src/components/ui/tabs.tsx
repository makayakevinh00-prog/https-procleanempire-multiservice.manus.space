import Link from "next/link";
import { cn } from "@/lib/utils";

export type TabItem = { href: string; label: string; count?: number | null; active: boolean };

/** Onglets-lien : l'onglet actif est souligné, avec le nombre d'éléments quand il est connu. */
export function Tabs({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <nav aria-label="Sections" className={cn("-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 px-1", className)}>
      {items.map((t) => (
        <Link key={t.href + t.label} href={t.href} aria-current={t.active ? "page" : undefined}
          className={cn("relative flex shrink-0 items-center gap-2 px-4 py-3 text-[15px] font-semibold transition-colors",
            t.active ? "text-primary after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:rounded-full after:bg-primary" : "text-slate-500 hover:text-slate-900")}>
          {t.label}
          {t.count !== undefined && t.count !== null && <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", t.active ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600")}>{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
