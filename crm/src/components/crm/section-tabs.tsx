"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { SECTIONS_NAV, activeTab, sectionOfPath } from "@/lib/nav-sections";
import { pathAllowed, type Perms } from "@/lib/team";

/** Onglets de la rubrique en cours : les anciennes pages du menu, rangées au même endroit. N'apparaît pas pour les rubriques à une seule page. */
export function SectionTabs({ counts = {}, perms = null }: { counts?: Record<string, number>; perms?: Perms | null }) {
  const path = usePathname();
  const section = sectionOfPath(path);
  if (!section) return null;
  const tabs = section.tabs.filter((t) => !perms || (t.href !== "/" && pathAllowed(perms, t.href)));
  if (tabs.length < 2) return null;
  const active = activeTab(path, tabs);
  return <Tabs items={tabs.map((t) => ({ href: t.href, label: t.label, count: counts[t.href] ? counts[t.href] : undefined, active: active?.href === t.href }))} />;
}

export { SECTIONS_NAV };
