import { describe, expect, it } from "vitest";
import { checkIcalUrl, parseIcal } from "../src/lib/concierge/ical";
import { addDays, buildAlerts, cleaningMessage, commissionOf, desiredCleanings, diffCleanings, recapMessage, sameDayArrival, type Listing, type Stay } from "../src/lib/concierge/plan";

const AIRBNB = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261112\r\nDTEND;VALUE=DATE:20261115\r\nUID:abc-1@airbnb.com\r\nSUMMARY:Reserved\r\nDESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/XYZ\\nPhone Number (Last 4 Digits): 1234\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261120\r\nDTEND;VALUE=DATE:20261122\r\nUID:blk-2@airbnb.com\r\nSUMMARY:Airbnb (Not available)\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261125\r\nDTEND;VALUE=DATE:20261127\r\nUID:abc-3@airbnb.com\r\nSUMMARY:Reserved\r\nEND:VEVENT\r\nEND:VCALENDAR`;

describe("lecture du calendrier iCal", () => {
  it("garde les séjours (dates + libellé), écarte les blocages Airbnb, ne garde ni description ni téléphone", () => {
    const ev = parseIcal(AIRBNB, "airbnb");
    expect(ev.map((e) => [e.uid, e.checkIn, e.checkOut])).toEqual([["abc-1@airbnb.com", "2026-11-12", "2026-11-15"], ["abc-3@airbnb.com", "2026-11-25", "2026-11-27"]]);
    expect(JSON.stringify(ev)).not.toMatch(/1234|reservations\/details/);
    expect(parseIcal(AIRBNB, "booking")).toHaveLength(3);   // Booking : on ne peut pas distinguer, tout est gardé
  });
  it("gère les lignes repliées, les dates-heures et ignore l'annulé", () => {
    const t = "BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:long-\n id-1\nDTSTART:20261201T150000Z\nDTEND:20261203T110000Z\nSUMMARY:CLOSED - Not available\nEND:VEVENT\nBEGIN:VEVENT\nUID:x\nDTSTART:20261201\nDTEND:20261202\nSTATUS:CANCELLED\nEND:VEVENT\nEND:VCALENDAR";
    expect(parseIcal(t, "booking")).toEqual([{ uid: "long-id-1", checkIn: "2026-12-01", checkOut: "2026-12-03", summary: "CLOSED - Not available" }]);
    expect(parseIcal("n'importe quoi")).toEqual([]);
  });
});

describe("lien calendrier sûr", () => {
  it("accepte les plateformes connues en https", () => {
    for (const u of ["https://www.airbnb.fr/calendar/ical/123.ics?s=abc", "https://ical.booking.com/v1/export?t=x", "https://www.vrbo.com/icalendar/x.ics", "https://www.abritel.fr/icalendar/x.ics", "https://calendar.google.com/calendar/ical/x/basic.ics"]) expect(checkIcalUrl(u).ok).toBe(true);
  });
  it("refuse http, adresses IP, ports, identifiants, hôtes inconnus et pièges de nom", () => {
    for (const u of ["http://www.airbnb.fr/x.ics", "https://127.0.0.1/x.ics", "https://169.254.169.254/latest", "https://localhost/x", "https://www.airbnb.fr:8443/x", "https://user:pw@www.airbnb.fr/x", "https://evil.example/x.ics", "https://airbnb.com.evil.example/x.ics", "https://notairbnb.com/x", "ftp://airbnb.com/x", "pas une adresse"]) expect(checkIcalUrl(u).ok, u).toBe(false);
  });
});

const L: Listing = { id: "L1", name: "Studio République", client_id: "C1", contract_id: null, site_id: null, checkout_time: "11:00:00", cleaning_hours: 2, cleaning_price_ht: 55, staff_id: null, auto_cleaning: true };
const S = (id: string, a: string, b: string, o: Partial<Stay> = {}): Stay => ({ id, listing_id: "L1", check_in: a, check_out: b, cancelled: false, intervention_id: null, ...o });

describe("ménages à chaque départ", () => {
  const stays = [S("s1", "2026-11-05", "2026-11-08"), S("s2", "2026-11-08", "2026-11-12"), S("s3", "2026-11-20", "2026-11-23"), S("old", "2026-10-01", "2026-10-03"), S("gone", "2026-11-15", "2026-11-16", { cancelled: true }), S("far", "2027-03-01", "2027-03-05")];
  it("un ménage par départ à venir, signalé urgent si une arrivée a lieu le jour même ; ni passé, ni annulé, ni trop lointain", () => {
    const d = desiredCleanings(L, stays, "2026-11-10");
    expect(d.map((x) => [x.date, x.time, x.urgent])).toEqual([["2026-11-12", "11:00", false], ["2026-11-23", "11:00", false]]);
    const d2 = desiredCleanings(L, stays, "2026-11-01");
    expect(d2[0]).toMatchObject({ date: "2026-11-08", urgent: true, title: "Ménage — Studio République (arrivée le même jour)" });
    expect(sameDayArrival(stays[0], stays)).toBe(true);
  });
  it("diff : crée ce qui manque, déplace seulement ce qui n'est pas commencé, annule un séjour disparu", () => {
    const desired = desiredCleanings(L, stays, "2026-11-10");
    const ex = [
      { id: "i1", source_key: "conc:s2", scheduled_date: "2026-11-11", start_time: "11:00:00", stage: "affectee", title: "Ménage — Studio République" },
      { id: "i2", source_key: "conc:gone", scheduled_date: "2026-11-15", start_time: "11:00", stage: "planifiee", title: "x" },
      { id: "i3", source_key: "conc:s3", scheduled_date: "2026-11-19", start_time: "11:00", stage: "en_cours", title: "Ménage — Studio République" }
    ];
    const r = diffCleanings(ex, desired, ["conc:gone"]);
    expect(r.insert).toEqual([]);
    expect(r.update).toEqual([{ id: "i1", patch: { scheduled_date: "2026-11-12", start_time: "11:00", title: "Ménage — Studio République" } }]);   // i3 est en cours : intouchable
    expect(r.cancel).toEqual(["i2"]);
    expect(diffCleanings([], desired, []).insert).toHaveLength(2);
    expect(diffCleanings([{ ...ex[1], stage: "terminee" }], [], ["conc:gone"]).cancel).toEqual([]);   // un ménage terminé n'est jamais annulé
  });
});

describe("commission, messages et alertes", () => {
  it("commission en % des revenus", () => { expect(commissionOf(1800, 9)).toBe(162); expect(commissionOf(1234.56, 12.5)).toBe(154.32); });
  it("messages au propriétaire : vouvoiement, signés ProClean Empire, sans promesse d'envoi", () => {
    const m = cleaningMessage("Studio République", "2026-11-12");
    expect(m.subject).toBe("Ménage effectué — Studio République");
    expect(m.body).toContain("12 novembre 2026"); expect(m.body).toMatch(/Cordialement,\nProClean Empire$/);
    const r = recapMessage("2026-10", 6, ["A", "B"], 162);
    expect(r.subject).toBe("Récapitulatif de octobre 2026"); expect(r.body).toContain("6 ménages réalisés"); expect(r.body).toContain("162,00 € HT");
    expect(recapMessage("2026-10", 1, ["A"], null).body).not.toContain("commission");
  });
  it("alertes triées par gravité, avec les vrais chiffres", () => {
    const a = buildAlerts({
      today: "2026-11-10", cleanings: [{ date: "2026-11-11", staff: false }, { date: "2026-11-12", staff: true }], departuresTomorrow: 1,
      listings: [{ name: "A", hasUrl: true, lastSyncAt: "2026-11-10T08:00:00Z", lastSyncError: null, price: 55 }, { name: "B", hasUrl: true, lastSyncAt: null, lastSyncError: "la plateforme répond 404", price: null }, { name: "C", hasUrl: false, lastSyncAt: null, lastSyncError: null, price: 40 }],
      idleOwners: [{ name: "Propriétaire X", days: 45 }]
    });
    expect(a.map((x) => x.key)).toEqual(["sans-agent", "err-B", "demain", "prix-B", "lien-C", "linge", "idle-Propriétaire X"]);
    expect(a[0].text).toBe("1 ménage des 7 prochains jours sans agent");
    expect(buildAlerts({ today: "2026-11-10", cleanings: [], departuresTomorrow: 0, listings: [], idleOwners: [] })).toEqual([]);
  });
  it("addDays traverse les fins de mois et d'année", () => { expect(addDays("2026-12-30", 3)).toBe("2027-01-02"); expect(addDays("2026-03-01", -1)).toBe("2026-02-28"); });
});

import { nightsIn, occupancy, occupancyDays, statement } from "../src/lib/concierge/plan";

describe("occupation et relevé", () => {
  const T = (id: string, a: string, b: string, cancelled = false): Stay => ({ id, listing_id: "L1", check_in: a, check_out: b, cancelled, intervention_id: null });
  it("compte les nuits : arrivée incluse, départ exclu, séjour coupé par la période", () => {
    expect(nightsIn({ check_in: "2026-11-12", check_out: "2026-11-15" }, "2026-11-01", "2026-12-01")).toBe(3);
    expect(nightsIn({ check_in: "2026-10-28", check_out: "2026-11-03" }, "2026-11-01", "2026-12-01")).toBe(2);
    expect(nightsIn({ check_in: "2026-12-30", check_out: "2027-01-04" }, "2026-12-01", "2027-01-01")).toBe(2);
    expect(nightsIn({ check_in: "2026-11-12", check_out: "2026-11-12" }, "2026-11-01", "2026-12-01")).toBe(0);
  });
  it("taux d'occupation, séjours et durée moyenne ; un séjour annulé ne compte pas", () => {
    const o = occupancy([T("a", "2026-11-02", "2026-11-05"), T("b", "2026-11-10", "2026-11-17"), T("c", "2026-11-20", "2026-11-25", true)], "2026-11-01", 30);
    expect(o).toEqual({ nights: 10, days: 30, pct: 33.3, stays: 2, avgNights: 5 });
    expect(occupancy([], "2026-11-01", 30)).toEqual({ nights: 0, days: 30, pct: 0, stays: 0, avgNights: null });
  });
  it("frise : occupé cette nuit-là, départ et arrivée le même jour repérés", () => {
    const d = occupancyDays([T("a", "2026-11-02", "2026-11-04"), T("b", "2026-11-04", "2026-11-06")], "2026-11-02", 5);
    expect(d.map((x) => [x.busy, x.out, x.in])).toEqual([[true, false, true], [true, false, false], [true, true, true], [true, false, false], [false, true, false]]);
  });
  it("relevé : commission, ménages et reste à verser", () => {
    expect(statement([{ revenue: 1800, pct: 9 }, { revenue: 600, pct: 12 }], { count: 8, amount: 440 })).toEqual({ revenue: 2400, commission: 234, cleanings: 8, cleaningsAmount: 440, net: 1726 });
    expect(statement([], { count: 0, amount: 0 }).net).toBe(0);
  });
});
