import { describe, expect, it } from "vitest";
import { parseAfter, parseBefore } from "@/lib/ai-inspect";

describe("lecture de la réponse de l'IA", () => {
  it("relevé avant : points nettoyés de leurs caractères parasites, plafonnés, niveau borné", () => {
    const r = parseBefore('Voici : {"items":[{"zone":"Cuisine\\n","todo":"Dégraisser la plaque"},{"zone":"","todo":""},{"zone":"Salle de bain","todo":"Détartrer"}],"level":7,"summary":"Assez sale"} merci')!;
    expect(r.items).toEqual([{ zone: "Cuisine", todo: "Dégraisser la plaque" }, { zone: "Salle de bain", todo: "Détartrer" }]);
    expect(r.level).toBeNull();
    expect(parseBefore('{"items":[{"zone":"a","todo":"b"}],"level":3}')!.level).toBe(3);
    expect(parseBefore(JSON.stringify({ items: Array.from({ length: 40 }, (_, i) => ({ zone: `z${i}`, todo: "x" })) }))!.items).toHaveLength(14);
  });
  it("réponse illisible ou incomplète : refusée (jamais inventée)", () => {
    for (const t of ["", "pas de json", '{"items":"non"}', "{cassé"]) expect(parseBefore(t)).toBeNull();
    for (const t of ["", '{"verdict":"peut-être"}', "rien"]) expect(parseAfter(t)).toBeNull();
  });
  it("après : le verdict suit les points restants, pas l'inverse", () => {
    const sale = parseAfter('{"cleaned":["Sol"],"remaining":[{"zone":"Miroir","why":"traces visibles"}],"verdict":"ok","summary":"Presque","confidence":"haute"}')!;
    expect(sale.verdict).toBe("reprise"); expect(sale.remaining[0].zone).toBe("Miroir"); expect(sale.confidence).toBe("haute");
    const propre = parseAfter('{"cleaned":["Sol","Miroir"],"remaining":[],"verdict":"reprise","summary":""}')!;
    expect(propre.verdict).toBe("ok"); expect(propre.summary).toContain("complet"); expect(propre.confidence).toBe("moyenne");
  });
});
