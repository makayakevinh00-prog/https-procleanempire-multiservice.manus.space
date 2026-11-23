import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { toCents, toForm, verifyStripeSignature } from "@/lib/stripe";

const sign = (payload: string, secret: string, t: number) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;

describe("Stripe", () => {
  it("convertit les euros en centimes sans erreur d'arrondi", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(1234.56)).toBe(123456);
    expect(toCents(0.07)).toBe(7);
    expect(toCents(540)).toBe(54000);
  });
  it("met en forme les champs imbriqués et les listes", () => {
    expect(toForm({ mode: "setup", payment_method_types: ["sepa_debit"], metadata: { client_id: "c1" }, vide: null }).toString())
      .toBe("mode=setup&payment_method_types%5B0%5D=sepa_debit&metadata%5Bclient_id%5D=c1");
  });
  it("accepte une notification correctement signée et récente", () => {
    const body = '{"type":"payment_intent.succeeded"}';
    expect(verifyStripeSignature(body, sign(body, "whsec_x", 1000), "whsec_x", 1010)).toBe(true);
  });
  it("refuse une signature fausse, un corps modifié, un message trop ancien ou sans en-tête", () => {
    const body = '{"type":"payment_intent.succeeded"}';
    expect(verifyStripeSignature(body, sign(body, "autre", 1000), "whsec_x", 1010)).toBe(false);
    expect(verifyStripeSignature(body + " ", sign(body, "whsec_x", 1000), "whsec_x", 1010)).toBe(false);
    expect(verifyStripeSignature(body, sign(body, "whsec_x", 1000), "whsec_x", 2000)).toBe(false);
    expect(verifyStripeSignature(body, null, "whsec_x", 1010)).toBe(false);
    expect(verifyStripeSignature(body, "t=abc,v1=00", "whsec_x", 1010)).toBe(false);
  });
});
