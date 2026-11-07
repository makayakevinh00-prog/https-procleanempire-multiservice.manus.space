"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, FilePlus, MapPin, Plus, Receipt, Repeat, Search, UserCog, UserPlus, CalendarPlus, LogOut, KeyRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

const CREATE = [
  { href: "/clients/new", label: "Nouveau client", icon: UserPlus },
  { href: "/devis/new", label: "Nouveau devis", icon: FilePlus },
  { href: "/factures/new", label: "Nouvelle facture", icon: Receipt },
  { href: "/contrats/new", label: "Nouveau contrat", icon: Repeat },
  { href: "/planning", label: "Planifier une mission", icon: CalendarPlus },
  { href: "/sites/new", label: "Nouveau site", icon: MapPin },
  { href: "/equipe#ajout", label: "Nouvel agent", icon: UserCog }
];

function useOutside(close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", on); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", on); document.removeEventListener("keydown", esc); };
  }, [close]);
  return ref;
}

/** Barre du haut (ordinateur) : recherche, création rapide, alertes, compte. */
export function Topbar({ actionsCount, email, signOut }: { actionsCount: number; email: string; signOut: () => Promise<void> }) {
  const [create, setCreate] = useState(false);
  const [user, setUser] = useState(false);
  const cRef = useOutside(() => setCreate(false));
  const uRef = useOutside(() => setUser(false));
  return (
    <div className="sticky top-0 z-20 hidden items-center gap-4 border-b border-border/70 bg-background/85 px-10 py-3 backdrop-blur md:flex">
      <form action="/recherche" className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-4 top-3 h-[17px] w-[17px] text-muted-foreground" />
        <input name="q" placeholder="Rechercher un client, un site, une facture, un téléphone…" aria-label="Recherche"
          className="h-10 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-[14px] shadow-[0_1px_2px_rgba(17,18,20,0.04)] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10" />
      </form>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative" ref={cRef}>
          <button onClick={() => setCreate((v) => !v)} aria-haspopup="menu" aria-expanded={create}
            className="flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-[14px] font-medium text-background transition hover:bg-foreground/90 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Créer <ChevronDown className="h-4 w-4 opacity-70" />
          </button>
          {create && (
            <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-[0_8px_30px_rgba(17,18,20,0.10)]">
              {CREATE.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} role="menuitem" onClick={() => setCreate(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] text-foreground hover:bg-secondary/70">
                  <Icon className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.6} />{label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link href="/actions" aria-label={`${actionsCount} action(s) à faire`} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-secondary-foreground transition hover:bg-secondary/70">
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.6} />
          {actionsCount > 0 && <span className="num absolute -right-1 -top-1 min-w-5 rounded-full bg-foreground px-1.5 text-center text-[11px] font-semibold leading-5 text-background">{actionsCount}</span>}
        </Link>

        <div className="relative" ref={uRef}>
          <button onClick={() => setUser((v) => !v)} aria-haspopup="menu" aria-expanded={user} className="flex items-center gap-1.5 rounded-xl border border-border bg-card py-1 pl-1 pr-2.5 transition hover:bg-secondary/70">
            <Avatar name="Pro Clean" size="md" /><ChevronDown className="h-4 w-4 text-slate-500" />
          </button>
          {user && (
            <div role="menu" className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-white p-1.5 shadow-[0_8px_30px_rgba(17,18,20,0.10)]">
              <div className="truncate border-b border-border px-3 pb-2 pt-1 text-sm text-muted-foreground">{email}</div>
              <Link href="/compte" role="menuitem" onClick={() => setUser(false)} className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] text-foreground hover:bg-secondary/70"><KeyRound className="h-[18px] w-[18px] text-muted-foreground" /> Mon compte</Link>
              <form action={signOut}><button role="menuitem" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] text-foreground hover:bg-secondary/70"><LogOut className="h-[17px] w-[17px] text-muted-foreground" /> Se déconnecter</button></form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
