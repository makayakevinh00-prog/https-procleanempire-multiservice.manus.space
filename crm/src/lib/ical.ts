/** Génération d'un flux iCalendar (RFC 5545). Fonctions pures, testées. */
export type FeedEvent = { id: string; title: string; date: string; time: string | null; hours: number | null; stage: string; agent: string | null; client: string | null; site: string | null; address: string | null; updated_at: string };

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** Plie les lignes à 75 octets maximum, comme l'exige la norme. */
function fold(line: string): string {
  const out: string[] = []; let cur = ""; let bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > 74) { out.push(cur); cur = " " + ch; bytes = 1 + b; } else { cur += ch; bytes += b; }
  }
  out.push(cur); return out.join("\r\n");
}
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const local = (date: string, time: string) => `${date.replace(/-/g, "")}T${time.replace(/:/g, "").slice(0, 6).padEnd(6, "0")}`;
function addMinutes(date: string, time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number); const total = h * 60 + m + minutes;
  const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) + Math.floor(total / 1440) * 86400000);
  const t = ((total % 1440) + 1440) % 1440;
  return { date: d.toISOString().slice(0, 10), time: `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}` };
}
const STAGE: Record<string, string> = { planifiee: "Planifiée", affectee: "Affectée", en_route: "En route", arrivee: "Arrivée", en_cours: "En cours", a_verifier: "À vérifier", terminee: "Terminée", validee: "Validée", facturable: "Facturable", facturee: "Facturée", annulee: "Annulée" };

const TZ = ["BEGIN:VTIMEZONE", "TZID:Europe/Paris", "BEGIN:STANDARD", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "END:STANDARD",
  "BEGIN:DAYLIGHT", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "END:DAYLIGHT", "END:VTIMEZONE"];

export function buildCalendar(events: FeedEvent[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ProClean Empire//CRM//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:ProClean Empire — Missions", "X-WR-TIMEZONE:Europe/Paris", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H", ...TZ];
  for (const e of events) {
    const who = e.agent ? `Intervenant : ${e.agent}` : "Sans intervenant";
    const summary = [e.client ?? e.title, e.agent ? `(${e.agent})` : "(sans intervenant)"].join(" ");
    lines.push("BEGIN:VEVENT", `UID:mission-${e.id}@procleanempire`, `DTSTAMP:${stamp(e.updated_at)}`, `LAST-MODIFIED:${stamp(e.updated_at)}`);
    if (e.time) {
      const end = addMinutes(e.date, e.time, Math.round((e.hours && e.hours > 0 ? e.hours : 1) * 60));
      lines.push(`DTSTART;TZID=Europe/Paris:${local(e.date, e.time)}`, `DTEND;TZID=Europe/Paris:${local(end.date, end.time)}`);
    } else {
      const next = addMinutes(e.date, "00:00", 1440).date;
      lines.push(`DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${next.replace(/-/g, "")}`);
    }
    lines.push(`SUMMARY:${esc(summary)}`);
    if (e.address) lines.push(`LOCATION:${esc(e.address)}`);
    lines.push(`DESCRIPTION:${esc([e.title, e.site ? `Site : ${e.site}` : null, who, `Étape : ${STAGE[e.stage] ?? e.stage}`].filter(Boolean).join("\n"))}`);
    lines.push(`STATUS:${e.stage === "annulee" ? "CANCELLED" : "CONFIRMED"}`, "TRANSP:OPAQUE", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
