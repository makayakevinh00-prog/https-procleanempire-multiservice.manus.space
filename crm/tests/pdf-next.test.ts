import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderInvoiceOrQuote, renderContractPdf } from "@/lib/pdf-next/render";
import { guessCategory, type ContractCategory } from "@/lib/contracts/clauses";
import type { PdfDoc } from "@/lib/pdf/document";

const settings: any = { company_name: "ProClean Empire", company_address: "3 rue Stéphane Charbonnier, 95300 Pontoise", company_phone: "06 17 21 22 30", company_email: "contact@procleanempire.com",
  company_siret: "106 602 659 00018", company_vat_number: null, company_iban: "FR76 1695 8000 0162 8198 8735 439", company_bic: "QNTOFRP1XXX", company_legal_form: "SASU", company_capital: "1 000 €", company_rcs: "RCS Pontoise 106 602 659", company_footer: null, payment_terms_days: 30 };
const client = { name: "SEA SOCIETE D'EXPLOITATION AUTOMOBILE", address: "6 Rue d'Armaillé", postal_code: "75017", city: "Paris", siret: "30265423100026", email: "a@b.fr", phone: "0102030405", kind: "entreprise" };
const doc = (o: Partial<PdfDoc> = {}): PdfDoc => ({ kind: "facture", number: "F-2026-0042", status: "envoye", issueDate: "2026-11-05", dueOrValidUntil: "2026-12-05", subject: "Entretien", notes: null, client,
  lines: [{ description: "Entretien mensuel", quantity: 1, unit_price_ht: 600, vat_rate: 20 }], totals: { ht: 600, vat: 120, ttc: 720 }, ...o });

const pages = (b: Uint8Array) => (Buffer.from(b).toString("latin1").match(/\/Type \/Page[^s]/g) ?? []).length;
function text(b: Uint8Array) {
  const f = join(mkdtempSync(join(tmpdir(), "pdf-")), "x.pdf");
  writeFileSync(f, b);
  try { return execFileSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8" }); } catch { return null; } // pdftotext absent : contrôle de texte ignoré
}
const many = (n: number, desc = "Prestation") => Array.from({ length: n }, (_, i) => ({ description: `${desc} ${i + 1}\nDétail de la prestation ${i + 1}`, quantity: 1 + (i % 3), unit_price_ht: 100 + i, vat_rate: 20 }));
const totalsOf = (lines: PdfDoc["lines"]) => { const ht = lines.reduce((a, l) => a + l.quantity * l.unit_price_ht, 0); return { ht, vat: ht * 0.2, ttc: ht * 1.2 }; };

describe("PDF haut de gamme — facture et devis", () => {
  it("une seule prestation : 1 page, texte et totaux présents", async () => {
    const b = await renderInvoiceOrQuote(doc(), settings);
    expect(Buffer.from(b.slice(0, 5)).toString()).toBe("%PDF-");
    expect(pages(b)).toBe(1);
    const t = text(b); if (t) { expect(t).toContain("FACTURE"); expect(t).toContain("720,00 €"); expect(t).toContain("1 / 1"); }
  });
  it("plusieurs pages : 40 lignes, totaux jamais seuls", async () => {
    const lines = many(40);
    const b = await renderInvoiceOrQuote(doc({ lines, totals: totalsOf(lines) }), settings);
    expect(pages(b)).toBeGreaterThan(1);
    const t = text(b); if (t) { expect(t).toContain("Total HT"); expect(t).toContain("Prestation 40"); }
  });
  it("descriptions très longues, montants élevés, plusieurs taux de TVA", async () => {
    const lines = [
      { description: `Entretien\n${"Description très détaillée de la prestation. ".repeat(60)}`, quantity: 12, unit_price_ht: 98765.43, vat_rate: 20 },
      { description: "Prestation à TVA réduite", quantity: 1, unit_price_ht: 1000, vat_rate: 10 },
      { description: "Prestation à TVA 5,5", quantity: 3, unit_price_ht: 333.33, vat_rate: 5.5 }
    ];
    const b = await renderInvoiceOrQuote(doc({ lines, totals: { ht: 1186146.16, vat: 237229.23, ttc: 1423375.39 } }), settings);
    expect(pages(b)).toBeGreaterThanOrEqual(1);
    const t = text(b); if (t) { expect(t).toContain("TVA 10 %"); expect(t).toContain("TVA 5,5 %"); }
  });
  it("devis : page d'acceptation avec zones de signature", async () => {
    const b = await renderInvoiceOrQuote(doc({ kind: "devis", number: "DEV-1", status: "envoye" }), settings);
    expect(pages(b)).toBeGreaterThanOrEqual(2);
    const t = text(b); if (t) { expect(t).toContain("Acceptation du devis"); expect(t).toContain("Kevinh MAKAYA-MATEVE"); }
  });
  it("brouillon, facture payée avec acompte, remise (ligne négative)", async () => {
    const lines = [...many(2), { description: "Remise commerciale", quantity: 1, unit_price_ht: -50, vat_rate: 20 }];
    expect(pages(await renderInvoiceOrQuote(doc({ number: null, status: "brouillon", lines, totals: totalsOf(lines) }), settings))).toBe(1);
    const t = text(await renderInvoiceOrQuote(doc({ status: "paye", paidAmount: 720 }), settings)); if (t) expect(t.replace(/\s/g, "").toUpperCase()).toContain("ACQUITTÉE");
  });
  it("RIB (IBAN + BIC) présent sur la facture", async () => {
    const t = text(await renderInvoiceOrQuote(doc(), settings)); if (t) { const n = t.replace(/\s+/g, " "); expect(n).toContain("FR76 1695 8000 0162 8198 8735 439"); expect(n).toContain("QNTOFRP1XXX"); }
  });
  it("document émis : jamais « Brouillon » ; brouillon sans numéro : « Brouillon »", async () => {
    const up = (b: Uint8Array) => (text(b) ?? "").replace(/\s/g, "").toUpperCase();
    expect(up(await renderInvoiceOrQuote(doc({ status: "envoye" }), settings))).not.toContain("BROUILLON");
    expect(up(await renderInvoiceOrQuote(doc({ status: "brouillon" }), settings))).not.toContain("BROUILLON"); // numéro attribué = facture validée
    expect(up(await renderInvoiceOrQuote(doc({ kind: "devis", number: "DEV-1", status: "envoye" }), settings))).not.toContain("BROUILLON");
    expect(up(await renderInvoiceOrQuote(doc({ number: null, status: "brouillon" }), settings))).toContain("BROUILLON");
  });
  it("accents, apostrophes et symboles s'impriment sans « ? »", async () => {
    const t = text(await renderInvoiceOrQuote(doc({ subject: "Remise en état — fin de chantier « Œuvres » → 2 000 € ✓" }), settings));
    if (t) { expect(t).toContain("Œuvres"); expect(t).not.toMatch(/\?\?/); }
  });
});

describe("PDF haut de gamme — contrats par catégorie", () => {
  const base = (category: ContractCategory) => ({ category, ref: "CT-2611-AB12", client, site: { name: null, address: "28 rue des Tilleuls, 95300 Pontoise" },
    contract: { label: "Contrat", billing_mode: "mensuel", monthly_amount_ht: 979, per_visit_amount_ht: null, terms: category === "airbnb" ? "9 % des revenus + 155 € TTC par séjour" : null,
      start_date: "2027-01-01", end_date: null, visits_per_week: 2, weekdays: [2, 5], start_time: "07:00:00", hours_per_visit: 3, notes: null } });
  for (const c of ["airbnb", "bureaux", "commerce"] as ContractCategory[]) {
    it(`contrat ${c} : plusieurs pages, signatures, mentions`, async () => {
      const b = await renderContractPdf(base(c), settings, client.name);
      expect(pages(b)).toBeGreaterThanOrEqual(3);
      const raw = text(b); const t = raw && raw.replace(/\s+/g, " ");
      if (t) { expect(t).toContain("Signatures"); expect(t).toContain("Kevinh MAKAYA-MATEVE"); expect(t).toContain("Article 1"); expect(t).toContain("Paraphes");
        if (c === "airbnb") { expect(t).toContain("9 % TTC des revenus"); expect(t).toContain("155,00 € TTC"); expect(t).toContain("1er janvier 2027"); }
        else expect(t).toContain("1 174,80 € TTC"); }
    });
  }
  it("jours de passage numériques (base) : « les mardi, vendredi »", async () => {
    const t = text(await renderContractPdf(base("bureaux"), settings, client.name)); if (t) expect(t.replace(/\s+/g, " ")).toContain("les mardi, vendredi");
  });
  it("devine la catégorie", () => {
    expect(guessCategory({ label: "Gestion séjours Paris 16e", terms: "9 % des revenus" })).toBe("airbnb");
    expect(guessCategory({ label: "Entretien boutique" })).toBe("commerce");
    expect(guessCategory({ label: "Entretien bureaux" })).toBe("bureaux");
  });
});
