"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, ListChecks, Users, MapPin, ClipboardList, FileText, Receipt, UserCog, Package, Settings, Menu, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: any; color: string; children?: { href: string; label: string }[] };

/** 10 rubriques ; les sous-menus ne s'affichent que dans la rubrique ouverte. Chaque icône a sa couleur. */
const ITEMS: Item[] = [
  { href: "/", label: "Accueil", icon: Home, color: "text-sky-400" },
  { href: "/actions", label: "Actions à faire", icon: ListChecks, color: "text-amber-400" },
  { href: "/clients", label: "Clients", icon: Users, color: "text-violet-400", children: [{ href: "/demandes", label: "Demandes de devis" }] },
  { href: "/contrats", label: "Sites", icon: MapPin, color: "text-rose-400" },
  { href: "/planning", label: "Missions", icon: ClipboardList, color: "text-teal-400" },
  { href: "/devis", label: "Devis", icon: FileText, color: "text-emerald-400" },
  { href: "/factures", label: "Factures", icon: Receipt, color: "text-orange-400", children: [{ href: "/facturation-auto", label: "Facturation automatique" }, { href: "/paiements", label: "Paiements" }] },
  { href: "/recrutement", label: "Équipe", icon: UserCog, color: "text-indigo-300" },
  { href: "/catalogue", label: "Catalogue", icon: Package, color: "text-cyan-300" },
  { href: "/parametres", label: "Paramètres", icon: Settings, color: "text-slate-400", children: [{ href: "/journal", label: "Journal des automatisations" }, { href: "/compte", label: "Mon compte" }] }
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

function Links({ counts = {} }: { counts?: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {ITEMS.map(({ href, label, icon: Icon, color, children }) => {
        const self = isActive(path, href);
        const open = self || !!children?.some((c) => isActive(path, c.href));
        const n = counts[href] ?? 0;
        return (
          <div key={href}>
            <Link href={href}
              className={cn("relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                self ? "bg-white/10 text-white" : open ? "bg-white/5 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white")}>
              {self && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-teal-400" aria-hidden />}
              <Icon className={cn("h-[18px] w-[18px]", color)} /> <span className="flex-1">{label}</span>
              {n > 0 && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-900">{n}</span>}
            </Link>
            {children && open && (
              <div className="ml-[22px] mt-0.5 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                {children.map((c) => (
                  <Link key={c.href} href={c.href}
                    className={cn("rounded-md px-2 py-1.5 text-[13px]", isActive(path, c.href) ? "font-semibold text-teal-300" : "text-slate-400 hover:text-white")}>
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

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className={cn("flex items-center justify-center rounded-lg bg-white shadow", compact ? "h-9 w-9 p-1" : "h-14 w-14 p-1.5")}>
        <Image src="/logo.png" alt="ProClean Empire" width={187} height={344} className="h-full w-auto" priority />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-bold tracking-wide text-white">ProClean Empire</span>
        {!compact && <span className="block text-xs text-slate-400">Espace de gestion</span>}
      </span>
    </Link>
  );
}

export function Sidebar({ signOut, counts }: { signOut: () => Promise<void>; counts?: Record<string, number> }) {
  const logout = (
    <form action={signOut}>
      <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white">
        <LogOut className="h-4 w-4" /> Se déconnecter
      </button>
    </form>
  );
  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col overflow-y-auto bg-[#0f172a] p-4 md:flex">
        <div className="mb-6 px-1"><Brand /></div>
        <Links counts={counts} />
        <div className="mt-auto border-t border-white/10 pt-3">{logout}</div>
      </aside>
      {/* Mobile : menu déroulant sans JS */}
      <header className="sticky top-0 z-20 bg-[#0f172a] md:hidden">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5">
            <Brand compact />
            <Menu className="h-5 w-5 text-white" />
          </summary>
          <div className="max-h-[75vh] space-y-2 overflow-y-auto border-t border-white/10 p-3">
            <Links counts={counts} />
            {logout}
          </div>
        </details>
      </header>
    </>
  );
}
