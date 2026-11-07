import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
const walk = (dir: string, out: string[] = []) => {
  for (const e of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel, out); else if (/\.(ts|tsx)$/.test(e.name)) out.push(rel);
  }
  return out;
};
/** Seuls ces fichiers ont le droit de connaître les données fictives. */
const AUTORISES = new Set([
  "src/app/(app)/jarvis/openspace/page.tsx",
  "src/components/crm/demo/openspace-demo.tsx"
]);

describe("séparation stricte démonstration / réel", () => {
  const files = walk("src");
  it("seuls la page de l'open space et l'enveloppe de démonstration importent le dossier demo", () => {
    const intrus = files.filter((f) => !f.startsWith("src/lib/jarvis/demo/") && !AUTORISES.has(f) && /from\s+["'][^"']*\/demo\//.test(readFileSync(path.join(root, f), "utf8")));
    expect(intrus).toEqual([]);
  });
  it("les autorisés existent encore et importent bien le dossier demo (sinon la liste est périmée)", () => {
    for (const f of AUTORISES) expect(readFileSync(path.join(root, f), "utf8")).toMatch(/\/demo\//);
  });
  it("les modules du mode réel n'importent aucune donnée fictive", () => {
    for (const f of ["src/lib/jarvis/kpis.ts", "src/lib/jarvis/load-kpis.ts", "src/lib/jarvis/openspace.ts", "src/lib/jarvis/load-openspace.ts", "src/components/crm/pilotage.tsx", "src/components/crm/openspace.tsx", "src/components/crm/hq/office.tsx", "src/components/crm/hq/scene.tsx", "src/components/crm/hq/parts.tsx", "src/lib/jarvis/hq/layout.ts", "src/app/api/jarvis/alerts/route.ts", "src/app/api/jarvis/kpis/route.ts", "src/app/api/jarvis/openspace/route.ts"])
      expect(readFileSync(path.join(root, f), "utf8"), f).not.toMatch(/demo-state|demo-kpis|demoState|demoKpiSet/);
  });
  it("le composant du plateau ne contient plus le scénario fictif : il le reçoit de l'enveloppe de démonstration", () => {
    const src = readFileSync(path.join(root, "src/components/crm/openspace.tsx"), "utf8");
    expect(src).toMatch(/demoNext/);
    expect(src).not.toMatch(/from\s+["']@\/lib\/jarvis\/demo/);
  });
  it("tout chiffre d'exemple affiché est étiqueté : la source des données fictives le dit", () => {
    const src = readFileSync(path.join(root, "src/lib/jarvis/demo/demo-kpis.ts"), "utf8");
    expect(src).toMatch(/Exemple de démonstration/);
  });
  it("la page de démonstration n'appelle jamais le chargeur réel des indicateurs", () => {
    const src = readFileSync(path.join(root, "src/app/(app)/jarvis/openspace/page.tsx"), "utf8");
    expect(src).toMatch(/wantDemo\s*\?\s*\[demoKpiSet\(\), null\]\s*:\s*await Promise\.all\(\[\s*loadKpis/);
  });
});
