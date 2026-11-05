import { writeFileSync } from "node:fs";
import { renderInvoiceOrQuote, renderContractPdf } from "../src/lib/pdf-next/render";
import { CATEGORY_LABEL, type ContractCategory } from "../src/lib/contracts/clauses";

/** Génère des exemples (données fictives) : ./scripts/render-mockups.sh <dossier> */
const out = process.argv[2] ?? "/tmp";
const settings = { company_name: "ProClean Empire", company_address: "3 rue Stéphane Charbonnier, 95300 Pontoise", company_phone: "06 17 21 22 30", company_email: "contact@procleanempire.com", company_siret: "106 602 659 00018", company_vat_number: null, company_iban: "FR76 XXXX XXXX XXXX XXXX XXXX XXX", company_legal_form: "SASU", company_capital: "1 000 €", company_rcs: "RCS Pontoise 106 602 659", company_footer: null, payment_terms_days: 30 };
const client = { name: "Résidence Les Jardins de l'Oise", address: "12 avenue de la République", postal_code: "95000", city: "Cergy", siret: "512 345 678 00021", email: "s.martin@syndic-oise.fr", phone: "01 30 00 00 00", kind: "entreprise" };
const lines = [
  { description: "Entretien des parties communes\nHalls, escaliers, ascenseurs — bâtiments A et B", quantity: 12, unit_price_ht: 145, vat_rate: 20 },
  { description: "Nettoyage de la vitrerie\nVitres du hall et cages d'escalier, intérieur", quantity: 1, unit_price_ht: 220, vat_rate: 20 },
  { description: "Évacuation des encombrants", quantity: 1, unit_price_ht: 160, vat_rate: 20 }
];
const totals = { ht: 2120, vat: 424, ttc: 2544 };
(async () => {
  writeFileSync(`${out}/facture.pdf`, await renderInvoiceOrQuote({ kind: "facture", number: "F-2026-0042", status: "envoye", issueDate: "2026-11-05", dueOrValidUntil: "2026-12-05", subject: "Entretien d'octobre 2026", notes: null, client, lines, totals, paidAmount: 500 }, settings));
  writeFileSync(`${out}/devis.pdf`, await renderInvoiceOrQuote({ kind: "devis", number: "D-2026-0017", status: "envoye", issueDate: "2026-11-05", dueOrValidUntil: "2026-12-05", subject: "Entretien de votre résidence", notes: null, client, lines, totals }, settings));
  for (const category of ["airbnb", "bureaux", "commerce"] as ContractCategory[]) {
    writeFileSync(`${out}/contrat-${category}.pdf`, await renderContractPdf({ category, ref: "CT-2611-AB12", client, site: { name: null, address: "28 rue des Tilleuls, 95300 Pontoise" },
      contract: { label: CATEGORY_LABEL[category], billing_mode: "mensuel", monthly_amount_ht: 979, per_visit_amount_ht: null, terms: category === "airbnb" ? "9 % des revenus + 155 € TTC par séjour" : null, start_date: "2027-01-01", end_date: null, visits_per_week: 2, weekdays: ["mar", "ven"], start_time: "07:00:00", hours_per_visit: 3, notes: null } }, settings, client.name));
  }
  console.log("ok");
})();
