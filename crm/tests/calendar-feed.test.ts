import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { buildCalendar, type FeedEvent } from "../src/lib/ical";

const read = (p: string) => readFileSync(path.join(__dirname, "..", p), "utf8");
let db: PGlite;
const q = async <T = any>(sql: string, params: any[] = []) => (await db.query<T>(sql, params)).rows;
const TOKEN = "c".repeat(64);
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;`);
  for (const f of ["0001_schema", "0002_automation", "0003_automation_reminders", "0004_reliability", "0005_draft_clients", "0006_sites_staff_missions", "0007_process_links", "0008_agent_mobile", "0023_calendar_feed"]) await db.exec(read(`supabase/migrations/${f}.sql`));
  const today = (await q("select (now() at time zone 'Europe/Paris')::date d"))[0].d.toISOString().slice(0, 10);
  const [c] = await q("insert into clients(name, address, city) values ('Client Test','1 rue A','Paris') returning id");
  const [r] = await q("insert into clients(name, address, city, is_reserved) values ('Contact Secret','2 rue B','Paris', true) returning id");
  await q("insert into interventions(client_id, title, scheduled_date, start_time, duration_hours, unit_price_ht, notes) values ($1,'Passage A',$2,'09:30',2,350,'note interne') ", [c.id, today]);
  await q("insert into interventions(client_id, title, scheduled_date, unit_price_ht) values ($1,'Passage réservé',$2,500)", [r.id, today]);
  await q("insert into calendar_feed(id, token_hash) values (1,$1)", [hash(TOKEN)]);
});

describe("flux calendrier", () => {
  it("refuse un lien inconnu, vide ou court", async () => {
    for (const t of ["x".repeat(64), "", "court"]) await expect(db.query("select calendar_feed_events($1)", [t])).rejects.toThrow(/ACCES_REFUSE/);
    await expect(db.query("select calendar_feed_events(null)")).rejects.toThrow(/ACCES_REFUSE/);
  });
  it("après révocation, l'ancien lien ne marche plus", async () => {
    await q("delete from calendar_feed");
    await expect(db.query("select calendar_feed_events($1)", [TOKEN])).rejects.toThrow(/ACCES_REFUSE/);
    await q("insert into calendar_feed(id, token_hash) values (1,$1)", [hash(TOKEN)]);
  });
  it("ne renvoie ni montant, ni note interne ; masque le contact réservé", async () => {
    const ev = (await q("select calendar_feed_events($1) as e", [TOKEN]))[0].e as any[];
    expect(ev).toHaveLength(2);
    const raw = JSON.stringify(ev);
    expect(raw).not.toMatch(/350|500|note interne|unit_price/);
    const reserved = ev.find((e) => e.title.includes("réservé"))!;
    expect(reserved.client).toBeNull(); expect(reserved.address).toBeNull(); expect(raw).not.toContain("Contact Secret");
  });
});

describe("iCalendar", () => {
  const ev: FeedEvent = { id: "1", title: "Entretien, bureaux; étage 2", date: "2026-11-10", time: "23:30:00", hours: 2, stage: "affectee", agent: "Fatou D", client: "Client Test", site: "Bureaux A", address: "1 rue A, 75001 Paris", updated_at: "2026-11-07T10:00:00Z" };
  it("produit un calendrier valide, fins de ligne CRLF, lignes ≤ 75 octets", () => {
    const ics = buildCalendar([ev, { ...ev, id: "2", time: null, stage: "annulee", agent: null }]);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true); expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    for (const l of ics.split("\r\n")) expect(Buffer.byteLength(l)).toBeLessThanOrEqual(75);
    expect(ics).toContain("DTSTART;TZID=Europe/Paris:20261110T233000");
    expect(ics).toContain("DTEND;TZID=Europe/Paris:20261111T013000");   // passe minuit
    expect(ics).toContain("DTSTART;VALUE=DATE:20261110"); expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("UID:mission-1@procleanempire"); expect(ics).toContain("Entretien\\, bureaux\; étage 2");
  });
});
