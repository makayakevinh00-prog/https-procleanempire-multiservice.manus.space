import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { isSignatureToken, newSignatureToken, parseSignaturePng, sha256Hex, stampSigned } from "../src/lib/signature";
import { signatureDoneEmail, signatureRequestEmail, quoteEmail } from "../src/lib/mail-templates";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("signature électronique", () => {
  it("le lien secret fait 64 caractères hexadécimaux et ne se devine pas", () => {
    const a = newSignatureToken(), b = newSignatureToken();
    expect(isSignatureToken(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(isSignatureToken("abc")).toBe(false);
    expect(isSignatureToken(`${"g".repeat(64)}`)).toBe(false);
  });
  it("n'accepte qu'une image PNG en base64 pour la signature", () => {
    expect(parseSignaturePng(`data:image/png;base64,${PNG}`)).not.toBeNull();
    expect(parseSignaturePng("data:image/jpeg;base64,AAAA")).toBeNull();
    expect(parseSignaturePng(`data:image/png;base64,${"A".repeat(400_000)}`)).toBeNull();
    expect(parseSignaturePng("n'importe quoi")).toBeNull();
  });
  it("le document signé garde les pages d'origine et ajoute le certificat", async () => {
    const src = await PDFDocument.create(); src.addPage([595, 842]); src.addPage([595, 842]);
    const original = await src.save();
    const signed = await stampSigned(original, { docNumber: "D-2611-001", docHash: sha256Hex(original), name: "Élodie Martin", email: "client@example.com", ip: "203.0.113.5", ua: "Mozilla/5.0", at: new Date("2026-11-16T10:00:00Z"), png: parseSignaturePng(`data:image/png;base64,${PNG}`)!, company: "ProClean Empire" });
    const out = await PDFDocument.load(signed);
    expect(out.getPageCount()).toBe(3);
    expect(sha256Hex(original)).toHaveLength(64);
  });
  it("les e-mails portent le lien de signature, signés du service commercial", () => {
    const q = quoteEmail({ company: "ProClean Empire", clientName: "X", number: "D-1", totalTtc: "120,00 €", signUrl: "https://exemple.fr/signer/abc" });
    expect(q.text).toContain("https://exemple.fr/signer/abc");
    expect(quoteEmail({ company: "ProClean Empire", clientName: "X", number: "D-1", totalTtc: "120,00 €" }).text).not.toContain("signer");
    const r = signatureRequestEmail({ company: "ProClean Empire", kind: "contrat", number: "CT-1", url: "https://exemple.fr/signer/abc", days: 30 });
    expect(r.subject).toContain("à signer");
    expect(r.fromName).toBe("ProClean Empire - Service commercial");
    expect(signatureDoneEmail({ company: "ProClean Empire", kind: "devis", number: "D-1", name: "Élodie Martin" }).text).toContain("Bonjour Élodie");
  });
});
