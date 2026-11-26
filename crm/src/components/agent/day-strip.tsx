import Link from "next/link";
import { shiftDay } from "@/lib/field-ui";

const LETTER = ["D", "L", "M", "M", "J", "V", "S"];

/** Sept jours autour de la date affichée : on touche un jour pour y aller. Le jour affiché est en bleu, aujourd'hui est souligné. */
export function DayStrip({ token, date, today }: { token: string; date: string; today: string }) {
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(date, i - 3));
  return (
    <nav aria-label="Jours" className="fx-in mb-4 grid grid-cols-7 gap-1 rounded-3xl bg-[var(--a-card)] p-2 text-center" style={{ animationDelay: "60ms" }}>
      {days.map((d) => {
        const on = d === date, isToday = d === today;
        const dt = new Date(`${d}T12:00:00Z`);
        return (
          <Link key={d} href={d === today ? `/agent/${token}` : `/agent/${token}?d=${d}`} aria-current={on ? "date" : undefined}
            className={`fx-press flex flex-col items-center gap-0.5 rounded-2xl py-2 ${on ? "text-white" : ""}`} style={on ? { background: "#1e3a6e" } : undefined}>
            <span className={`text-[11px] font-bold uppercase ${on ? "text-white/75" : "text-[var(--a-mute)]"}`}>{LETTER[dt.getUTCDay()]}</span>
            <span className="num text-[17px] font-extrabold">{dt.getUTCDate()}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${isToday ? (on ? "bg-white" : "bg-[var(--a-pri)]") : "bg-transparent"}`} />
          </Link>
        );
      })}
    </nav>
  );
}
