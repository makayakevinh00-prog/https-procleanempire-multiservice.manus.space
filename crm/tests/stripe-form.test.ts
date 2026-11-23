import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { stripeForm, stripeConfigured } from "../src/lib/stripe";

describe("Stripe — champs de formulaire", () => {
  it("aplatit objets et listes au format attendu par Stripe, sans les champs vides", () => {
    const f = stripeForm({ mode: "setup", payment_method_types: ["card"], metadata: { track: "abc" }, customer_email: undefined, expand: ["setup_intent"] });
    expect(Object.fromEntries(f)).toEqual({ mode: "setup", "payment_method_types[0]": "card", "metadata[track]": "abc", "expand[0]": "setup_intent" });
  });
  it("sans clé valide, le paiement par carte reste coupé", () => {
    const old = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY; expect(stripeConfigured()).toBe(false);
    process.env.STRIPE_SECRET_KEY = "pk_test_publique"; expect(stripeConfigured()).toBe(false);
    process.env.STRIPE_SECRET_KEY = "sk_test_exemple"; expect(stripeConfigured()).toBe(true);
    if (old === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = old;
  });
});
