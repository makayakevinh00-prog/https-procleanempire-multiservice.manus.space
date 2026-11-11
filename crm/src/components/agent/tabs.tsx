"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, User } from "lucide-react";
import { dict, type Lang } from "@/lib/field-ui";

/** Barre du bas : Aujourd'hui, Rapport, Profil (comme une application). */
export function AgentTabs({ token, lang }: { token: string; lang: Lang }) {
  const path = usePathname();
  const t = dict(lang);
  const base = `/agent/${token}`;
  const tabs = [
    { href: base, label: t.today, icon: Home, on: path === base || path.startsWith(`${base}/mission`) },
    { href: `${base}/rapport`, label: t.report, icon: FileText, on: path.startsWith(`${base}/rapport`) || path.startsWith(`${base}/historique`) },
    { href: `${base}/profil`, label: t.profile, icon: User, on: path.startsWith(`${base}/profil`) || /\/(aide|confidentialite|donnees)$/.test(path) }
  ];
  return (
    <nav aria-label="Navigation" className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1 rounded-full border border-[var(--a-line)] bg-[var(--a-dock)] p-2 shadow-[0_8px_30px_rgba(16,24,40,0.12)]">
        {tabs.map(({ href, label, icon: Icon, on }) => (
          <Link key={href} href={href} aria-current={on ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 rounded-full py-2 text-[13px] font-bold ${on ? "bg-[var(--a-soft)] text-[var(--a-pri)]" : "text-[var(--a-mute)]"}`}>
            <Icon className="h-6 w-6" strokeWidth={on ? 2.4 : 1.8} />{label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
