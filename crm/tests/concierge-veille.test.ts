import { describe, it, expect } from "vitest";
import { expectedRevenue, marketAverage, occupancy, priceAdvice, priceOn, reviewSummary, type PricePeriod } from "@/lib/concierge/veille";

const period = (o: Partial<PricePeriod>): PricePeriod => ({ id: "p", label: "Saison", start_date: "2026-12-01", end_date: "2026-12-31", price: 90, min_nights: null, note: null, ...o });

describe("veille d'un logement", () => {
  it("prix du jour : la période la plus courte l'emporte, sinon le prix de base", () => {
    const ps = [period({}), period({ id: "n", label: "Nouvel An", start_date: "2026-12-30", end_date: "2026-12-31", price: 150 })];
    expect(priceOn("2026-12-10", ps, 70)).toEqual({ price: 90, label: "Saison" });
    expect(priceOn("2026-12-31", ps, 70)).toEqual({ price: 150, label: "Nouvel An" });
    expect(priceOn("2026-11-20", ps, 70)).toEqual({ price: 70, label: "prix de base" });
    expect(priceOn("2026-11-20", ps, null).price).toBeNull();
  });
  it("occupation : la nuit du départ ne compte pas, les annulations non plus", () => {
    const stays = [{ check_in: "2026-11-16", check_out: "2026-11-19", cancelled: false }, { check_in: "2026-11-20", check_out: "2026-11-25", cancelled: true }];
    expect(occupancy(stays, "2026-11-15", 10)).toEqual({ nights: 3, days: 10, pct: 30 });
    expect(expectedRevenue(stays, [], 60, "2026-11-15", 10)).toBe(180);
  });
  it("marché : moyenne des relevés récents seulement", () => {
    expect(marketAverage([{ seen_on: "2026-11-10", price: 80 }, { seen_on: "2026-11-12", price: 100 }, { seen_on: "2026-06-01", price: 300 }], "2026-11-15")).toEqual({ avg: 90, count: 2 });
    expect(marketAverage([], "2026-11-15")).toEqual({ avg: null, count: 0 });
  });
  it("avis : note moyenne et sujets des avis faibles", () => {
    const s = reviewSummary([{ rating: 5, topics: ["proprete"] }, { rating: 3, topics: ["bruit", "literie"] }, { rating: 2, topics: ["bruit"] }, { rating: null, topics: ["bruit"] }]);
    expect(s.avg).toBe(3.3); expect(s.count).toBe(4);
    expect(s.weak).toEqual([{ topic: "bruit", count: 2 }, { topic: "literie", count: 1 }]);
  });
  it("conseil de prix : hausse si plein, baisse si vide et cher, sinon rien", () => {
    expect(priceAdvice({ price: 80, occupancyPct: 90, marketAvg: 100 }).tone).toBe("hausse");
    expect(priceAdvice({ price: 130, occupancyPct: 20, marketAvg: 100 }).tone).toBe("baisse");
    expect(priceAdvice({ price: 100, occupancyPct: 20, marketAvg: 100 }).text).toMatch(/annonce/);
    expect(priceAdvice({ price: 100, occupancyPct: 60, marketAvg: 100 }).tone).toBe("ok");
    expect(priceAdvice({ price: null, occupancyPct: 60, marketAvg: 100 }).tone).toBe("info");
  });
});
