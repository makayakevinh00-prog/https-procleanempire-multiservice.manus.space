import { describe, it, expect } from "vitest";
import { renderPdf, pdfMoney } from "@/lib/pdf/document";
import type { Settings } from "@/lib/domain/types";

const settings = { company_name: "ProClean Empire", company_address: "1 rue Test", company_phone: null, company_email: "contact@procleanempire.com",
  company_siret: null, company_vat_number: null, company_iban: "FR76 0000" } as Settings;

describe("PDF", () => {
  it("formate les montants sans espace insécable", () => expect(pdfMoney(1234.5)).toBe("1 234,50 €"));
  it("génère un PDF valide (accents, €, caractères exotiques, plusieurs pages)", async () => {
    const lines = Array.from({ length: 60 }, (_, i) => ({ description: `Prestation n°${i} — décontamination “balcon” → très long libellé `.repeat(2), quantity: 1.5, unit_price_ht: 129.17, vat_rate: 20 }));
    const bytes = await renderPdf({
      kind: "facture", number: null, status: "brouillon", issueDate: "2026-10-27", dueOrValidUntil: "2026-11-26", subject: "Œuvre",
      notes: "Note", client: { name: "Ahmed El Youssfi", address: "Paris", postal_code: "75016", city: "Paris", siret: null, email: null },
      lines, totals: { ht: 100, vat: 20, ttc: 120 }
    }, settings);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(2000);
  });
});
