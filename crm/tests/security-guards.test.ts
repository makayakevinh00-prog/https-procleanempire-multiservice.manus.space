import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { SETTINGS_COLUMNS } from "@/lib/data";

const root = path.join(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

/**
 * Actions volontairement SANS garde `requireOwner`, avec la raison.
 * Toute nouvelle entrée ici doit être justifiée et validée par le dirigeant.
 */
const SANS_GARDE: Record<string, string> = {
  "agent.ts":
    "Application des agents : accès par lien privé (jeton), pas de session du patron. Refus d'un jeton invalide vérifié par direct-access.test.ts.",
};

function actions(file: string) {
  const src = read(`src/app/actions/${file}`);
  const out: { name: string; firstStatement: string }[] = [];
  const re = /^export async function (\w+)\([^\n]*\) \{\n([^\n]*)/gm;
  for (let m; (m = re.exec(src)); )
    out.push({ name: m[1], firstStatement: m[2].trim() });
  return out;
}

describe("garde de rôle sur les actions serveur", () => {
  const files = readdirSync(path.join(root, "src/app/actions")).filter((f) =>
    f.endsWith(".ts"),
  );

  it("chaque action exportée commence par requireOwner() (ou requireAccess d'une section connue), sauf exceptions justifiées", () => {
    const manquantes: string[] = [];
    let controlees = 0;
    for (const f of files) {
      if (SANS_GARDE[f]) continue;
      for (const a of actions(f)) {
        if (SANS_GARDE[`${f}#${a.name}`]) continue;
        controlees++;
        if (a.firstStatement !== "await requireOwner();" && !/^await requireAccess\("(clients|devis|contrats|missions|rh|conciergerie|veille|catalogue|finances)"(, "(read|write)")?\);$/.test(a.firstStatement))
          manquantes.push(`${f}#${a.name}`);
      }
    }
    expect(manquantes).toEqual([]);
    expect(controlees).toBeGreaterThanOrEqual(70); // garde-fou : le test ne doit pas devenir vide
  });

  it("les exceptions listées existent encore (sinon la liste est périmée)", () => {
    for (const k of Object.keys(SANS_GARDE)) {
      const [f, name] = k.split("#");
      expect(existsSync(path.join(root, "src/app/actions", f))).toBe(true);
      if (name) expect(actions(f).some((a) => a.name === name)).toBe(true);
    }
  });

  it("les routes qui servent des documents ou des photos vérifient le patron", () => {
    for (const p of [
      "src/app/api/factures/[id]/pdf/route.ts",
      "src/app/api/devis/[id]/pdf/route.ts",
      "src/app/api/contrats/[id]/pdf/route.ts",
      "src/app/api/missions/photo/[id]/route.ts",
      "src/app/api/compta/export/route.ts",
    ]) {
      expect(read(p), p).toMatch(/await (isOwner|canRead\("[a-z]+"\)|isAccountant)\(?\)?/);
    }
  });

  it("la mise en page de l'espace patron refuse tout autre compte", () => {
    expect(read("src/app/(app)/layout.tsx")).toMatch(/access\.kind !== "owner" && access\.kind !== "team"/);
  });
});

describe("la clé de la base et les secrets restent côté serveur", () => {
  const fichiers = [
    "src/lib/supabase/server.ts",
    "src/lib/qonto.ts",
    "src/lib/mail.ts",
    "src/lib/email-log.ts",
    "src/lib/automation/deps.ts",
    "src/lib/inbound-auth.ts",
    "src/lib/public-api.ts",
    "src/lib/agent.ts",
    "src/lib/auth.ts",
  ];
  it("ces modules importent 'server-only'", () => {
    for (const f of fichiers)
      expect(read(f), f).toMatch(/import "server-only";/);
  });

  it("aucun composant 'use client' n'importe un module serveur", () => {
    const interdits =
      /@\/lib\/(supabase\/server|qonto|mail|email-log|automation|inbound-auth|public-api|agent|auth)\b/;
    const trouves: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(path.join(root, dir), {
        withFileTypes: true,
      })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(rel);
        else if (/\.(ts|tsx)$/.test(e.name)) {
          const s = read(rel);
          if (/^["']use client["']/.test(s) && interdits.test(s))
            trouves.push(rel);
        }
      }
    };
    walk("src");
    expect(trouves).toEqual([]);
  });

  it("aucune variable NEXT_PUBLIC ne porte un secret", () => {
    const ok = new Set([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
    const trouvees = new Set<string>();
    const walk = (dir: string) => {
      for (const e of readdirSync(path.join(root, dir), {
        withFileTypes: true,
      })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(rel);
        else if (/\.(ts|tsx)$/.test(e.name))
          for (const m of read(rel).matchAll(/NEXT_PUBLIC_[A-Z_]+/g))
            trouvees.add(m[0]);
      }
    };
    walk("src");
    expect([...trouvees].filter((v) => !ok.has(v))).toEqual([]);
  });
});

describe("réglages lus par l'application", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(
      `create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$; create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$; create role authenticated; create role anon;`,
    );
    for (const f of readdirSync(path.join(root, "supabase/migrations"))
      .filter((x) => x.endsWith(".sql") && !x.endsWith("_down.sql"))
      .sort()) {
      // 0021+ (JARVIS) n'a pas d'incidence sur app_settings ; on applique tout ce qui existe pour rester fidèle à la production
      await db.exec(read(`supabase/migrations/${f}`));
    }
    await db.exec(read("supabase/seed.sql"));
  });

  it("n'inclut jamais automation_secret", () => {
    expect(SETTINGS_COLUMNS.split(",").map((c) => c.trim())).not.toContain(
      "automation_secret",
    );
  });

  it("toutes les colonnes demandées existent, et rien d'autre que le secret n'est omis", async () => {
    const demandees = SETTINGS_COLUMNS.split(",").map((c) => c.trim());
    const { rows } = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema='public' and table_name='app_settings'",
    );
    const reelles = rows.map((r) => r.column_name);
    expect(demandees.filter((c) => !reelles.includes(c))).toEqual([]);
    expect(reelles.filter((c) => !demandees.includes(c))).toEqual([
      "automation_secret",
    ]);
    await expect(
      db.query(`select ${SETTINGS_COLUMNS} from app_settings`),
    ).resolves.toBeTruthy();
  });
});
