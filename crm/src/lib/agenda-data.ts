import type { SupabaseClient } from "@supabase/supabase-js";
import { isAllowedCalendarUrl, parseIcsEvents } from "@/lib/ics-events";
import type { AgendaEvent, AgendaKind } from "@/lib/domain/agenda";

export type CalendarSource = { id: string; label: string; kind: AgendaKind; ok: boolean; count: number; error?: string };
export type AgendaData = { events: AgendaEvent[]; sources: CalendarSource[]; tableMissing: boolean };

const pad = (n: number) => String(n).padStart(2, "0");
const addHours = (date: string, time: string, hours: number) => {
  const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), +time.slice(0, 2), +time.slice(3, 5)) + hours * 3_600_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

/** Télécharge un calendrier publié. Lecture seule, 6 secondes maximum, 3 Mo maximum, mis en cache 5 minutes. */
async function fetchIcs(url: string): Promise<string> {
  const target = url.replace(/^webcal:/i, "https:");
  if (!isAllowedCalendarUrl(target)) throw new Error("Adresse non autorisée");
  const res = await fetch(target, { signal: AbortSignal.timeout(6000), headers: { accept: "text/calendar" }, next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Le calendrier ne répond pas (${res.status})`);
  const text = await res.text();
  if (text.length > 3_000_000) throw new Error("Calendrier trop volumineux");
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Ce lien n'est pas un calendrier (.ics)");
  return text;
}

/**
 * Tout ce qui se passe entre deux dates : les missions du CRM (opérationnel) et les calendriers Outlook reliés.
 * Un calendrier qui ne répond pas n'empêche pas d'afficher les autres.
 */
export async function loadAgenda(sb: SupabaseClient, from: string, to: string, readExternal: boolean): Promise<AgendaData> {
  const [missions, calendars] = await Promise.all([
    sb.from("interventions").select("id, title, scheduled_date, start_time, duration_hours, status, site_address, clients(name, is_reserved)").gte("scheduled_date", from).lt("scheduled_date", to).neq("status", "annule"),
    readExternal ? sb.from("external_calendars").select("id, label, kind, url").order("created_at") : Promise.resolve({ data: [], error: null } as any)
  ]);
  const events: AgendaEvent[] = [];
  for (const m of (missions.error ? [] : missions.data ?? []) as any[]) {
    const reserved = !!m.clients?.is_reserved;
    const title = reserved ? "Mission (contact réservé)" : [m.clients?.name, m.title].filter(Boolean).join(" · ");
    const time = m.start_time ? String(m.start_time).slice(0, 5) : null;
    const start = `${m.scheduled_date}T${time ?? "00:00"}`;
    events.push({ id: `m-${m.id}`, title, start, end: time ? addHours(m.scheduled_date, time, Number(m.duration_hours ?? 1) || 1) : addHours(m.scheduled_date, "00:00", 24), allDay: !time, kind: "operationnel", source: "Missions du CRM", location: reserved ? null : m.site_address ?? null, href: `/missions/${m.id}` });
  }
  const tableMissing = !!calendars.error;
  const rows = (calendars.error ? [] : calendars.data ?? []) as { id: string; label: string; kind: AgendaKind; url: string }[];
  const sources = await Promise.all(rows.map(async (c): Promise<CalendarSource> => {
    try {
      const list = parseIcsEvents(await fetchIcs(c.url), from, to);
      for (const e of list) events.push({ id: `x-${c.id}-${e.uid}`, title: e.title, start: e.start, end: e.end, allDay: e.allDay, kind: c.kind, source: c.label, location: e.location });
      return { id: c.id, label: c.label, kind: c.kind, ok: true, count: list.length };
    } catch (err) {
      return { id: c.id, label: c.label, kind: c.kind, ok: false, count: 0, error: err instanceof Error ? (err.name === "TimeoutError" ? "Le calendrier met trop de temps à répondre" : err.message) : "Lecture impossible" };
    }
  }));
  events.sort((a, b) => a.start.localeCompare(b.start));
  return { events, sources, tableMissing };
}
