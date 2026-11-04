"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, Users, MapPin, ClipboardList, FileText, Receipt, UserCog, Package, Settings, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: any; children?: { href: string; label: string }[] };

/** 10 rubriques ; les sous-menus ne s'affichent que dans la rubrique ouverte. */
const ITEMS: Item[] = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/actions", label: "Actions à faire", icon: ListChecks },
  { href: "/clients", label: "Clients", icon: Users, children: [{ href: "/demandes", label: "Demandes de devis" }] },
  { href: "/contrats", label: "Sites", icon: MapPin },
  { href: "/planning", label: "Missions", icon: ClipboardList },
  { href: "/devis", label: "Devis", icon: FileText },
  { href: "/factures", label: "Factures", icon: Receipt, children: [{ href: "/facturation-auto", label: "Facturation automatique" }, { href: "/paiements", label: "Paiements" }] },
  { href: "/recrutement", label: "Équipe", icon: UserCog },
  { href: "/catalogue", label: "Catalogue", icon: Package },
  { href: "/parametres", label: "Paramètres", icon: Settings, children: [{ href: "/journal", label: "Journal des automatisations" }, { href: "/compte", label: "Mon compte" }] }
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

function Links({ onNavigate, counts = {} }: { onNavigate?: () => void; counts?: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {ITEMS.map(({ href, label, icon: Icon, children }) => {
        const open = children?.some((c) => isActive(path, c.href));
        const active = isActive(path, href) || !!open;
        const n = counts[href] ?? 0;
        return (
          <div key={href}>
            <Link href={href} onClick={onNavigate}
              className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(path, href) ? "bg-primary text-primary-foreground" : active ? "bg-muted text-foreground" : "text-secondary-foreground hover:bg-muted")}>
              <Icon className="h-4 w-4" /> <span className="flex-1">{label}</span>
              {n > 0 && <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", isActive(path, href) ? "bg-white/25 text-white" : "bg-amber-100 text-amber-900")}>{n}</span>}
            </Link>
            {children && active && (
              <div className="ml-7 mt-0.5 flex flex-col gap-0.5 border-l pl-2">
                {children.map((c) => (
                  <Link key={c.href} href={c.href} onClick={onNavigate}
                    className={cn("rounded-md px-2 py-1.5 text-[13px]", isActive(path, c.href) ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted")}>
                    {c.label}{counts[c.href] > 0 ? ` (${counts[c.href]})` : ""}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ signOut, counts }: { signOut: () => Promise<void>; counts?: Record<string, number> }) {
  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col overflow-y-auto border-r bg-card p-4 md:flex">
        <div className="mb-6 px-3 text-lg font-bold">ProClean <span className="text-primary">CRM</span></div>
        <Links counts={counts} />
        <form action={signOut} className="mt-auto pt-4">
          <button className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted">Se déconnecter</button>
        </form>
      </aside>
      {/* Mobile : menu déroulant sans JS */}
      <header className="sticky top-0 z-20 border-b bg-card md:hidden">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
            <span className="font-bold">ProClean <span className="text-primary">CRM</span></span>
            <Menu className="h-5 w-5" />
          </summary>
          <div className="max-h-[75vh] space-y-2 overflow-y-auto border-t p-3">
            <Links counts={counts} />
            <form action={signOut}><button className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted">Se déconnecter</button></form>
          </div>
        </details>
      </header>
    </>
  );
}
