import { MapPin, Clock, Star } from "lucide-react";
import type { CleanerJob } from "@/lib/agent";
import { cleanerAcceptAction } from "@/app/actions/nettoyeur";
import { dayFr, eur, slot } from "@/lib/cleaner-ui";
import { RequestCard } from "@/components/nettoyeur/live";

/** Une demande de ménage : lieu, distance, créneau, gain, « J'accepte » ou « Passer ». */
export function JobRequest({ token, j, showDay }: { token: string; j: CleanerJob; showDay?: boolean }) {
  return (
    <RequestCard id={j.id} accept={<form action={cleanerAcceptAction.bind(null, token, j.id)}><button className="h-14 w-full rounded-2xl bg-[var(--a-pri)] text-lg font-extrabold text-white active:opacity-90">J&apos;accepte</button></form>}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[18px] font-extrabold leading-snug">{j.title}</div>
          {showDay && <div className="text-[14px] font-bold text-[var(--a-pri)]">{dayFr(j.date)}</div>}
          <div className="mt-0.5 flex items-center gap-1.5 text-[14px] text-[var(--a-mute)]"><MapPin className="h-4 w-4" />{j.city} {j.postal_code}{j.distance_km != null ? ` · à ${String(j.distance_km).replace(".", ",")} km` : ""}</div>
          <div className="flex items-center gap-1.5 text-[14px] text-[var(--a-mute)]"><Clock className="h-4 w-4" />{slot(j.window_start, j.window_end)}{j.hours ? ` · environ ${j.hours} h` : ""}</div>
        </div>
        <div className="shrink-0 whitespace-nowrap text-right"><div className="num text-[26px] font-extrabold leading-none text-[var(--a-ok)]">{eur(j.amount)}</div><div className="text-[12px] text-[var(--a-mute)]">pour vous</div></div>
      </div>
      {j.rank === 1 && <div className="inline-flex rounded-full bg-[var(--a-okbg)] px-2.5 py-1 text-xs font-extrabold text-[var(--a-ok)]">Vous êtes le mieux placé</div>}
      {j.favorite && <div className="inline-flex items-center gap-1 rounded-full bg-[var(--a-warnbg)] px-2.5 py-1 text-xs font-extrabold text-[var(--a-warn)]"><Star className="h-3.5 w-3.5" />Le propriétaire vous a choisi comme favori</div>}
    </RequestCard>
  );
}
