"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Home, ListChecks, Users, MapPin, ClipboardList, FileText, Receipt, UserCog, Package, Settings, LogOut, Bell, Search, X, LayoutGrid, Truck, ChevronsLeft, PieChart, Calculator, Repeat, CalendarDays, Radar, TrendingUp, BarChart3, KeyRound, Brush, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { pathAllowed, type Perms } from "@/lib/team";
import { PROFILE_LINKS, SECTIONS_NAV, sectionOfPath, type Section } from "@/lib/nav-sections";

/** Rubriques visibles : le patron voit tout ; une personne de l'équipe, seulement les onglets que ses droits ouvrent. */
function sectionsFor(perms: Perms | null | undefined): Section[] {
  if (!perms) return SECTIONS_NAV;
  const home: Section = { key: "espace", label: "Mon espace", icon: Home, tabs: [{ href: "/bienvenue", label: "Mon espace" }] };
  const kept = SECTIONS_NAV.map((s) => ({ ...s, tabs: s.tabs.filter((t) => t.href !== "/" && pathAllowed(perms, t.href)) })).filter((s) => s.tabs.length);
  return [home, ...kept];
}

function Links({ counts = {}, onNavigate, slim = false, perms = null }: { counts?: Record<string, number>; onNavigate?: () => void; slim?: boolean; perms?: Perms | null }) {
  const path = usePathname();
  const current = sectionOfPath(path)?.key ?? (path.startsWith("/bienvenue") ? "espace" : null);
  return (
    <nav className="flex flex-col gap-1">
      {sectionsFor(perms).map(({ key, label, icon: Icon, tabs }) => {
        const self = current === key;
        const n = tabs.reduce((t, x) => t + (counts[x.href] ?? 0), 0);
        return (
          <Link key={key} href={tabs[0].href} onClick={onNavigate} title={label} aria-current={self ? "page" : undefined}
            className={cn("pce-nav-link relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors", slim && "justify-center px-0",
              self ? "bg-secondary font-medium text-foreground" : "text-secondary-foreground/80 hover:bg-secondary/70 hover:text-foreground")}>
            {self && <span className="pce-nav-ind absolute inset-y-2 -left-4 w-[3px] rounded-r bg-primary" aria-hidden />}
            <Icon className="h-[18px] w-[18px] shrink-0 opacity-80" strokeWidth={1.6} />
            {!slim && <span className="flex-1">{label}</span>}
            {!slim && n > 0 && <span className="num rounded-full bg-secondary px-2 text-xs text-muted-foreground">{n}</span>}
            {slim && n > 0 && <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" aria-label={`${n} à traiter`} />}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ compact = false, slim = false }: { compact?: boolean; slim?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3" title="ProClean Empire">
      <span className={cn("flex shrink-0 items-center justify-center rounded-lg border border-border bg-white", compact ? "h-9 w-9 p-1" : "h-10 w-10 p-1")}>
        <Image src="/logo.png" alt="ProClean Empire" width={187} height={344} className="h-full w-auto" priority />
      </span>
      {!slim && (
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-tight text-foreground">ProClean Empire</span>
          {!compact && <span className="block text-xs text-muted-foreground">Espace de gestion</span>}
        </span>
      )}
    </Link>
  );
}

const TABBAR = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/missions", label: "Terrain", icon: ClipboardList },
  { href: "/factures", label: "Argent", icon: Receipt }
];

export function Sidebar({ signOut, counts, perms = null }: { signOut: () => Promise<void>; counts?: Record<string, number>; perms?: Perms | null }) {
  const [open, setOpen] = useState(false);
  const [slim, setSlim] = useState(false);
  const path = usePathname();
  useEffect(() => { try { if (localStorage.getItem("nav") === "slim") { setSlim(true); document.documentElement.dataset.nav = "slim"; } } catch {} }, []);
  const toggle = () => {
    const next = !slim; setSlim(next);
    if (next) document.documentElement.dataset.nav = "slim"; else delete document.documentElement.dataset.nav;
    try { localStorage.setItem("nav", next ? "slim" : "wide"); } catch {}
  };
  const logout = (slimMode: boolean) => (
    <form action={signOut}>
      <button title="Se déconnecter" className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] text-muted-foreground hover:bg-secondary/70 hover:text-foreground", slimMode && "justify-center px-0")}>
        <LogOut className="h-[18px] w-[18px]" strokeWidth={1.6} />{!slimMode && "Se déconnecter"}
      </button>
    </form>
  );
  return (
    <>
      {/* Ordinateur : menu fin, repliable */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--nav-w)] flex-col overflow-y-auto border-r border-border bg-white px-4 pb-5 pt-12 transition-[width] duration-200 md:flex">
        <div className={cn("mb-6", slim ? "flex justify-center" : "px-1")}><Brand slim={slim} /></div>
        <Links counts={counts} slim={slim} perms={perms} />
        <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
          {logout(slim)}
          <button onClick={toggle} aria-label={slim ? "Développer le menu" : "Réduire le menu"} title={slim ? "Développer le menu" : "Réduire le menu"}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-muted-foreground hover:bg-secondary/70 hover:text-foreground", slim && "justify-center px-0")}>
            <ChevronsLeft className={cn("h-[18px] w-[18px] transition-transform", slim && "rotate-180")} strokeWidth={1.6} />{!slim && "Réduire"}
          </button>
        </div>
      </aside>

      {/* Téléphone : barre du haut */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-white px-4 py-2.5 md:hidden">
        <Brand compact />
        <div className="flex items-center gap-1">
          <Link href="/recherche" aria-label="Rechercher" className="rounded-lg p-2.5 text-foreground active:bg-secondary"><Search className="h-5 w-5" strokeWidth={1.6} /></Link>
          <Link href="/actions" aria-label="Actions à faire" className="relative rounded-lg p-2.5 text-foreground active:bg-secondary">
            <Bell className="h-5 w-5" strokeWidth={1.6} />{(counts?.["/actions"] ?? 0) > 0 && <span className="num absolute right-0.5 top-0.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 text-primary-foreground">{counts?.["/actions"]}</span>}
          </Link>
        </div>
      </header>

      {/* Téléphone : barre du bas, comme une application */}
      <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {(perms ? [{ href: "/bienvenue", label: "Mon espace", icon: Home }, ...TABBAR.filter((t) => t.href !== "/" && pathAllowed(perms, t.href))] : TABBAR).map(({ href, label, icon: Icon }) => {
            const on = (sectionOfPath(path)?.key ?? "") === (sectionOfPath(href)?.key ?? "?") || (href === "/" && path === "/");
            return (
              <Link key={href} href={href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", on ? "text-foreground" : "text-muted-foreground")}>
                <Icon className="h-6 w-6" strokeWidth={on ? 2 : 1.5} />{label}
              </Link>
            );
          })}
          <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground" aria-label="Ouvrir le menu complet">
            <LayoutGrid className="h-6 w-6" strokeWidth={1.5} />Menu
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-foreground/40" aria-label="Fermer" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between"><Brand compact /><button onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted-foreground" aria-label="Fermer"><X className="h-6 w-6" /></button></div>
            <Links counts={counts} onNavigate={() => setOpen(false)} perms={perms} />
            {!perms && <div className="mt-3 flex flex-col gap-0.5 border-t border-border pt-3">{PROFILE_LINKS.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-[14px] text-muted-foreground hover:bg-secondary/70 hover:text-foreground">{l.label}</Link>)}</div>}
            <div className="mt-3 border-t border-border pt-3">{logout(false)}</div>
          </div>
        </div>
      )}
    </>
  );
}

