"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, FilePlus, MapPin, Plus, Receipt, Repeat, Search, UserCog, UserPlus, CalendarPlus, LogOut, KeyRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

const CREATE = [
  { href: "/clients/new", label: "Nouveau client", icon: UserPlus, tone: "bg-violet-100 text-violet-700" },
  { href: "/devis/new", label: "Nouveau devis", icon: FilePlus, tone: "bg-emerald-100 text-emerald-700" },
  { href: "/factures/new", label: "Nouvelle facture", icon: Receipt, tone: "bg-orange-100 text-orange-700" },
  { href: "/contrats/new", label: "Nouveau contrat", icon: Repeat, tone: "bg-sky-100 text-sky-700" },
  { href: "/planning", label: "Planifier une mission", icon: CalendarPlus, tone: "bg-teal-100 text-teal-700" },
  { href: "/sites/new", label: "Nouveau site", icon: MapPin, tone: "bg-rose-100 text-rose-700" },
  { href: "/equipe#ajout", label: "Nouvel agent", icon: UserCog, tone: "bg-indigo-100 text-indigo-700" }
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
    <div className="sticky top-0 z-20 hidden items-center gap-4 border-b border-slate-200/70 bg-background/85 px-10 py-3.5 backdrop-blur md:flex">
      <form action="/recherche" className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-4 top-3.5 h-[18px] w-[18px] text-slate-400" />
        <input name="q" placeholder="Rechercher un client, un site, une facture, un téléphone…" aria-label="Recherche"
          className="h-11 w-full rounded-full border border-slate-200 bg-card pl-11 pr-4 text-[15px] shadow-sm placeholder:text-slate-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15" />
      </form>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative" ref={cRef}>
          <button onClick={() => setCreate((v) => !v)} aria-haspopup="menu" aria-expanded={create}
            className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-semibold text-white shadow-md transition hover:bg-primary/90 active:scale-[0.98]">
            <Plus className="h-5 w-5" /> Créer <ChevronDown className="h-4 w-4 opacity-80" />
          </button>
          {create && (
            <div role="menu" className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              {CREATE.map(({ href, label, icon: Icon, tone }) => (
                <Link key={href} href={href} role="menuitem" onClick={() => setCreate(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-slate-800 hover:bg-slate-50">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}><Icon className="h-[18px] w-[18px]" /></span>{label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link href="/actions" aria-label={`${actionsCount} action(s) à faire`} className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-card text-slate-600 shadow-sm transition hover:bg-slate-50">
          <Bell className="h-5 w-5" />
          {actionsCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-amber-400 px-1.5 text-center text-[11px] font-bold leading-5 text-slate-900 shadow">{actionsCount}</span>}
        </Link>

        <div className="relative" ref={uRef}>
          <button onClick={() => setUser((v) => !v)} aria-haspopup="menu" aria-expanded={user} className="flex items-center gap-2 rounded-full border border-slate-200 bg-card py-1 pl-1 pr-3 shadow-sm transition hover:bg-slate-50">
            <Avatar name="Pro Clean" size="md" /><ChevronDown className="h-4 w-4 text-slate-500" />
          </button>
          {user && (
            <div role="menu" className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <div className="truncate border-b border-slate-100 px-3 pb-2 pt-1 text-sm text-slate-500">{email}</div>
              <Link href="/compte" role="menuitem" onClick={() => setUser(false)} className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-slate-800 hover:bg-slate-50"><KeyRound className="h-[18px] w-[18px] text-slate-500" /> Mon compte</Link>
              <form action={signOut}><button role="menuitem" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-slate-800 hover:bg-slate-50"><LogOut className="h-[18px] w-[18px] text-slate-500" /> Se déconnecter</button></form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
