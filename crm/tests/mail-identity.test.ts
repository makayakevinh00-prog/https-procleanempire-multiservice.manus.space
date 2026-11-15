import { describe, it, expect } from "vitest";
import { fromHeader, senderName, serviceFor, signatureLines } from "@/lib/mail-identity";
import { invoiceEmail, mandateInvoiceEmail, quoteEmail, quoteFollowupEmail, reminderEmail } from "@/lib/mail-templates";

describe("qui écrit au client : le service concerné, jamais une personne", () => {
  it("le service dépend de la nature de l'e-mail ou de l'agent qui le propose", () => {
    expect(serviceFor("facture")).toBe("facturation");
    expect(serviceFor("relance_facture")).toBe("facturation");
    expect(serviceFor("finance")).toBe("facturation");
    expect(serviceFor("devis")).toBe("commercial");
    expect(serviceFor("relance_devis")).toBe("commercial");
    expect(serviceFor("commercial")).toBe("commercial");
    expect(serviceFor("operations")).toBe("entreprise");
    expect(serviceFor(null)).toBe("entreprise");
  });
  it("signature : service, entreprise, contact, téléphone", () => {
    expect(signatureLines("ProClean Empire", "facturation", "06 17 21 22 30")).toEqual(["Le service facturation", "ProClean Empire", "contact@procleanempire.com", "06 17 21 22 30"]);
    expect(signatureLines("ProClean Empire", "commercial")).toEqual(["Le service commercial", "ProClean Empire", "contact@procleanempire.com"]);
    expect(signatureLines("ProClean Empire", "entreprise")).toEqual(["ProClean Empire", "contact@procleanempire.com"]);
  });
  it("nom d'expéditeur : l'adresse d'envoi ne change jamais, seul le nom affiché change", () => {
    expect(senderName("ProClean Empire", "facturation")).toBe("ProClean Empire - Service facturation");
    expect(senderName("ProClean Empire", "entreprise")).toBe("ProClean Empire");
    expect(fromHeader("ProClean Empire <contact@procleanempire.com>", "ProClean Empire - Service facturation")).toBe("ProClean Empire - Service facturation <contact@procleanempire.com>");
    expect(fromHeader("contact@procleanempire.com", "Service commercial")).toBe("Service commercial <contact@procleanempire.com>");
    expect(fromHeader("ProClean Empire <contact@procleanempire.com>")).toBe("ProClean Empire <contact@procleanempire.com>");
    expect(fromHeader("ProClean Empire <contact@procleanempire.com>", 'Pirate" <x@evil.test>,')).toBe("Pirate x@evil.test <contact@procleanempire.com>");
  });
  it("chaque modèle part du bon service et ne porte aucun nom de personne", () => {
    const base = { company: "ProClean Empire", phone: "06 17 21 22 30", number: "X-1", totalTtc: "120,00 €" };
    const billing = [invoiceEmail({ ...base, dueDate: "30/11/2026" }), reminderEmail({ ...base, dueDate: "01/11/2026", level: 2 }),
      mandateInvoiceEmail({ ...base, interventionDate: "03/11/2026", mandateDate: "01/11/2026", mission: "Nettoyage", siteLabel: "Site", keysNote: "sans objet", amountLine: "120 € TTC", dueDate: "18/11/2026", paymentDaysLabel: "à 15 jours", provider: "ProClean Empire" })];
    const sales = [quoteEmail({ ...base, clientName: "Client" }), quoteFollowupEmail({ ...base, level: 1 }), quoteFollowupEmail({ ...base, level: 2 })];
    for (const m of billing) { expect(m.fromName).toBe("ProClean Empire - Service facturation"); expect(m.text).toMatch(/Le service facturation\n\nProClean Empire/); }
    for (const m of sales) { expect(m.fromName).toBe("ProClean Empire - Service commercial"); expect(m.text).toMatch(/Le service commercial\n\nProClean Empire/); }
    for (const m of [...billing, ...sales]) { expect(m.text).not.toMatch(/Kevinh|Makaya/i); expect(m.html).not.toMatch(/Kevinh|Makaya/i); }
  });
});
