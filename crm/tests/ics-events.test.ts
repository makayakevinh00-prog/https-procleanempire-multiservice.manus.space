import { describe, expect, it } from "vitest";
import { isAllowedCalendarUrl, parseIcsEvents } from "@/lib/ics-events";

const wrap = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR`;
const ev = (lines: string[]) => ["BEGIN:VEVENT", ...lines, "END:VEVENT"].join("\r\n");

describe("lecture d'un calendrier publié (.ics)", () => {
  it("lit un rendez-vous simple avec fuseau, et convertit un horaire UTC en heure de Paris", () => {
    const text = wrap([ev(["UID:a", "SUMMARY:RDV prospect", "DTSTART;TZID=Romance Standard Time:20261119T090000", "DTEND;TZID=Romance Standard Time:20261119T100000", "LOCATION:Pontoise"]),
      ev(["UID:b", "SUMMARY:Appel", "DTSTART:20261119T130000Z", "DTEND:20261119T133000Z"])].join("\r\n"));
    const r = parseIcsEvents(text, "2026-11-16", "2026-11-23");
    expect(r.map((e) => [e.title, e.start, e.end])).toEqual([["RDV prospect", "2026-11-19T09:00", "2026-11-19T10:00"], ["Appel", "2026-11-19T14:00", "2026-11-19T14:30"]]);
    expect(r[0]!.location).toBe("Pontoise");
  });
  it("convertit l'été (UTC+2)", () => {
    const r = parseIcsEvents(wrap(ev(["UID:s", "SUMMARY:Été", "DTSTART:20260715T080000Z", "DTEND:20260715T090000Z"])), "2026-07-13", "2026-07-20");
    expect(r[0]!.start).toBe("2026-07-15T10:00");
  });
  it("déroule une récurrence hebdomadaire sur plusieurs jours, avec une date exclue", () => {
    const text = wrap(ev(["UID:w", "SUMMARY:Prospection", "DTSTART;TZID=Europe/Paris:20261102T140000", "DTEND;TZID=Europe/Paris:20261102T160000", "RRULE:FREQ=WEEKLY;BYDAY=MO,TH", "EXDATE;TZID=Europe/Paris:20261119T140000"]));
    const r = parseIcsEvents(text, "2026-11-16", "2026-11-23");
    expect(r.map((e) => e.start)).toEqual(["2026-11-16T14:00"]);
    const next = parseIcsEvents(text, "2026-11-23", "2026-11-30");
    expect(next.map((e) => e.start)).toEqual(["2026-11-23T14:00", "2026-11-26T14:00"]);
  });
  it("respecte l'intervalle, la fin et le nombre d'occurrences", () => {
    const every2 = wrap(ev(["UID:i", "SUMMARY:Point", "DTSTART:20261102T090000", "DTEND:20261102T093000", "RRULE:FREQ=WEEKLY;INTERVAL=2"]));
    expect(parseIcsEvents(every2, "2026-11-09", "2026-11-16")).toHaveLength(0);
    expect(parseIcsEvents(every2, "2026-11-16", "2026-11-23").map((e) => e.start)).toEqual(["2026-11-16T09:00"]);
    const until = wrap(ev(["UID:u", "SUMMARY:Fini", "DTSTART:20261102T090000", "DTEND:20261102T100000", "RRULE:FREQ=DAILY;UNTIL=20261104T235959Z"]));
    expect(parseIcsEvents(until, "2026-11-01", "2026-11-30").map((e) => e.start.slice(0, 10))).toEqual(["2026-11-02", "2026-11-03", "2026-11-04"]);
    const count = wrap(ev(["UID:c", "SUMMARY:Trois", "DTSTART:20261102T090000", "DTEND:20261102T100000", "RRULE:FREQ=DAILY;COUNT=3"]));
    expect(parseIcsEvents(count, "2026-11-01", "2026-11-30")).toHaveLength(3);
  });
  it("gère la journée entière, le mensuel, les annulés et les occurrences modifiées", () => {
    const text = wrap([ev(["UID:d", "SUMMARY:Salon", "DTSTART;VALUE=DATE:20261119", "DTEND;VALUE=DATE:20261120"]),
      ev(["UID:m", "SUMMARY:Factures", "DTSTART:20260927T100000", "DTEND:20260927T110000", "RRULE:FREQ=MONTHLY"]),
      ev(["UID:x", "SUMMARY:Annulé", "STATUS:CANCELLED", "DTSTART:20261119T100000", "DTEND:20261119T110000"]),
      ev(["UID:r", "SUMMARY:Série", "DTSTART:20261117T100000", "DTEND:20261117T110000", "RRULE:FREQ=DAILY;COUNT=3"]),
      ev(["UID:r", "SUMMARY:Série déplacée", "RECURRENCE-ID:20261118T100000", "DTSTART:20261118T150000", "DTEND:20261118T160000"])].join("\r\n"));
    const r = parseIcsEvents(text, "2026-11-16", "2026-11-30");
    expect(r.find((e) => e.title === "Salon")).toMatchObject({ allDay: true, start: "2026-11-19T00:00" });
    expect(r.filter((e) => e.title === "Factures").map((e) => e.start)).toEqual(["2026-11-27T10:00"]);
    expect(r.some((e) => e.title === "Annulé")).toBe(false);
    expect(r.filter((e) => e.title.startsWith("Série")).map((e) => e.start)).toEqual(["2026-11-17T10:00", "2026-11-18T15:00", "2026-11-19T10:00"]);
  });
  it("n'accepte que les adresses https d'agendas connus", () => {
    expect(isAllowedCalendarUrl("https://outlook.office365.com/owa/calendar/abc/calendar.ics")).toBe(true);
    expect(isAllowedCalendarUrl("webcal://outlook.live.com/owa/calendar/abc/calendar.ics")).toBe(true);
    expect(isAllowedCalendarUrl("http://outlook.office365.com/x.ics")).toBe(false);
    expect(isAllowedCalendarUrl("https://169.254.169.254/latest")).toBe(false);
    expect(isAllowedCalendarUrl("https://evil.example/outlook.com.ics")).toBe(false);
  });
});
