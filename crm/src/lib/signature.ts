import { createHash, randomBytes } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** Lien secret : 64 caractères hexadécimaux, impossibles à deviner. */
export const newSignatureToken = () => randomBytes(32).toString("hex");
export const isSignatureToken = (t: unknown): t is string => typeof t === "string" && /^[0-9a-f]{64}$/.test(t);
export const sha256Hex = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
export const SIGNATURE_VALID_DAYS = 30;

/** Signature dessinée : uniquement une image PNG en base64, de taille raisonnable. */
export function parseSignaturePng(dataUrl: unknown): Uint8Array | null {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png;base64,") || dataUrl.length > 300_000) return null;
  const b = Buffer.from(dataUrl.slice(22), "base64");
  return b.length > 60 && b[0] === 0x89 && b[1] === 0x50 ? new Uint8Array(b) : null;
}

const paris = (d: Date) => d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "medium" });
const clean = (s: string) => s.replace(/[^\x20-\x7E -ÿ]/g, "?");

/** Document signé : le PDF d'origine, intact, suivi d'une page de certificat (signataire, date, adresse IP, empreinte du document d'origine, signature dessinée). */
export async function stampSigned(original: Uint8Array, a: { docNumber: string; docHash: string; name: string; email: string; ip: string; ua: string; at: Date; png: Uint8Array; company: string }): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(original);
  const page = pdf.addPage([595, 842]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold), font = await pdf.embedFont(StandardFonts.Helvetica);
  let y = 780;
  const line = (t: string, o: { b?: boolean; size?: number; gap?: number } = {}) => { page.drawText(clean(t), { x: 50, y, size: o.size ?? 11, font: o.b ? bold : font, color: rgb(0.08, 0.13, 0.24), maxWidth: 495 }); y -= o.gap ?? 20; };
  line("Certificat de signature électronique", { b: true, size: 18, gap: 34 });
  line(`Document : ${a.docNumber}`, { b: true });
  line(`Émetteur : ${a.company}`);
  line(`Signataire : ${a.name} <${a.email}>`);
  line(`Signé le : ${paris(a.at)} (heure de Paris)`);
  line(`Adresse IP : ${a.ip}`);
  line(`Navigateur : ${a.ua.slice(0, 90)}`, { gap: 30 });
  line("Empreinte SHA-256 du document d'origine :", { b: true, gap: 16 });
  line(a.docHash.slice(0, 32), { size: 10, gap: 14 });
  line(a.docHash.slice(32), { size: 10, gap: 30 });
  line("Signature :", { b: true, gap: 10 });
  const img = await pdf.embedPng(a.png), w = Math.min(260, img.width), h = (img.height / img.width) * w;
  page.drawRectangle({ x: 50, y: y - h - 6, width: w + 12, height: h + 12, borderColor: rgb(0.8, 0.82, 0.87), borderWidth: 1 });
  page.drawImage(img, { x: 56, y: y - h, width: w, height: h });
  y -= h + 40;
  page.drawText(clean("Le signataire a lu le document, coché « Lu et approuvé » et signé en ligne. Signature électronique simple au sens du règlement"), { x: 50, y, size: 9, font, color: rgb(0.36, 0.4, 0.46) });
  page.drawText(clean("européen eIDAS (UE n° 910/2014). Toute modification du document d'origine change son empreinte."), { x: 50, y: y - 12, size: 9, font, color: rgb(0.36, 0.4, 0.46) });
  return await pdf.save();
}
