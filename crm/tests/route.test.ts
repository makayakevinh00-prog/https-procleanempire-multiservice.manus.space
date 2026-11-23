import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { crowKm, roughEstimate } from "@/lib/route";
import { liveLine } from "@/components/live/live-map";

const pontoise = { lat: 49.0508, lng: 2.1008 }, paris16 = { lat: 48.8738, lng: 2.2850 };

describe("trajet", () => {
  it("distance à vol d'oiseau Pontoise → Paris 16e : environ 24 km", () => {
    expect(crowKm(pontoise, paris16)).toBeGreaterThan(22);
    expect(crowKm(pontoise, paris16)).toBeLessThan(26);
  });
  it("estimation à la distance : plausible et jamais nulle", () => {
    const r = roughEstimate(pontoise, paris16);
    expect(r.source).toBe("distance");
    expect(r.minutes).toBeGreaterThan(50);
    expect(r.minutes).toBeLessThan(110);
    expect(roughEstimate(pontoise, pontoise).minutes).toBeGreaterThanOrEqual(2);
  });
});

describe("phrase de suivi", () => {
  const base: any = { job: "j", title: "Ménage", status: "acceptee", date: "2026-11-23", window_start: "11:00:00", window_end: "14:00:00", cleaner: "Awa", dest: [48.87, 2.28], arrived_at: null, moving: false, pos: null, seen_at: null, eta_at: null, eta_minutes: null, eta_traffic: false, trail: [] };
  const now = Date.parse("2026-11-23T09:30:00Z");
  it("pas encore parti", () => expect(liveLine(base, now).tone).toBe("wait"));
  it("en route : heure d'arrivée et minutes restantes", () => {
    const l = liveLine({ ...base, moving: true, eta_at: "2026-11-23T09:48:00Z", eta_traffic: true }, now);
    expect(l.tone).toBe("go");
    expect(l.sub).toContain("10 h 48");
    expect(l.sub).toContain("dans 18 min");
    expect(l.sub).toContain("trafic");
  });
  it("sur place", () => expect(liveLine({ ...base, arrived_at: "2026-11-23T09:50:00Z" }, now).title).toBe("Awa est sur place"));
  it("reprise demandée", () => expect(liveLine({ ...base, status: "a_reprendre" }, now).tone).toBe("check"));
});
