import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { noLlm, LlmNotConfigured, costMicros, mayCall } from "@/lib/jarvis/engine/llm";

describe("intégration IA : contrat seul, aucune dépense par défaut", () => {
  it("l'adaptateur par défaut refuse tout appel", async () => {
    await expect(noLlm.call({} as never)).rejects.toThrow(LlmNotConfigured);
    await expect(noLlm.call({} as never)).rejects.toThrow(/IA_NON_CONNECTEE/);
  });
  it("coût : calcul exact depuis les tokens ; un modèle sans prix déclaré est refusé", () => {
    expect(costMicros("claude-sonnet-5-5", 60_000, 6_000)).toBe(180_000); // 0,18 $
    expect(costMicros("claude-haiku-5-5", 5_000, 500)).toBe(750);
    expect(() => costMicros("modele-inconnu", 1, 1)).toThrow(/MODELE_INCONNU/);
  });
  it("garde avant appel : sans clé ou sans budget, aucun appel", () => {
    expect(mayCall(true, true)).toEqual({ ok: true });
    expect(mayCall(false, true)).toMatchObject({ ok: false });
    expect(mayCall(true, false)).toMatchObject({ ok: false });
  });
  it("le code du moteur ne contient aucun appel réseau vers un fournisseur d'IA ni aucune clé", () => {
    const src = readFileSync(path.join(__dirname, "../src/lib/jarvis/engine/llm.ts"), "utf8");
    expect(src).not.toMatch(/fetch\(|api\.anthropic\.com|sk-ant-|process\.env\.ANTHROPIC/);
  });
});
