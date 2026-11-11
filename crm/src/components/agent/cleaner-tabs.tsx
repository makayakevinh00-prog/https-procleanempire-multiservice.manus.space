"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ClipboardCheck, Wallet, User } from "lucide-react";

/** Barre du bas de l'application nettoyeur : Demandes, Mes ménages, Gains, Profil. */
export function CleanerTabs({ token }: { token: string }) {
  const path = usePathname();
  const base = `/nettoyeur/${token}`;
  const tabs = [
    { href: base, label: "Demandes", icon: Search, on: path === base },
    { href: `${base}/missions`, label: "Mes ménages", icon: ClipboardCheck, on: path.startsWith(`${base}/missions`) },
    { href: `${base}/gains`, label: "Gains", icon: Wallet, on: path.startsWith(`${base}/gains`) },
    { href: `${base}/profil`, label: "Profil", icon: User, on: path.startsWith(`${base}/profil`) }
  ];
  return (
    <nav aria-label="Navigation" className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-full border border-[var(--a-line)] bg-[var(--a-dock)] p-2 shadow-[0_8px_30px_rgba(16,24,40,0.12)]">
        {tabs.map(({ href, label, icon: Icon, on }) => (
          <Link key={href} href={href} aria-current={on ? "page" : undefined} className={`flex flex-col items-center gap-0.5 rounded-full py-2 text-[12px] font-bold ${on ? "bg-[var(--a-soft)] text-[var(--a-pri)]" : "text-[var(--a-mute)]"}`}>
            <Icon className="h-6 w-6" strokeWidth={on ? 2.4 : 1.8} />{label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
