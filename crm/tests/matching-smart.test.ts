import { describe, it, expect } from "vitest";
import { nameOverlap, suggestInvoices, type InvoiceCandidate } from "../src/lib/domain/matching";

// Données entièrement fictives (aucun client, montant ni numéro réel).
const inv = (id: string, number: string, total: number, paid: number, client: string): InvoiceCandidate => ({ id, number, total_ttc: total, paid_amount: paid, client_name: client, client_is_reserved: false });
const OPEN = [
  inv("a", "F2701-000010", 700, 200, "ABC SOCIETE DE TRANSPORTS BELLEVUE"),
  inv("b", "F-2027-002", 200, 0, "ABC SOCIETE DE TRANSPORTS BELLEVUE"),
  inv("c", "F2701-000011", 360, 0, "NETTOYAGE DU PORT"),
  inv("d", "F2701-000012", 560, 0, "ATELIER OPTIQUE TEST")
];

describe("rapprochement intelligent", () => {
  it("reconnaît un nom tronqué par la banque", () => {
    expect(nameOverlap("SOCIETE DE TRANSPORTS BELLEV", "ABC SOCIETE DE TRANSPORTS BELLEVUE")).toBe(1);
    expect(nameOverlap("Boulangerie Exemple", "ABC SOCIETE DE TRANSPORTS BELLEVUE")).toBe(0);
  });
  it("500 € du client = le reste dû d'une facture de 700 € déjà réglée à 200 €", () => {
    const s = suggestInvoices({ amount: 500, label: "SOCIETE DE TRANSPORTS BELLEV", reference: "FACTURE 12", counterparty: "SOCIETE DE TRANSPORTS BELLEV" }, OPEN);
    expect(s[0].invoiceId).toBe("a"); expect(s[0].level).toBe("tres_probable"); expect(s[0].reasons.join(" ")).toContain("reste dû");
  });
  it("200 € du même client propose la facture de 200 € (montant + nom), pas celle de 700 €", () => {
    const s = suggestInvoices({ amount: 200, label: "SOCIETE DE TRANSPORTS BELLEV", reference: "", counterparty: "SOCIETE DE TRANSPORTS BELLEV" }, OPEN);
    expect(s[0].invoiceId).toBe("b");
  });
  it("un virement partiel du bon client est signalé comme acompte possible", () => {
    const s = suggestInvoices({ amount: 200, label: "ATELIER OPTIQUE TEST", reference: "", counterparty: "ATELIER OPTIQUE TEST" }, OPEN);
    expect(s[0].invoiceId).toBe("d"); expect(s[0].reasons.join(" ")).toContain("acompte");
  });
  it("ne propose rien quand rien ne concorde (virement personnel, montant inconnu)", () => {
    expect(suggestInvoices({ amount: 6.2, label: "JEAN EXEMPLE", reference: "Envoye depuis une app", counterparty: "JEAN EXEMPLE" }, OPEN)).toEqual([]);
    expect(suggestInvoices({ amount: 330, label: "NETTOYAGE DU PORT", reference: "FACTURE 9", counterparty: "NETTOYAGE DU PORT" }, OPEN)[0]?.level).not.toBe("tres_probable");
  });
  it("accepte un écart d'un centime sur le numéro cité", () => {
    const s = suggestInvoices({ amount: 400, label: "MME EXEMPLE MARIE", reference: "FACTURE F2701-000099", counterparty: "MME EXEMPLE MARIE" }, [inv("e", "F2701-000099", 400.01, 0, "Marie Exemple")]);
    expect(s[0].invoiceId).toBe("e");
  });
});
