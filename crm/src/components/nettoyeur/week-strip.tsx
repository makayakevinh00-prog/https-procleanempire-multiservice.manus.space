import Link from "next/link";

const LETTER = ["D", "L", "M", "M", "J", "V", "S"];

/** Mini-calendrier des 7 prochains jours : un point par jour où un ménage est prévu. Touchez pour ouvrir « Mes ménages ». */
export function WeekStrip({
  today,
  href,
  jobs,
}: {
  today: string;
  href: string;
  jobs: { date: string; status?: string }[];
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return {
      iso: d.toISOString().slice(0, 10),
      letter: LETTER[d.getUTCDay()]!,
      n: d.getUTCDate(),
    };
  });
  return (
    <Link
      href={href}
      aria-label="Ma semaine : ouvrir mes ménages"
      className="fx-in fx-press mt-4 block rounded-3xl bg-[var(--a-card)] p-3"
      style={{ animationDelay: "120ms" }}
    >
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d, i) => {
          const n = jobs.filter((j) => j.date === d.iso).length,
            first = i === 0;
          return (
            <div
              key={d.iso}
              className={`flex flex-col items-center gap-0.5 rounded-2xl py-2 ${first ? "text-white" : ""}`}
              style={first ? { background: "#1e3a6e" } : undefined}
            >
              <span
                className={`text-[11px] font-bold uppercase ${first ? "text-white/75" : "text-[var(--a-mute)]"}`}
              >
                {LETTER[new Date(`${d.iso}T12:00:00Z`).getUTCDay()]}
              </span>
              <span className="num text-[17px] font-extrabold">{d.n}</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${n ? (first ? "bg-white" : "bg-[var(--a-pri)]") : "bg-transparent"}`}
              />
            </div>
          );
        })}
      </div>
    </Link>
  );
}
