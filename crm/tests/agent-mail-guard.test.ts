import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Garanties structurelles sur l'envoi d'e-mails par les agents :
 *  - le connecteur (route MCP, serveur MCP) ne sait ni envoyer ni utiliser de clé privilégiée ;
 *  - le seul code qui envoie un e-mail à la demande d'un agent est l'action « approuver et envoyer », réservée au patron,
 *    qui n'envoie qu'aux adresses choisies par le patron et n'enregistre « exécutée » qu'après l'envoi réel.
 */
const root = path.join(__dirname, "..");
const code = (f: string) => readFileSync(path.join(root, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const walk = (dir: string, out: string[] = []) => { for (const e of readdirSync(path.join(root, dir))) { const rel = `${dir}/${e}`; if (statSync(path.join(root, rel)).isDirectory()) walk(rel, out); else if (/\.(ts|tsx)$/.test(e)) out.push(rel); } return out; };

describe("connecteur des agents", () => {
  const files = [...walk("src/lib/mcp"), ...walk("src/app/api/mcp")];
  it("couvre la route et le serveur", () => { expect(files.length).toBeGreaterThanOrEqual(2); });
  it("n'envoie rien, n'utilise ni clé service ni Qonto, et n'écrit dans aucune table (tout passe par agent_api)", () => {
    for (const f of files) {
      const src = code(f);
      expect(src, f).not.toMatch(/sendMail|@\/lib\/mail|createAdmin|SERVICE_ROLE|syncQonto|@\/lib\/qonto/);
      expect(src, f).not.toMatch(/\.from\(/);
      for (const m of src.matchAll(/\.rpc\(\s*["'`]([a-z_]+)["'`]/g)) expect(m[1], f).toBe("agent_api");
    }
  });
});

describe("approbation d'un e-mail proposé par un agent", () => {
  const src = code("src/app/actions/agent-mail.ts");
  it("est réservée au patron et ne lit les adresses que dans la fiche ou le formulaire du patron", () => {
    expect(src).toMatch(/await requireOwner\(\)/);
    expect(src).toMatch(/pickRecipients\(fd\)/);
    expect(src).not.toMatch(/payload\??\.(to|email|recipients)/i);
  });
  it("refuse les contacts réservés et ne marque « exécutée » qu'après un envoi réussi", () => {
    expect(src).toMatch(/is_reserved/);
    expect(src.indexOf("sendMail(")).toBeGreaterThan(-1);
    expect(src.indexOf("jarvis_mark_sent")).toBeGreaterThan(src.indexOf("sendMail("));
    expect(src).toMatch(/if \(!r\.sent\) flash\(/);
  });
  it("n'est appelée que par la page JARVIS (aucun autre fichier ne l'importe)", () => {
    const users = walk("src").filter((f) => code(f).includes("agent-mail"));
    expect(users).toEqual(["src/app/(app)/jarvis/page.tsx"]);
  });
});
