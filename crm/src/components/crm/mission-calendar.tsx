import Link from "next/link";
import { addDays } from "@/lib/domain/dates";
import { Card } from "@/components/ui/card";

type Item = {
  id: string;
  scheduled_date: string;
  start_time?: string | null;
  stage?: string | null;
  status?: string | null;
  assignee?: string | null;
  staff_id?: string | null;
  title: string;
  clients?: { name?: string } | null;
};

/** Grille mensuelle des missions (lundi → dimanche), partagée par « Missions » et « Planning ». */
export function MissionCalendar({
  rows,
  month,
  gridStart,
  gridEnd,
  today,
  dayHref,
}: {
  rows: Item[];
  month: string;
  gridStart: string;
  gridEnd: string;
  today: string;
  dayHref: (d: string) => string;
}) {
  const byDay = new Map<string, Item[]>();
  for (const r of rows)
    if (r.stage !== "annulee" && r.status !== "annule")
      byDay.set(r.scheduled_date, [...(byDay.get(r.scheduled_date) ?? []), r]);
  const days: string[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);
  return (
    <Card className="mb-4 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border/70 text-center text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
        {["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."].map((d) => (
          <div key={d} className="py-2.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const list = byDay.get(d) ?? [];
          const inMonth = d.startsWith(month);
          return (
            <div
              key={d}
              className={`min-h-[92px] border-b border-r border-border/60 p-1.5 sm:min-h-[118px] ${(i + 1) % 7 === 0 ? "border-r-0" : ""} ${inMonth ? "" : "bg-secondary/40"}`}
            >
              <Link
                href={dayHref(d)}
                className={`num mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[13px] ${d === today ? "bg-foreground font-semibold text-background" : inMonth ? "text-foreground hover:bg-secondary" : "text-muted-foreground"}`}
              >
                {Number(d.slice(8))}
              </Link>
              <ul className="space-y-1">
                {list.slice(0, 3).map((m) => {
                  const none = !m.assignee && !m.staff_id;
                  const done =
                    ["terminee", "validee", "facturable", "facturee"].includes(
                      m.stage ?? "",
                    ) || m.status === "realise";
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/missions/${m.id}`}
                        title={`${m.clients?.name ?? ""} · ${m.title}${none ? " · sans intervenant" : ` · ${m.assignee ?? ""}`}`}
                        className={`block truncate rounded-md px-1.5 py-0.5 text-[11.5px] leading-snug ${none ? "bg-[#f7ecdb] text-[#8f5a12]" : done ? "bg-secondary text-muted-foreground" : "bg-[#e8edf5] text-[#2b4c7e]"} hover:opacity-80`}
                      >
                        <span className="num font-medium">
                          {m.start_time ? String(m.start_time).slice(0, 5) : ""}
                        </span>{" "}
                        {m.clients?.name ?? m.title}
                      </Link>
                    </li>
                  );
                })}
                {list.length > 3 && (
                  <li>
                    <Link
                      href={dayHref(d)}
                      className="px-1.5 text-[11.5px] text-muted-foreground hover:text-foreground"
                    >
                      +{list.length - 3} autre(s)
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="px-4 py-2.5 text-xs text-muted-foreground">
        Bleu : mission affectée · ambre : sans intervenant · gris : terminée.
        Cliquez sur un jour pour le détail, sur une mission pour l&apos;ouvrir.
      </p>
    </Card>
  );
}
