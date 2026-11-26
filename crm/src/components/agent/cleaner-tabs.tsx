"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Search, User, Wallet } from "lucide-react";

/** Barre du bas façon iPhone (verre dépoli) : Accueil, Demandes (pastille), Ménages (calendrier), Gains, Profil. */
export function CleanerTabs({
  token,
  requests = 0,
}: {
  token: string;
  requests?: number;
}) {
  const path = usePathname();
  const base = `/nettoyeur/${token}`;
  const at = (...s: string[]) => s.some((x) => path.startsWith(`${base}/${x}`));
  const tabs = [
    { href: base, label: "Accueil", icon: Home, on: path === base, badge: 0 },
    {
      href: `${base}/demandes`,
      label: "Demandes",
      icon: Search,
      on: at("demandes"),
      badge: requests,
    },
    {
      href: `${base}/missions`,
      label: "Ménages",
      icon: CalendarDays,
      on: at("missions"),
      badge: 0,
    },
    {
      href: `${base}/gains`,
      label: "Gains",
      icon: Wallet,
      on: at("gains", "factures"),
      badge: 0,
    },
    {
      href: `${base}/profil`,
      label: "Profil",
      icon: User,
      on: at("profil", "formation", "identite", "certificat"),
      badge: 0,
    },
  ];

  return (
    <nav
      aria-label="Navigation"
      className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))]"
    >
      <div className="fx-glass mx-auto grid max-w-md grid-cols-5 gap-0.5 rounded-[30px] border border-[var(--a-line)] p-1.5 shadow-[0_12px_36px_rgba(16,24,40,0.16)]">
        {tabs.map(({ href, label, icon: Icon, on, badge }) => (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`fx-press relative flex flex-col items-center gap-0.5 rounded-3xl py-2 text-[11px] font-bold transition-colors ${on ? "bg-[var(--a-soft)] text-[var(--a-pri)]" : "text-[var(--a-mute)]"}`}
          >
            <span className="relative">
              <Icon className="h-6 w-6" strokeWidth={on ? 2.4 : 1.8} />
              {badge > 0 && (
                <span
                  className="fx-pop absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-extrabold leading-none text-white"
                  style={{ background: "#d92d20" }}
                >
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </span>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
