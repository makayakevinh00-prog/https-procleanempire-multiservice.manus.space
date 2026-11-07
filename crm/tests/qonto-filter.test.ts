import { describe, it, expect } from "vitest";
import { isCustomerPayment } from "../src/lib/qonto";

const base = { transaction_id: "t", amount: 100, currency: "EUR", side: "credit", status: "completed", label: "X", reference: "", settled_at: null, emitted_at: null };
const OWN = ["FR76 0000 0000 0000 0000 0000 001"];

describe("quels crédits Qonto sont des paiements de clients", () => {
  it("garde un virement de client et le versement de carte (paiements facturés)", () => {
    expect(isCustomerPayment({ ...base, operation_type: "income", reference: "FACTURE 22", income: { counterparty_account_number: "FR7600000000000000000000002" } }, OWN)).toBe(true);
    expect(isCustomerPayment({ ...base, operation_type: "card_acquirer_payout", label: "Paiements facturés" }, OWN)).toBe(true);
  });
  it("écarte les virements internes (référence ou IBAN de vos propres comptes)", () => {
    expect(isCustomerPayment({ ...base, operation_type: "income", reference: "Virement interne" }, OWN)).toBe(false);
    expect(isCustomerPayment({ ...base, operation_type: "income", income: { counterparty_account_number: "FR7600000000000000000000001" } }, OWN)).toBe(false);
  });
  it("écarte les remboursements de carte, les débits et les montants nuls", () => {
    expect(isCustomerPayment({ ...base, operation_type: "card", label: "ADEO*LEROY MERLIN" }, OWN)).toBe(false);
    expect(isCustomerPayment({ ...base, side: "debit" }, OWN)).toBe(false);
    expect(isCustomerPayment({ ...base, amount: 0 }, OWN)).toBe(false);
  });
});
