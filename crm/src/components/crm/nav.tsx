"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  ListChecks,
  Users,
  MapPin,
  ClipboardList,
  FileText,
  Receipt,
  UserCog,
  Package,
  Settings,
  LogOut,
  Bell,
  Search,
  X,
  LayoutGrid,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: any;
  color: string;
  children?: { href: string; label: string }[];
};
type Group = { title?: string; items: Item[] };

/** 10 rubriques, rangées par thème pour que le menu se lise d'un coup d'œil. */
const GROUPS: Group[] = [
  {
    items: [
      { href: "/", label: "Accueil", icon: Home, color: "text-sky-400" },
      {
        href: "/actions",
        label: "Actions à faire",
        icon: ListChecks,
        color: "text-amber-400",
      },
    ],
  },
  {
    title: "Commercial",
    items: [
      {
        href: "/clients",
        label: "Clients",
        icon: Users,
        color: "text-violet-400",
        children: [{ href: "/demandes", label: "Demandes du site" }],
      },
      {
        href: "/devis",
        label: "Devis",
        icon: FileText,
        color: "text-emerald-400",
      },
    ],
  },
  {
    title: "Opérations",
    items: [
      {
        href: "/sites",
        label: "Sites",
        icon: MapPin,
        color: "text-rose-400",
        children: [{ href: "/contrats", label: "Contrats" }],
      },
      {
        href: "/missions",
        label: "Missions",
        icon: ClipboardList,
        color: "text-teal-400",
        children: [
          { href: "/sur-place", label: "Sur place (GPS)" },
          { href: "/missions/problemes", label: "Anomalies & réclamations" },
          { href: "/planning", label: "Planning du mois" },
        ],
      },
      {
        href: "/equipe",
        label: "Équipe",
        icon: UserCog,
        color: "text-indigo-300",
        children: [{ href: "/recrutement", label: "Recrutement" }],
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        href: "/factures",
        label: "Factures",
        icon: Receipt,
        color: "text-orange-400",
        children: [
          { href: "/facturation-auto", label: "Facturation automatique" },
          { href: "/paiements", label: "Paiements" },
        ],
      },
    ],
  },
  {
    title: "Gestion",
    items: [
      {
        href: "/fournisseurs",
        label: "Fournisseurs",
        icon: Truck,
        color: "text-orange-300",
      },
      {
        href: "/catalogue",
        label: "Catalogue",
        icon: Package,
        color: "text-cyan-300",
      },
      {
        href: "/parametres",
        label: "Paramètres",
        icon: Settings,
        color: "text-slate-400",
        children: [
          { href: "/journal", label: "Journal" },
          { href: "/compte", label: "Mon compte" },
        ],
      },
    ],
  },
];
const ALL = GROUPS.flatMap((g) => g.items);

function isActive(path: string, href: string) {
  return href === "/"
    ? path === "/"
    : path === href || path.startsWith(href + "/");
}

const GROUPS_COMPTABLE: Group[] = [
  {
    title: "Finance",
    items: [
      {
        href: "/factures",
        label: "Factures",
        icon: Receipt,
        color: "text-orange-400",
      },
    ],
  },
];

function Links({
  counts = {},
  onNavigate,
  isComptable = false,
}: {
  counts?: Record<string, number>;
  onNavigate?: () => void;
  isComptable?: boolean;
}) {
  const path = usePathname();
  const groups = isComptable ? GROUPS_COMPTABLE : GROUPS;
  return (
    <nav className="flex flex-col gap-4">
      {groups.map((g, gi) => (
        <div key={gi} className="flex flex-col gap-0.5">
          {g.title && (
            <div className="px-3 pb-1 pt-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400/80">
              {g.title}
            </div>
          )}
          {g.items.map(({ href, label, icon: Icon, color, children }) => {
            const self = isActive(path, href);
            const open =
              self || !!children?.some((c) => isActive(path, c.href));
            const n = counts[href] ?? 0;
            return (
              <div key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors",
                    self
                      ? "bg-white/12 text-white"
                      : open
                        ? "bg-white/5 text-white"
                        : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {self && (
                    <span
                      className="absolute inset-y-2 left-0 w-1 rounded-r bg-teal-400"
                      aria-hidden
                    />
                  )}
                  <Icon className={cn("h-5 w-5", color)} />{" "}
                  <span className="flex-1">{label}</span>
                  {n > 0 && (
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-900">
                      {n}
                    </span>
                  )}
                </Link>
                {children && open && (
                  <div className="ml-[26px] mt-0.5 flex flex-col gap-0.5 border-l border-white/10 pl-3">
                    {children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        onClick={onNavigate}
                        className={cn(
                          "rounded-lg px-2 py-1.5 text-sm",
                          isActive(path, c.href)
                            ? "font-semibold text-teal-300"
                            : "text-slate-400 hover:text-white",
                        )}
                      >
                        {c.label}
                        {counts[c.href] > 0 ? ` (${counts[c.href]})` : ""}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span
        className={cn(
          "flex items-center justify-center rounded-xl bg-white shadow",
          compact ? "h-9 w-9 p-1" : "h-14 w-14 p-1.5",
        )}
      >
        <Image
          src="/logo.png"
          alt="ProClean Empire"
          width={187}
          height={344}
          className="h-full w-auto"
          priority
        />
      </span>
      <span className="leading-tight">
        <span className="block text-base font-bold tracking-wide text-white">
          ProClean Empire
        </span>
        {!compact && (
          <span className="block text-xs text-slate-400">
            Espace de gestion
          </span>
        )}
      </span>
    </Link>
  );
}

const TABBAR = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/missions", label: "Missions", icon: ClipboardList },
  { href: "/factures", label: "Factures", icon: Receipt },
];

export function Sidebar({
  signOut,
  counts,
  isComptable = false,
}: {
  signOut: () => Promise<void>;
  counts?: Record<string, number>;
  isComptable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const logout = (
    <form action={signOut}>
      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] text-slate-400 hover:bg-white/5 hover:text-white">
        <LogOut className="h-5 w-5" /> Se déconnecter
      </button>
    </form>
  );
  return (
    <>
      {/* Ordinateur */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto bg-gradient-to-b from-[#0d1a28] via-[#0b1e22] to-[#091c1e] p-4 md:flex">
        <div className="mb-6 px-1 pt-1">
          <Brand />
        </div>
        <Links counts={counts} isComptable={isComptable} />
        {isComptable && (
          <div className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-[11px] text-teal-400/70">
            Accès comptable — lecture seule
          </div>
        )}
        <div className="mt-auto border-t border-white/10 pt-3">{logout}</div>
      </aside>

      {/* Téléphone : barre du haut */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-gradient-to-r from-[#0d1a28] to-[#091c1e] px-4 py-2.5 md:hidden">
        <Brand compact />
        <div className="flex items-center gap-1">
          <Link
            href="/recherche"
            aria-label="Rechercher"
            className="rounded-lg p-2.5 text-slate-200 active:bg-white/10"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href="/actions"
            aria-label="Actions à faire"
            className="relative rounded-lg p-2.5 text-slate-200 active:bg-white/10"
          >
            <Bell className="h-5 w-5" />
            {(counts?.["/actions"] ?? 0) > 0 && (
              <span className="absolute right-1 top-1 rounded-full bg-amber-400 px-1.5 text-[10px] font-bold leading-4 text-slate-900">
                {counts?.["/actions"]}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Téléphone : barre du bas, comme une application */}
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABBAR.map(({ href, label, icon: Icon }) => {
            const on = isActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold",
                  on ? "text-primary" : "text-slate-500",
                )}
              >
                <Icon className="h-6 w-6" />
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-slate-500"
            aria-label="Ouvrir le menu complet"
          >
            <LayoutGrid className="h-6 w-6" />
            Menu
          </button>
        </div>
      </nav>

      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <button
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-gradient-to-b from-[#0d1a28] to-[#091c1e] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <Brand compact />
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-300"
                aria-label="Fermer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <Links
              counts={counts}
              onNavigate={() => setOpen(false)}
              isComptable={isComptable}
            />
            <div className="mt-3 border-t border-white/10 pt-3">{logout}</div>
          </div>
        </div>
      )}
    </>
  );
}

export { ALL as NAV_ITEMS };
