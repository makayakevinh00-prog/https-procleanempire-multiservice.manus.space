import { describe, expect, it } from "vitest";
import { parsePeriod, quarterOf, safeFileName } from "@/lib/compta/period";
import { buildFec, FEC_HEADER } from "@/lib/compta/fec";

describe("périodes comptables", () => {
  it("lit un mois, un trimestre et une année", () => {
    expect(parsePeriod("2026-03")?.months).toEqual(["2026-03"]);
    expect(parsePeriod("2026-T2")?.months).toEqual(["2026-04", "2026-05", "2026-06"]);
    expect(parsePeriod("2026")?.months).toHaveLength(12);
  });
  it("refuse le reste", () => {
    for (const x of ["", "2026-13", "2026-T5", "26", "../x", "2026-03; drop"]) expect(parsePeriod(x)).toBeNull();
    expect(parsePeriod(null)).toBeNull();
  });
  it("trouve le trimestre d'un mois", () => {
    expect(quarterOf("2026-11")).toBe("2026-T4");
    expect(quarterOf("2026-01")).toBe("2026-T1");
  });
  it("nettoie les noms de fichiers", () => {
    expect(safeFileName("Facture été ../é.pdf")).toBe("Facture-ete-..-e.pdf");
    expect(safeFileName("///")).toBe("justificatif");
  });
});

describe("FEC partiel", () => {
  const inv = [{ number: "F-2026-001", issue_date: "2026-03-05", status: "paye", total_ht: 100, total_vat: 20, total_ttc: 120, client: "Acme SARL" },
    { number: "F-2026-002", issue_date: "2026-03-06", status: "annule", total_ht: 50, total_vat: 10, total_ttc: 60, client: "Acme SARL" }];
  const pay = [{ received_at: "2026-03-10T09:00:00Z", amount: 120, counterparty: "ACME", label: "vir", invoice: "F-2026-001" }];
  const out = buildFec(inv, pay, new Map([["F-2026-001", "Acme SARL"]]));
  const rows = out.replace(/\r\n$/, "").split("\r\n").map((r) => r.split("\t"));
  it("a 18 colonnes partout et l'en-tête officiel", () => {
    expect(rows[0]).toEqual(FEC_HEADER);
    expect(rows.every((r) => r.length === 18)).toBe(true);
  });
  it("ignore les factures annulées et équilibre chaque écriture", () => {
    expect(out).not.toContain("F-2026-002");
    const byNum = new Map<string, number>();
    for (const r of rows.slice(1)) byNum.set(r[2], (byNum.get(r[2]) ?? 0) + Number(r[11].replace(",", ".")) - Number(r[12].replace(",", ".")));
    for (const v of byNum.values()) expect(Math.abs(v)).toBeLessThan(0.005);
    expect(rows[1][3]).toBe("20260305");
    expect(rows[1][11]).toBe("120,00");
  });
});
