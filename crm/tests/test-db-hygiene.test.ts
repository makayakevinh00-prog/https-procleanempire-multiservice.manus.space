import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
const migrations = readdirSync(path.join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql") && !f.endsWith("_down.sql")).sort();
const purge = readFileSync(path.join(root, "supabase/scripts/purge-real-data-test.sql"), "utf8");
const verify = readFileSync(path.join(root, "supabase/scripts/verify-test-db-clean.sql"), "utf8");

/**
 * Migrations connues pour embarquer des données RÉELLES, avec ce que la purge d'une base de test doit couvrir.
 * Toute NOUVELLE migration qui ajoute une donnée réelle fait échouer ce test tant qu'elle n'est pas déclarée ici ET purgée.
 */
const CONNUES: Record<string, string[]> = {
  "0002_automation.sql": ["company_siret", "company_phone", "company_address", "company_rcs"],
  "0015_company_bic_iban.sql": ["company_iban", "company_bic"],
  "0017_fournisseurs.sql": ["suppliers", "supplier_payments"],
  "0018_client_emails.sql": ["client_emails"],
  "0020_mandat_prestation.sql": []
};
const SUSPECT = [/FR76[0-9 ]{10,}/, /[A-Za-z0-9._%+-]+@(?!example\.invalid)(?!proclean)[A-Za-z0-9.-]+\.[a-z]{2,}/i, /insert\s+into\s+supplier(s|_payments)/i, /qonto_id\s*,/i, /\b0[67]\s?(?!12\s?34\s?56\s?78)\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\b/];

describe("données réelles dans les migrations : jamais dans une base de test", () => {
  it("toute migration contenant une donnée d'apparence réelle est déclarée, et sa donnée est purgée par le script de purge", () => {
    const inconnues: string[] = [];
    for (const f of migrations) {
      const sql = readFileSync(path.join(root, "supabase/migrations", f), "utf8");
      if (SUSPECT.some((r) => r.test(sql)) && !(f in CONNUES)) inconnues.push(f);
    }
    expect(inconnues, "migration(s) avec données réelles non déclarées : à déclarer dans CONNUES et à purger").toEqual([]);
    for (const [f, cibles] of Object.entries(CONNUES)) {
      expect(migrations, f).toContain(f);
      for (const c of cibles) expect(purge + verify, `${f} → ${c} doit être couvert par la purge ou la vérification`).toMatch(new RegExp(c));
    }
  });
  it("la purge efface fournisseurs, paiements fournisseurs, IBAN, BIC et coordonnées de la société", () => {
    for (const m of [/delete from supplier_payments/, /delete from suppliers/, /company_iban = null/, /company_bic = null/, /company_siret = null/, /company_phone = null/]) expect(purge).toMatch(m);
  });
  it("la vérification ne renvoie des lignes que pour une donnée suspecte (e-mails non fictifs, IBAN, noms de clients réels)", () => {
    for (const m of [/@example\.invalid/, /company_iban/, /sarb/i, /swyfo/i]) expect(verify).toMatch(m);
  });
  it("les scripts de purge et de vérification ne contiennent aucune donnée réelle eux-mêmes", () => {
    expect(purge).not.toMatch(/FR76[0-9 ]{10,}|@(gmail|icloud|yahoo|outlook)\./i);
  });
  it("le jeu de données de développement (seed) est identifié comme contenant des noms réels : interdit en base de test", () => {
    const seed = readFileSync(path.join(root, "supabase/seed.sql"), "utf8");
    expect(seed).toMatch(/SARB OPTIQUE/);
    expect(verify).toMatch(/sarb/i);
  });
});
