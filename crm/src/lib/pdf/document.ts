import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import type { Settings } from "../domain/types";
import { lineTotals } from "../domain/billing";
import { LOGO_PNG_BASE64, LOGO_RATIO } from "./logo";

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
  paidAmount?: number;
}

type Cfg = Pick<Settings,
  "company_name" | "company_address" | "company_phone" | "company_email" | "company_siret" | "company_vat_number" | "company_iban" |
  "company_legal_form" | "company_capital" | "company_rcs" | "company_footer" | "quote_terms" | "payment_terms_days">;

/** Les polices standard PDF ne gèrent que WinAnsi : on remplace tout le reste. */
const clean = (s: string) =>
  s.replace(/[   ]/g, " ").replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-").replace(/…/g, "...").replace(/[→➔]/g, "->").replace(/•/g, "-")
    .replace(/[^\x20-\x7E¡-ÿ€œŒ\n]/g, "?");

export const pdfMoney = (n: number) => {
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  return `${n < 0 ? "-" : ""}${int.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${dec} €`;
};
const pdfDate = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR") : "");
const pct = (n: number) => `${String(n).replace(".", ",")} %`;

const NAVY = rgb(0.078, 0.129, 0.239);
const BLUE = rgb(0.114, 0.435, 0.878);
const INK = rgb(0.1, 0.12, 0.18);
const GREY = rgb(0.42, 0.45, 0.52);
const LIGHT = rgb(0.955, 0.965, 0.98);
const LINE = rgb(0.85, 0.87, 0.91);
const WHITE = rgb(1, 1, 1);
const GREEN = rgb(0.09, 0.5, 0.3);

const W = 595.28, H = 841.89, M = 42;
const FOOTER_H = 58;

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of clean(text).split("\n")) {
    if (!para.trim()) { out.push(""); continue; }
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

export async function renderPdf(doc: PdfDoc, s: Cfg): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${doc.kind === "devis" ? "Devis" : "Facture"} ${doc.number ?? "brouillon"}`);
  pdf.setAuthor(s.company_name);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo: PDFImage = await pdf.embedPng(Buffer.from(LOGO_PNG_BASE64, "base64"));
  const isDraft = doc.number === null;
  const isQuote = doc.kind === "devis";
  const paid = doc.kind === "facture" && doc.status === "paye";

  let page!: PDFPage;
  let y = 0;
  const text = (t: string, x: number, yy: number, size = 9.5, f = font, color = INK) =>
    page.drawText(clean(t), { x, y: yy, size, font: f, color });
  const right = (t: string, xr: number, yy: number, size = 9.5, f = font, color = INK) =>
    text(t, xr - f.widthOfTextAtSize(clean(t), size), yy, size, f, color);
  const rect = (x: number, yy: number, w: number, h: number, color: any, border?: any) =>
    page.drawRectangle({ x, y: yy, width: w, height: h, color, borderColor: border, borderWidth: border ? 0.6 : 0 });

  // ── En-tête ──
  const header = (first: boolean) => {
    page = pdf.addPage([W, H]);
    if (isDraft) {
      page.drawText("BROUILLON", { x: 110, y: 320, size: 96, font: bold, color: rgb(0.93, 0.94, 0.96), rotate: { type: "degrees" as any, angle: 35 } });
    }
    if (!first) {
      text(`${isQuote ? "Devis" : "Facture"} ${doc.number ?? "(brouillon)"} - ${doc.client.name}`, M, H - 34, 9, bold, NAVY);
      page.drawLine({ start: { x: M, y: H - 42 }, end: { x: W - M, y: H - 42 }, thickness: 0.6, color: LINE });
      y = H - 62;
      return;
    }
    const lh = 66, lw = lh * LOGO_RATIO;
    page.drawImage(logo, { x: M, y: H - M - lh, width: lw, height: lh });
    let ty = H - M - 8;
    text(s.company_name, M + lw + 12, ty, 14, bold, NAVY); ty -= 14;
    for (const l of [s.company_address, s.company_phone, s.company_email].filter(Boolean) as string[]) { text(l, M + lw + 12, ty, 8.5, font, GREY); ty -= 11; }

    // Titre à droite
    right(isQuote ? "DEVIS" : "FACTURE", W - M, H - M - 12, 24, bold, NAVY);
    right(doc.number ? `N° ${doc.number}` : "Brouillon - non validé", W - M, H - M - 30, 11, bold, BLUE);
    right(`Date : ${pdfDate(doc.issueDate)}`, W - M, H - M - 46, 9);
    if (doc.dueOrValidUntil) right(`${isQuote ? "Valable jusqu'au" : "Échéance"} : ${pdfDate(doc.dueOrValidUntil)}`, W - M, H - M - 58, 9);
    if (paid) {
      rect(W - M - 82, H - M - 92, 82, 20, rgb(0.9, 0.97, 0.93), GREEN);
      right("ACQUITTÉE", W - M - 11, H - M - 86, 10, bold, GREEN);
    }

    // Bloc client (hauteur adaptée au nom et à l'adresse)
    y = H - M - 108;
    const bx = W / 2 + 10, bw = W - M - bx;
    const nameLines = wrap(doc.client.name, bold, 10.5, bw - 24).slice(0, 3);
    const addr = [doc.client.address, [doc.client.postal_code, doc.client.city].filter(Boolean).join(" "), doc.client.siret ? `SIRET ${doc.client.siret}` : ""]
      .filter((l) => l && l.trim()) as string[];
    const bh = 30 + nameLines.length * 13 + addr.length * 11 + 10;
    rect(bx, y - bh, bw, bh, LIGHT, LINE);
    text(isQuote ? "DESTINATAIRE" : "FACTURÉ À", bx + 12, y - 14, 7.5, bold, GREY);
    let cy = y - 29;
    for (const l of nameLines) { text(l, bx + 12, cy, 10.5, bold, INK); cy -= 13; }
    cy += 2;
    for (const l of addr) { text(l, bx + 12, cy, 9, font, INK); cy -= 11; }

    // Objet à gauche du bloc client
    if (doc.subject) {
      text("OBJET", M, y - 14, 7.5, bold, GREY);
      let oy = y - 29;
      for (const l of wrap(doc.subject, bold, 11, bx - M - 18).slice(0, 4)) { text(l, M, oy, 11, bold, INK); oy -= 14; }
    }
    y -= bh + 24;
  };
  header(true);

  // ── Tableau ──
  const col = { desc: M + 8, qty: 338, pu: 392, vat: 450, tot: W - M - 8 };
  const descW = col.qty - col.desc - 22;
  const tableHead = () => {
    rect(M, y - 6, W - 2 * M, 20, NAVY);
    text("Désignation", col.desc, y, 8.5, bold, WHITE);
    right("Qté", col.qty + 18, y, 8.5, bold, WHITE);
    right("P.U. HT", col.pu + 38, y, 8.5, bold, WHITE);
    right("TVA", col.vat + 28, y, 8.5, bold, WHITE);
    right("Total HT", col.tot, y, 8.5, bold, WHITE);
    y -= 24;
  };
  tableHead();
  let zebra = false;
  for (const l of doc.lines) {
    const [first, ...rest] = clean(l.description).split("\n");
    const title = wrap(first, bold, 9.5, descW);
    const detail = rest.length ? wrap(rest.join("\n"), font, 8.2, descW).filter((r, i, a) => r || (a[i - 1] && a[i + 1] !== undefined)) : [];
    const h = title.length * 12 + detail.length * 10.2 + 10;
    if (y - h < M + FOOTER_H + 24) { header(false); tableHead(); }
    if (zebra) rect(M, y - h + 10, W - 2 * M, h, LIGHT);
    zebra = !zebra;
    let ly = y;
    title.forEach((r) => { text(r, col.desc, ly, 9.5, bold, INK); ly -= 12; });
    detail.forEach((r) => { text(r, col.desc, ly, 8.2, font, GREY); ly -= 10.2; });
    const t = lineTotals(l);
    right(String(l.quantity).replace(".", ","), col.qty + 18, y, 9.5);
    right(pdfMoney(l.unit_price_ht), col.pu + 38, y, 9.5);
    right(pct(l.vat_rate), col.vat + 28, y, 9.5);
    right(pdfMoney(t.ht), col.tot, y, 9.5, bold);
    y -= h;
    page.drawLine({ start: { x: M, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 0.4, color: LINE });
  }

  // ── Totaux ──
  const need = 150;
  if (y < M + FOOTER_H + need) { header(false); }
  y -= 14;
  const byRate = new Map<number, { base: number; vat: number }>();
  for (const l of doc.lines) { const t = lineTotals(l); const r = byRate.get(l.vat_rate) ?? { base: 0, vat: 0 }; r.base += t.ht; r.vat += t.vat; byRate.set(l.vat_rate, r); }
  const tx = W - M - 215, tw = 215;
  let ty = y;
  text("Total HT", tx + 10, ty, 10); right(pdfMoney(doc.totals.ht), W - M - 10, ty, 10); ty -= 15;
  for (const [rate, v] of [...byRate.entries()].sort((a, b) => a[0] - b[0])) {
    text(`TVA ${pct(rate)} (sur ${pdfMoney(v.base)})`, tx + 10, ty, 9, font, GREY); right(pdfMoney(v.vat), W - M - 10, ty, 9, font, GREY); ty -= 14;
  }
  ty -= 4;
  rect(tx, ty - 8, tw, 24, NAVY);
  text("Total TTC", tx + 10, ty, 11.5, bold, WHITE); right(pdfMoney(doc.totals.ttc), W - M - 10, ty, 11.5, bold, WHITE);
  ty -= 26;
  if (doc.kind === "facture" && (doc.paidAmount ?? 0) > 0) {
    text("Déjà réglé", tx + 10, ty, 9.5, font, GREEN); right(`- ${pdfMoney(doc.paidAmount!)}`, W - M - 10, ty, 9.5, font, GREEN); ty -= 15;
    text("Reste à payer", tx + 10, ty, 10.5, bold); right(pdfMoney(Math.max(0, doc.totals.ttc - doc.paidAmount!)), W - M - 10, ty, 10.5, bold); ty -= 15;
  }

  // ── Conditions (à gauche des totaux) ──
  let cy = y;
  const condW = tx - M - 16;
  text("CONDITIONS", M, cy, 7.5, bold, GREY); cy -= 13;
  const conditions: string[] = [];
  if (isQuote) {
    conditions.push(s.quote_terms || "Devis valable 30 jours. Aucun escompte pour paiement anticipé.");
  } else {
    conditions.push(`Règlement par virement sous ${s.payment_terms_days} jours${doc.dueOrValidUntil ? `, avant le ${pdfDate(doc.dueOrValidUntil)}` : ""}.`);
    if (s.company_iban) conditions.push(`IBAN : ${s.company_iban}`);
    conditions.push("Pénalités de retard : 3 fois le taux d'intérêt légal. Indemnité forfaitaire de recouvrement : 40 €. Pas d'escompte pour paiement anticipé.");
  }
  if (doc.notes) conditions.push(doc.notes);
  for (const c of conditions) for (const r of wrap(c, font, 8.5, condW)) { text(r, M, cy, 8.5, font, INK); cy -= 11; }

  y = Math.min(ty, cy) - 22;

  // ── Signature (devis) ──
  if (isQuote) {
    if (y < M + FOOTER_H + 92) { header(false); y -= 6; }
    rect(M, y - 78, 250, 78, WHITE, LINE);
    text("BON POUR ACCORD", M + 12, y - 15, 7.5, bold, GREY);
    text("Date, signature et mention « lu et approuvé »", M + 12, y - 28, 8, font, GREY);
    rect(W - M - 250, y - 78, 250, 78, WHITE, LINE);
    text(`POUR ${s.company_name.toUpperCase()}`, W - M - 238, y - 15, 7.5, bold, GREY);
  }

  // ── Pied de page + pagination sur chaque page ──
  const legal = clean(s.company_footer?.trim() || [
    s.company_name,
    [s.company_legal_form, s.company_capital ? `au capital de ${s.company_capital}` : ""].filter(Boolean).join(" "),
    s.company_rcs, s.company_siret ? `SIRET ${s.company_siret}` : "", s.company_vat_number ? `TVA ${s.company_vat_number}` : "",
    s.company_address, s.company_phone, s.company_email
  ].filter(Boolean).join(" - "));
  const pages = pdf.getPages();
  pages.forEach((pg, i) => {
    pg.drawLine({ start: { x: M, y: M + 40 }, end: { x: W - M, y: M + 40 }, thickness: 0.6, color: LINE });
    let fy = M + 28;
    for (const r of wrap(legal, font, 7.2, W - 2 * M - 40).slice(0, 3)) {
      pg.drawText(r, { x: M, y: fy, size: 7.2, font, color: GREY }); fy -= 9;
    }
    const label = `Page ${i + 1} / ${pages.length}`;
    pg.drawText(label, { x: W - M - font.widthOfTextAtSize(label, 7.5), y: M + 28, size: 7.5, font, color: GREY });
  });

  return pdf.save();
}
