import { describe, it, expect } from "vitest";
import { sentJustNow } from "@/lib/send-guard";

describe("pas de double envoi du même document", () => {
  const now = new Date("2026-11-12T15:44:00Z");
  it("mêmes adresses il y a moins de deux minutes : pas de second envoi", () => {
    expect(sentJustNow("2026-11-12T15:43:50Z", "Geetha@live.fr", ["geetha@live.fr"], now)).toBe(true);
    expect(sentJustNow("2026-11-12T15:43:50Z", "a@x.fr, b@x.fr", ["b@x.fr", "A@x.fr"], now)).toBe(true);
  });
  it("plus de deux minutes après, ou à d'autres adresses, ou jamais envoyé : l'envoi reste possible", () => {
    expect(sentJustNow("2026-11-12T15:41:00Z", "geetha@live.fr", ["geetha@live.fr"], now)).toBe(false);
    expect(sentJustNow("2026-11-12T15:43:50Z", "geetha@live.fr", ["autre@x.fr"], now)).toBe(false);
    expect(sentJustNow("2026-11-12T15:43:50Z", "a@x.fr", ["a@x.fr", "b@x.fr"], now)).toBe(false);
    expect(sentJustNow(null, null, ["a@x.fr"], now)).toBe(false);
  });
  it("sans liste d'adresses connue (devis) : seul le délai compte", () => {
    expect(sentJustNow("2026-11-12T15:43:50Z", null, ["a@x.fr"], now)).toBe(true);
    expect(sentJustNow("2026-11-12T15:40:00Z", null, ["a@x.fr"], now)).toBe(false);
  });
});
