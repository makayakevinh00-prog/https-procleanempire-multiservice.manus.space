import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Chargement des prompts depuis `/prompts`.
 *
 * Ils vivent dans des fichiers Markdown plutôt que dans le code : on peut les
 * relire, les faire valider et les ajuster sans toucher à TypeScript.
 */

const here = dirname(fileURLToPath(import.meta.url));
const promptsDir = join(here, "..", "..", "prompts");

const cache = new Map<string, string>();

export const loadPrompt = async (name: string): Promise<string> => {
  const cached = cache.get(name);
  if (cached) return cached;

  const content = await readFile(join(promptsDir, `${name}.md`), "utf8");
  cache.set(name, content);
  return content;
};

/**
 * Remplace les jetons `{{NOM}}`. Un jeton oublié est une erreur : mieux vaut
 * échouer que d'envoyer au modèle un prompt contenant « {{MATERIAL}} ».
 */
export const fillTemplate = (
  template: string,
  values: Record<string, string>,
): string => {
  const filled = template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = values[key];
    if (value === undefined) {
      throw new Error(`Jeton {{${key}}} non fourni au modèle de prompt.`);
    }
    return value;
  });

  return filled;
};

export const bullets = (items: readonly string[]): string =>
  items.map((item) => `- ${item}`).join("\n");
