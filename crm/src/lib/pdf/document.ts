import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Settings } from "../domain/types";
import { lineTotals } from "../domain/billing";

export interface PdfDoc {
  kind: "devis" | "facture";
  number: string | null; // null = brouillon
  status: string;
  issueDate: string;
  dueOrValidUntil: string | null;
  subject: string | null;
  notes: string | null;
  client: { name: string; address: string | null; postal_code: string | null; city: string | null; siret: string | null; email: string | null };
  lines: { description: string; quantity: number; unit_price_ht: number; vat_rate: number }[];
  totals: { ht: number; vat: number; ttc: number };
}

/** Les polices standard PDF ne gèrent que WinAnsi : on remplace tout le reste. */
const clean = (s: string) =>
  s.replace(/[   ]/g, " ").replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-").replace(/…/g, "...").replace(/[^\x20-\x7E¡-ÿ€œŒ]/g, "?");

export const pdfMoney = (n: number) => {
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  return `${n < 0 ? "-" : ""}${int.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${dec} €`;
};
const pdfDate = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR") : "");

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of clean(text).split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) line = test;
      else { if (line) out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}

export async function renderPdf(doc: PdfDoc, s: Settings): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 44;
  const ink = rgb(0.07, 0.1, 0.2), grey = rgb(0.4, 0.43, 0.5), brand = rgb(0.08, 0.35, 0.75);
  const isDraft = doc.number === null;

  let page!: PDFPage;
  let y = 0;
  const text = (t: string, x: number, yy: number, size = 9.5, f = font, color = ink) =>
    page.drawText(clean(t), { x, y: yy, size, font: f, color });
  const right = (t: string, xr: number, yy: number, size = 9.5, f = font) =>
    text(t, xr - f.widthOfTextAtSize(clean(t), size), yy, size, f);

  const newPage = () => {
    page = pdf.addPage([W, H]);
    y = H - M;
    if (isDraft) {
      page.drawText("BROUILLON", { x: 120, y: 330, size: 90, font: bold, color: rgb(0.9, 0.9, 0.92), rotate: { type: "degrees" as any, angle: 35 } });
    }
  };
  newPage();

  // En-tête société
  text(s.company_name, M, y, 16, bold, brand);
  y -= 15;
  for (const l of [s.company_address, s.company_phone, s.company_email,
    s.company_siret ? `SIRET ${s.company_siret}` : null, s.company_vat_number ? `TVA ${s.company_vat_number}` : null].filter(Boolean) as string[]) {
    text(l, M, y, 8.5, font, grey); y -= 11;
  }

  // Titre
  const title = doc.kind === "devis" ? "DEVIS" : "FACTURE";
  right(title, W - M, H - M, 20, bold);
  right(doc.number ?? "Brouillon - non validée", W - M, H - M - 18, 11, bold);
  right(`Date : ${pdfDate(doc.issueDate)}`, W - M, H - M - 33, 9);
  if (doc.dueOrValidUntil) right(`${doc.kind === "devis" ? "Valable jusqu'au" : "Échéance"} : ${pdfDate(doc.dueOrValidUntil)}`, W - M, H - M - 45, 9);

  // Client
  y = Math.min(y, H - M - 60) - 14;
  page.drawRectangle({ x: W / 2, y: y - 62, width: W / 2 - M, height: 72, color: rgb(0.96, 0.97, 0.98) });
  text("Client", W / 2 + 10, y - 2, 8, font, grey);
  text(doc.client.name, W / 2 + 10, y - 15, 11, bold);
  let cy = y - 28;
  for (const l of [doc.client.address, [doc.client.postal_code, doc.client.city].filter(Boolean).join(" "), doc.client.siret ? `SIRET ${doc.client.siret}` : ""]) {
    if (l) { text(l, W / 2 + 10, cy, 9); cy -= 11; }
  }
  y -= 90;

  if (doc.subject) { text(`Objet : ${doc.subject}`, M, y, 10.5, bold); y -= 22; }

  // Tableau
  const cols = { desc: M, qty: 335, pu: 405, vat: 455, tot: W - M };
  const header = () => {
    page.drawRectangle({ x: M - 4, y: y - 5, width: W - 2 * M + 8, height: 18, color: brand });
    const white = rgb(1, 1, 1);
    text("Désignation", cols.desc, y, 8.5, bold, white);
    text("Qté", cols.qty - 10, y, 8.5, bold, white);
    text("PU HT", cols.pu - 8, y, 8.5, bold, white);
    text("TVA", cols.vat, y, 8.5, bold, white);
    right("Total HT", cols.tot, y, 8.5, bold);
    y -= 20;
  };
  header();
  for (const l of doc.lines) {
    const rows = wrap(l.description, font, 9.5, cols.qty - cols.desc - 24);
    if (y - rows.length * 12 < M + 140) { newPage(); header(); }
    rows.forEach((r, i) => text(r, cols.desc, y - i * 12, 9.5));
    text(String(l.quantity).replace(".", ","), cols.qty - 10, y, 9.5);
    text(pdfMoney(l.unit_price_ht), cols.pu - 8, y, 9.5);
    text(`${l.vat_rate}%`.replace(".", ","), cols.vat, y, 9.5);
    right(pdfMoney(lineTotals(l).ht), cols.tot, y, 9.5);
    y -= rows.length * 12 + 6;
    page.drawLine({ start: { x: M, y: y + 3 }, end: { x: W - M, y: y + 3 }, thickness: 0.4, color: rgb(0.87, 0.89, 0.92) });
  }

  // Totaux
  if (y < M + 150) newPage();
  y -= 8;
  const tx = W - M - 190;
  text("Total HT", tx, y, 10); right(pdfMoney(doc.totals.ht), W - M, y, 10); y -= 15;
  text("TVA", tx, y, 10); right(pdfMoney(doc.totals.vat), W - M, y, 10); y -= 17;
  page.drawRectangle({ x: tx - 6, y: y - 6, width: 190 + 6, height: 20, color: rgb(0.93, 0.95, 0.99) });
  text("Total TTC", tx, y, 11.5, bold); right(pdfMoney(doc.totals.ttc), W - M, y, 11.5, bold);
  y -= 34;

  if (doc.notes) {
    for (const r of wrap(doc.notes, font, 9, W - 2 * M)) { text(r, M, y, 9, font, grey); y -= 11; }
    y -= 6;
  }

  // Pied de page
  const foot: string[] = [];
  if (doc.kind === "facture") {
    if (s.company_iban) foot.push(`Règlement par virement - IBAN : ${s.company_iban}`);
    foot.push("Pénalités de retard : 3 fois le taux d'intérêt légal. Indemnité forfaitaire de recouvrement en cas de retard : 40 €. Pas d'escompte pour paiement anticipé.");
  } else {
    foot.push("Devis valable sous réserve d'acceptation. Bon pour accord : date, signature et mention « lu et approuvé ».");
  }
  let fy = M + 12 * foot.reduce((a, f) => a + wrap(f, font, 8, W - 2 * M).length, 0);
  for (const f of foot) for (const r of wrap(f, font, 8, W - 2 * M)) { text(r, M, fy, 8, font, grey); fy -= 11; }

  return pdf.save();
}
