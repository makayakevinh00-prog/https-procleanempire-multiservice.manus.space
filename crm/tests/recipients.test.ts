import { describe, it, expect } from "vitest";
import { pickRecipients } from "@/lib/recipients";

const form = (pairs: [string, string][]) => { const fd = new FormData(); pairs.forEach(([k, v]) => fd.append(k, v)); return fd; };

describe("destinataires d'une facture", () => {
  it("cases cochées + champ libre, dédoublonnés sans tenir compte de la casse", () => {
    const r = pickRecipients(form([["to", "a@x.fr"], ["to", "B@y.fr"], ["to_extra", "b@y.fr, c@z.fr; d@z.fr"]]));
    expect(r.list).toEqual(["a@x.fr", "B@y.fr", "c@z.fr", "d@z.fr"]);
    expect(r.invalid).toEqual([]);
  });
  it("signale les adresses invalides au lieu de les envoyer", () => {
    const r = pickRecipients(form([["to", "pas-une-adresse"], ["to_extra", "ok@x.fr"]]));
    expect(r.list).toEqual(["ok@x.fr"]); expect(r.invalid).toEqual(["pas-une-adresse"]);
  });
  it("rien de coché : liste vide (l'action refuse d'envoyer)", () => {
    expect(pickRecipients(form([])).list).toEqual([]);
  });
});
