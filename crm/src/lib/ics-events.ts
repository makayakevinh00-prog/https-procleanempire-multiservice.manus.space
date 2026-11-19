/**
 * Lecture d'un calendrier publié (.ics) — Outlook, Google Agenda, iCloud — pour l'afficher dans le CRM.
 * Les heures sont rendues en heure de Paris (heure « murale ») : "AAAA-MM-JJTHH:MM".
 * Récurrences prises en charge : chaque jour, chaque semaine (jours choisis), chaque mois (même quantième), chaque année,
 * avec intervalle, fin (UNTIL), nombre (COUNT) et dates exclues (EXDATE). Les règles plus rares sont ignorées :
 * l'évènement apparaît alors à sa première date seulement.
 */
export type CalEvent = { uid: string; title: string; start: string; end: string; allDay: boolean; location: string | null };

const pad = (n: number) => String(n).padStart(2, "0");
const PARIS = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
/** Instant UTC → heure murale de Paris. */
const utcToParis = (d: Date) => PARIS.format(d).replace(" ", "T").slice(0, 16);

/** Valeur DTSTART/DTEND → heure murale. Un horaire « Z » est converti ; un horaire avec fuseau est gardé tel quel (agenda tenu à Paris). */
function parseStamp(value: string): { at: string; allDay: boolean } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  if (!m[4]) return { at: `${m[1]}-${m[2]}-${m[3]}T00:00`, allDay: true };
  if (m[7]) return { at: utcToParis(new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!))), allDay: false };
  return { at: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`, allDay: false };
}

/** Arithmétique sur heures murales, sans fuseau (on passe par l'UTC comme simple calendrier). */
const toMs = (wall: string) => Date.UTC(+wall.slice(0, 4), +wall.slice(5, 7) - 1, +wall.slice(8, 10), +wall.slice(11, 13), +wall.slice(14, 16));
const fromMs = (ms: number) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
const DAY_MS = 86_400_000;
const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const unescape = (v: string) => v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();

type Raw = { props: Record<string, string>; exdates: string[] };

/** Occurrences d'un évènement (début, en heure murale) dans la fenêtre demandée. */
function occurrences(start: string, rule: string | undefined, exdates: Set<string>, fromMsWin: number, toMsWin: number, durationMs: number): string[] {
  const out: string[] = [];
  const push = (ms: number) => { const w = fromMs(ms); if (ms + durationMs > fromMsWin && ms < toMsWin && !exdates.has(w) && !exdates.has(w.slice(0, 10))) out.push(w); };
  const first = toMs(start);
  if (!rule) { push(first); return out; }
  const r = Object.fromEntries(rule.split(";").map((kv) => kv.split("=") as [string, string]));
  const freq = r.FREQ, interval = Math.max(1, Number(r.INTERVAL ?? 1));
  const until = r.UNTIL ? (parseStamp(r.UNTIL)?.at ? toMs(parseStamp(r.UNTIL)!.at) + (r.UNTIL.includes("T") ? 0 : DAY_MS - 1) : Infinity) : Infinity;
  const limit = Math.min(until, toMsWin);
  let count = r.COUNT ? Number(r.COUNT) : Infinity;
  const guard = 5000;
  if (freq === "DAILY") {
    for (let ms = first, n = 0; ms <= limit && count > 0 && n < guard; ms += interval * DAY_MS, n++, count--) push(ms);
  } else if (freq === "WEEKLY") {
    const days = (r.BYDAY ? r.BYDAY.split(",").map((d) => BYDAY.indexOf(d.slice(-2))).filter((d) => d >= 0) : [new Date(first).getUTCDay()]).sort();
    // Début de la semaine du premier évènement (lundi), puis saut de semaine en semaine.
    const dow = (new Date(first).getUTCDay() + 6) % 7;
    const weekStart = first - dow * DAY_MS;
    for (let w = 0; w < guard && count > 0; w++) {
      const base = weekStart + w * interval * 7 * DAY_MS;
      if (base > limit) break;
      for (const d of days.map((x) => (x + 6) % 7).sort((a, b) => a - b)) {
        const ms = base + d * DAY_MS;
        if (ms < first || ms > limit || count <= 0) continue;
        push(ms); count--;
      }
    }
  } else if (freq === "MONTHLY" || freq === "YEARLY") {
    if (r.BYDAY || r.BYSETPOS) { push(first); return out; }
    const d0 = new Date(first);
    for (let n = 0; n < 600 && count > 0; n++) {
      const months = n * interval * (freq === "YEARLY" ? 12 : 1);
      const d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + months, d0.getUTCDate(), d0.getUTCHours(), d0.getUTCMinutes()));
      if (d.getUTCDate() !== d0.getUTCDate()) continue; // le 31 n'existe pas tous les mois
      if (d.getTime() > limit) break;
      push(d.getTime()); count--;
    }
  } else push(first);
  return out;
}

/** Évènements d'un fichier .ics qui touchent la fenêtre [from, to[ (dates "AAAA-MM-JJ", heure de Paris). */
export function parseIcsEvents(text: string, from: string, to: string): CalEvent[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const raws: Raw[] = [];
  let cur: Raw | null = null, depth = 0;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === "BEGIN:VEVENT") { cur = { props: {}, exdates: [] }; depth = 0; continue; }
    if (!cur) continue;
    if (line.startsWith("BEGIN:")) { depth++; continue; }
    if (line.startsWith("END:") && line !== "END:VEVENT") { depth = Math.max(0, depth - 1); continue; }
    if (line === "END:VEVENT") { raws.push(cur); cur = null; continue; }
    if (depth > 0) continue; // alarmes et sous-blocs
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).split(";")[0]!.toUpperCase(), value = line.slice(i + 1);
    if (key === "EXDATE") cur.exdates.push(...value.split(","));
    else if (!(key in cur.props)) cur.props[key] = value;
  }
  const fromMsWin = toMs(`${from}T00:00`), toMsWin = toMs(`${to}T00:00`);
  // Une occurrence modifiée (RECURRENCE-ID) remplace celle de la série.
  const overridden = new Set(raws.filter((r) => r.props["RECURRENCE-ID"]).map((r) => `${r.props.UID}|${parseStamp(r.props["RECURRENCE-ID"]!)?.at ?? ""}`));
  const out: CalEvent[] = [];
  for (const r of raws) {
    const p = r.props;
    if (/^CANCELLED$/i.test(p.STATUS ?? "")) continue;
    const s = parseStamp(p.DTSTART ?? "");
    if (!s || !p.UID) continue;
    const e = parseStamp(p.DTEND ?? "");
    const durationMs = e ? Math.max(0, toMs(e.at) - toMs(s.at)) : s.allDay ? DAY_MS : 3_600_000;
    const ex = new Set(r.exdates.map((x) => parseStamp(x)?.at ?? "").filter(Boolean));
    const title = unescape(p.SUMMARY ?? "") || "(sans titre)";
    const starts = p["RECURRENCE-ID"] ? occurrences(s.at, undefined, ex, fromMsWin, toMsWin, durationMs) : occurrences(s.at, p.RRULE, ex, fromMsWin, toMsWin, durationMs);
    for (const start of starts) {
      if (!p["RECURRENCE-ID"] && p.RRULE && overridden.has(`${p.UID}|${start}`)) continue;
      out.push({ uid: `${p.UID}|${start}`, title: title.slice(0, 120), start, end: fromMs(toMs(start) + durationMs), allDay: s.allDay, location: p.LOCATION ? unescape(p.LOCATION).slice(0, 120) : null });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/** Adresses acceptées pour un calendrier publié : uniquement en https, chez un fournisseur d'agenda connu. */
const HOSTS = ["office365.com", "office.com", "outlook.com", "live.com", "google.com", "icloud.com"];
export function isAllowedCalendarUrl(value: string): boolean {
  try {
    const u = new URL(value.replace(/^webcal:/i, "https:"));
    return u.protocol === "https:" && HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch { return false; }
}
