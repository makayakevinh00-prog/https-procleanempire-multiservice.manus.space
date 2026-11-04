import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { renderPdf, pdfMoney, type PdfDoc } from "@/lib/pdf/document";

const settings: any = {
  company_name: "ProClean Empire", company_address: "3 rue Stéphane Charbonnier, 95300 Pontoise", company_phone: "06 17 21 22 30",
  company_email: "contact@procleanempire.com", company_siret: "106 602 659 00018", company_vat_number: null, company_iban: "FR76 1695 8000 0162 8198 8735 439",
  company_legal_form: "SASU", company_capital: "1 000,00 €", company_rcs: "RCS Pontoise 106 602 659", company_footer: null,
  quote_terms: "Devis valable 30 jours. Règlement à 30 jours par virement. Aucun escompte pour paiement anticipé.", payment_terms_days: 30
};
const client = { name: "SEA SOCIETE D'EXPLOITATION AUTOMOBILE", address: "6 Rue d'Armaillé", postal_code: "75017", city: "Paris", siret: "30265423100026", email: "a@b.fr" };
const base = (o: Partial<PdfDoc> = {}): PdfDoc => ({
  kind: "devis", number: "DEV-111", status: "brouillon", issueDate: "2026-11-04", dueOrValidUntil: "2026-12-04", subject: "Entretien des locaux — garage & bureaux", notes: null, client,
  lines: [
    { description: "Entretien mensuel des bureaux\nDeux passages hebdomadaires (mercredi et samedi) : bureau de direction, autres bureaux et zones de circulation. Produits et matériel inclus.", quantity: 1, unit_price_ht: 600, vat_rate: 20 },
    { description: "Nettoyage des vitres", quantity: 2, unit_price_ht: 45.5, vat_rate: 20 }
  ],
  totals: { ht: 691, vat: 138.2, ttc: 829.2 }, ...o
});

describe("PDF", () => {
  it("formate les montants sans espace insécable", () => expect(pdfMoney(1234.5)).toBe("1 234,50 €"));
  it("génère un devis valide", async () => {
    const bytes = await renderPdf(base(), settings);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    mkdirSync(process.env.PDF_OUT ?? "/tmp", { recursive: true });
    if (process.env.PDF_OUT) writeFileSync(`${process.env.PDF_OUT}/devis.pdf`, bytes);
  });
  it("génère une facture réglée partiellement, plusieurs TVA, et une facture longue sur plusieurs pages", async () => {
    const lines = Array.from({ length: 45 }, (_, i) => ({ description: `Prestation n°${i} — décontamination “balcon” → très long libellé exemple\nDétail ${i} `.repeat(2), quantity: 1.5, unit_price_ht: 129.17, vat_rate: i % 7 === 0 ? 0 : 20 }));
    const bytes = await renderPdf(base({ kind: "facture", number: "F-2026-001", status: "paye", paidAmount: 100, lines, totals: { ht: 6000, vat: 1000, ttc: 7000 } }), settings);
    expect(bytes.length).toBeGreaterThan(5000);
    if (process.env.PDF_OUT) writeFileSync(`${process.env.PDF_OUT}/facture.pdf`, bytes);
  });
  it("accepte un brouillon", async () => {
    const bytes = await renderPdf(base({ kind: "facture", number: null }), settings);
    expect(bytes.length).toBeGreaterThan(2000);
  });
});
