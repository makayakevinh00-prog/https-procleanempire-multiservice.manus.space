import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Garantie structurelle : le code JARVIS ne sait écrire QUE dans les tables jarvis_*.
 * Aucune correction automatique de facture, de règlement ou de contrat n'est possible : ni update/insert/delete sur une table du CRM,
 * ni appel d'une fonction du CRM qui modifie (valider, annuler, relancer, rapprocher, créer...).
 */
const root = path.join(__dirname, "..");
const files: string[] = [];
const walk = (dir: string) => {
  for (const e of readdirSync(path.join(root, dir))) {
    const rel = `${dir}/${e}`;
    if (statSync(path.join(root, rel)).isDirectory()) walk(rel);
    else if (/\.(ts|tsx)$/.test(e)) files.push(rel);
  }
};
walk("src/lib/jarvis");
files.push("src/app/actions/jarvis.ts", "src/components/crm/jarvis.tsx");
const FICHIERS_JARVIS_UI = ["src/app/(app)/jarvis"];
for (const d of FICHIERS_JARVIS_UI) walk(d);

const code = (f: string) => readFileSync(path.join(root, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("le code JARVIS n'écrit que dans ses propres tables", () => {
  it("couvre bien les fichiers JARVIS", () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
    expect(files.some((f) => f.endsWith("agents/finance.ts"))).toBe(true);
  });

  it("aucune écriture (insert / update / delete / upsert) sur une table qui n'est pas jarvis_*", () => {
    const fautes: string[] = [];
    for (const f of files) {
      const src = code(f);
      for (const m of src.matchAll(/\.from\(\s*["'`]([a-z_]+)["'`]\s*\)([^;]*)/g)) {
        if (/\.(insert|update|delete|upsert)\s*\(/.test(m[2]) && !m[1].startsWith("jarvis_")) fautes.push(`${f}: écriture sur ${m[1]}`);
      }
    }
    expect(fautes).toEqual([]);
  });

  it("n'appelle aucune fonction de la base qui modifie le CRM : seulement jarvis_* (et is_owner pour contrôler l'accès)", () => {
    const appels = new Set<string>();
    for (const f of files) for (const m of code(f).matchAll(/\.rpc\(\s*["'`]([a-z_]+)["'`]/g)) appels.add(m[1]);
    expect([...appels].sort()).toEqual(["jarvis_decide_action", "jarvis_record_run"]);
    expect([...appels].every((n) => n.startsWith("jarvis_"))).toBe(true);
  });

  it("n'utilise ni la clé service_role ni l'envoi de messages", () => {
    for (const f of files) {
      const src = code(f);
      expect(src, f).not.toMatch(/createAdmin|SERVICE_ROLE/);
      expect(src, f).not.toMatch(/sendMail|@\/lib\/mail|@\/lib\/qonto|syncQonto/);
    }
  });

  it("le chargeur de l'agent Finance ne fait que des lectures", () => {
    const src = code("src/lib/jarvis/load-finance.ts");
    expect(src).not.toMatch(/\.(insert|update|delete|upsert|rpc)\s*\(/);
  });

  it("l'agent Finance est une fonction pure : aucun accès base, réseau, horloge cachée ni aléa", () => {
    const src = code("src/lib/jarvis/agents/finance.ts");
    expect(src).not.toMatch(/supabase|fetch\(|Math\.random|Date\.now|new Date\(\)/);
  });
});
