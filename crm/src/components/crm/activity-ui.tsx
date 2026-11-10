import Link from "next/link";
import { cn } from "@/lib/utils";
import { ACTIVITIES, ACTIVITY, CONCIERGE_ACTIVITIES, type Activity } from "@/lib/domain/activity";

export function ActivityChip({ a, className }: { a: Activity; className?: string }) {
  return <span title={ACTIVITY[a].hint} className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", ACTIVITY[a].tone, className)}>{ACTIVITY[a].label}</span>;
}

/** Onglets de tri par famille : « Toutes » + les quatre familles, avec le nombre d'éléments. `href(key)` garde les autres filtres de la page. */
export function ActivityTabs({ current, counts, href, pole }: { current: string; counts: Record<string, number>; href: (key: string) => string; pole?: "nettoyage" }) {
  if (pole === "nettoyage") {
    const own = ACTIVITIES.filter((a) => !CONCIERGE_ACTIVITIES.includes(a.key));
    const items = [{ key: "", label: "Nettoyage", n: own.reduce((t, a) => t + (counts[a.key] ?? 0), 0) }, ...own.map((a) => ({ key: a.key as string, label: a.label, n: counts[a.key] ?? 0 }))];
    const conc = CONCIERGE_ACTIVITIES.reduce((t, k) => t + (counts[k] ?? 0), 0);
    return (
      <nav aria-label="Familles d'activité" className="mb-5 flex gap-1.5 overflow-x-auto">
        {items.map((t) => {
          const on = current === t.key;
          return (
            <Link key={t.key || "all"} href={href(t.key)} aria-current={on ? "page" : undefined}
              className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[14px] transition-colors", on ? "border-foreground bg-foreground text-background" : "border-border bg-card text-secondary-foreground hover:bg-secondary/70")}>
              {t.label}<span className={cn("num text-xs", on ? "text-background/70" : "text-muted-foreground")}>{t.n}</span>
            </Link>
          );
        })}
        <Link href="/conciergerie" className="ml-auto flex shrink-0 items-center gap-2 rounded-full border border-dashed border-border bg-card px-3.5 py-1.5 text-[14px] text-secondary-foreground hover:bg-secondary/70">Conciergerie <span className="num text-xs text-muted-foreground">{conc}</span> →</Link>
      </nav>
    );
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const items = [{ key: "", label: "Toutes", n: total }, ...ACTIVITIES.map((a) => ({ key: a.key as string, label: a.label, n: counts[a.key] ?? 0 }))];
  return (
    <nav aria-label="Familles d'activité" className="mb-5 flex gap-1.5 overflow-x-auto">
      {items.map((t) => {
        const on = current === t.key;
        return (
          <Link key={t.key || "all"} href={href(t.key)} aria-current={on ? "page" : undefined}
            className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[14px] transition-colors", on ? "border-foreground bg-foreground text-background" : "border-border bg-card text-secondary-foreground hover:bg-secondary/70")}>
            {t.label}<span className={cn("num text-xs", on ? "text-background/70" : "text-muted-foreground")}>{t.n}</span>
          </Link>
        );
      })}
    </nav>
  );
}
