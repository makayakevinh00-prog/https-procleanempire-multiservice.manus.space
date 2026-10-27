"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Repeat, FileText, Receipt, UserPlus, Landmark, Settings, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/contrats", label: "Contrats", icon: Repeat },
  { href: "/devis", label: "Devis", icon: FileText },
  { href: "/factures", label: "Factures", icon: Receipt },
  { href: "/recrutement", label: "Recrutement", icon: UserPlus },
  { href: "/paiements", label: "Paiements", icon: Landmark },
  { href: "/parametres", label: "Paramètres", icon: Settings }
];

function Links({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} onClick={onNavigate}
            className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-muted")}>
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ signOut }: { signOut: () => Promise<void> }) {
  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r bg-card p-4 md:flex">
        <div className="mb-6 px-3 text-lg font-bold">ProClean <span className="text-primary">CRM</span></div>
        <Links />
        <form action={signOut} className="mt-auto">
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
          <div className="space-y-2 border-t p-3">
            <Links />
            <form action={signOut}><button className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted">Se déconnecter</button></form>
          </div>
        </details>
      </header>
    </>
  );
}
