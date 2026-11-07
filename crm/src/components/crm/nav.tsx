"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Home, ListChecks, Users, MapPin, ClipboardList, FileText, Receipt, UserCog, Package, Settings, LogOut, Bell, Search, X, LayoutGrid, Truck, Bot, ChevronsLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: any; children?: { href: string; label: string }[] };
type Group = { title?: string; items: Item[] };

/** 10 rubriques, rangées par thème pour que le menu se lise d'un coup d'œil. */
const GROUPS: Group[] = [
  { items: [
    { href: "/", label: "Accueil", icon: Home },
    { href: "/actions", label: "Actions à faire", icon: ListChecks }
  ] },
  { title: "Direction", items: [
    { href: "/jarvis", label: "JARVIS", icon: Bot, children: [{ href: "/jarvis/alertes", label: "Alertes" }, { href: "/jarvis/openspace", label: "Open space" }] }
  ] },
  { title: "Commercial", items: [
    { href: "/clients", label: "Clients", icon: Users, children: [{ href: "/demandes", label: "Demandes du site" }] },
    { href: "/devis", label: "Devis", icon: FileText }
  ] },
  { title: "Opérations", items: [
    { href: "/sites", label: "Sites", icon: MapPin, children: [{ href: "/contrats", label: "Contrats" }] },
    { href: "/missions", label: "Missions", icon: ClipboardList, children: [{ href: "/sur-place", label: "Sur place (GPS)" }, { href: "/missions/problemes", label: "Anomalies & réclamations" }, { href: "/planning", label: "Planning du mois" }] },
    { href: "/equipe", label: "Équipe", icon: UserCog, children: [{ href: "/recrutement", label: "Recrutement" }] }
  ] },
  { title: "Finance", items: [
    { href: "/factures", label: "Factures", icon: Receipt, children: [{ href: "/facturation-auto", label: "Facturation automatique" }, { href: "/paiements", label: "Paiements" }] }
  ] },
  { title: "Gestion", items: [
    { href: "/fournisseurs", label: "Fournisseurs", icon: Truck },
    { href: "/catalogue", label: "Catalogue", icon: Package },
    { href: "/parametres", label: "Paramètres", icon: Settings, children: [{ href: "/journal", label: "Journal" }, { href: "/compte", label: "Mon compte" }] }
  ] }
];
const ALL = GROUPS.flatMap((g) => g.items);

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

function Links({ counts = {}, onNavigate, slim = false }: { counts?: Record<string, number>; onNavigate?: () => void; slim?: boolean }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-3">
      {GROUPS.map((g, gi) => (
        <div key={gi} className="flex flex-col gap-0.5">
          {g.title && !slim && <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{g.title}</div>}
          {g.title && slim && <div className="mx-3 my-1 border-t border-border" aria-hidden />}
          {g.items.map(({ href, label, icon: Icon, children }) => {
            const self = isActive(path, href);
            const open = self || !!children?.some((c) => isActive(path, c.href));
            const n = counts[href] ?? 0;
            return (
              <div key={href}>
                <Link href={href} onClick={onNavigate} title={label} aria-current={self ? "page" : undefined}
                  className={cn("relative flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors", slim && "justify-center px-0",
                    self ? "bg-secondary font-medium text-foreground" : "text-secondary-foreground/80 hover:bg-secondary/70 hover:text-foreground")}>
                  {self && <span className="absolute inset-y-2 -left-4 w-0.5 rounded bg-foreground" aria-hidden />}
                  <Icon className="h-[18px] w-[18px] shrink-0 opacity-80" strokeWidth={1.6} />
                  {!slim && <span className="flex-1">{label}</span>}
                  {!slim && n > 0 && <span className="num text-xs text-muted-foreground">{n}</span>}
                  {slim && n > 0 && <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-foreground" aria-label={`${n} à traiter`} />}
                </Link>
                {!slim && children && open && (
                  <div className="ml-[21px] mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
                    {children.map((c) => (
                      <Link key={c.href} href={c.href} onClick={onNavigate}
                        className={cn("rounded-md px-2 py-1.5 text-[13px]", isActive(path, c.href) ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}>
                        {c.label}{counts[c.href] > 0 ? ` (${counts[c.href]})` : ""}
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
  { href: "/missions", label: "Missions", icon: ClipboardList },
  { href: "/factures", label: "Factures", icon: Receipt }
];

export function Sidebar({ signOut, counts }: { signOut: () => Promise<void>; counts?: Record<string, number> }) {
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--nav-w)] flex-col overflow-y-auto border-r border-border bg-[#fbfaf8] px-4 py-5 transition-[width] duration-200 md:flex">
        <div className={cn("mb-6", slim ? "flex justify-center" : "px-1")}><Brand slim={slim} /></div>
        <Links counts={counts} slim={slim} />
        <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
          {logout(slim)}
          <button onClick={toggle} aria-label={slim ? "Développer le menu" : "Réduire le menu"} title={slim ? "Développer le menu" : "Réduire le menu"}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-muted-foreground hover:bg-secondary/70 hover:text-foreground", slim && "justify-center px-0")}>
            <ChevronsLeft className={cn("h-[18px] w-[18px] transition-transform", slim && "rotate-180")} strokeWidth={1.6} />{!slim && "Réduire"}
          </button>
        </div>
      </aside>

      {/* Téléphone : barre du haut */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-[#fbfaf8] px-4 py-2.5 md:hidden">
        <Brand compact />
        <div className="flex items-center gap-1">
          <Link href="/recherche" aria-label="Rechercher" className="rounded-lg p-2.5 text-foreground active:bg-secondary"><Search className="h-5 w-5" strokeWidth={1.6} /></Link>
          <Link href="/actions" aria-label="Actions à faire" className="relative rounded-lg p-2.5 text-foreground active:bg-secondary">
            <Bell className="h-5 w-5" strokeWidth={1.6} />{(counts?.["/actions"] ?? 0) > 0 && <span className="num absolute right-0.5 top-0.5 rounded-full bg-foreground px-1.5 text-[10px] font-semibold leading-4 text-background">{counts?.["/actions"]}</span>}
          </Link>
        </div>
      </header>

      {/* Téléphone : barre du bas, comme une application */}
      <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABBAR.map(({ href, label, icon: Icon }) => {
            const on = isActive(path, href);
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
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[#fbfaf8] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between"><Brand compact /><button onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted-foreground" aria-label="Fermer"><X className="h-6 w-6" /></button></div>
            <Links counts={counts} onNavigate={() => setOpen(false)} />
            <div className="mt-3 border-t border-border pt-3">{logout(false)}</div>
          </div>
        </div>
      )}
    </>
  );
}

export { ALL as NAV_ITEMS };
