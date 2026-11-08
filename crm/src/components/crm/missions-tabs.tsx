import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  ["missions", "/missions", "Missions"],
  ["verifier", "/missions/a-verifier", "À vérifier"],
  ["anomalies", "/missions/problemes", "Anomalies"],
  ["direct", "/sur-place", "En direct"]
] as const;

/** Une seule section « Missions » : calendrier et liste, contrôle avant validation, anomalies, suivi en direct. */
export function MissionsTabs({ active, counts = {} }: { active: "missions" | "verifier" | "anomalies" | "direct"; counts?: Partial<Record<"verifier" | "anomalies", number>> }) {
  return (
    <nav aria-label="Missions" className="-mt-2 mb-5 flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map(([k, href, label]) => {
        const n = (counts as Record<string, number | undefined>)[k];
        return (
          <Link key={k} href={href} aria-current={active === k ? "page" : undefined}
            className={cn("relative flex shrink-0 items-center gap-2 px-4 py-2.5 text-[14px] font-medium transition-colors", active === k ? "text-foreground after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-foreground" : "text-muted-foreground hover:text-foreground")}>
            {label}{n ? <span className="num rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{n}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
