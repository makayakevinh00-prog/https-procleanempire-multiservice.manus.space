import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { chromium, type Browser } from "playwright-core";
import { env } from "../env.js";
import { logger } from "../logger.js";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  renderCardHtml,
  type BrandCardContent,
} from "./template.js";

/**
 * Génère le visuel de marque en photographiant un gabarit HTML avec un
 * navigateur sans interface.
 */

/**
 * Localise un Chromium utilisable.
 *
 * `playwright-core` n'embarque aucun navigateur : sans chemin explicite, on
 * cherche dans l'emplacement d'installation de Playwright, puis dans les
 * chemins système habituels.
 */
export const resolveChromium = async (): Promise<string | undefined> => {
  const explicit = env().CHROMIUM_EXECUTABLE;
  if (explicit) {
    if (!existsSync(explicit)) {
      throw new Error(`CHROMIUM_EXECUTABLE pointe vers un fichier absent : ${explicit}`);
    }
    return explicit;
  }

  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (root && existsSync(root)) {
    let entries: string[] = [];
    try {
      entries = await readdir(root);
    } catch {
      entries = [];
    }

    // Le Chrome complet d'abord, le « headless shell » ensuite.
    const candidates = [
      ...entries
        .filter((name) => name.startsWith("chromium-"))
        .map((name) => join(root, name, "chrome-linux", "chrome")),
      ...entries
        .filter((name) => name.startsWith("chromium_headless_shell-"))
        .map((name) => join(root, name, "chrome-linux", "headless_shell")),
    ];

    const found = candidates.find((path) => existsSync(path));
    if (found) return found;
  }

  const systemPaths = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];

  const system = systemPaths.find((path) => existsSync(path));
  if (system) return system;

  // Aucun chemin trouvé : on laisse Playwright tenter sa propre résolution,
  // qui produira un message d'erreur explicite s'il n'a rien non plus.
  return undefined;
};

export const generateBrandCard = async (
  content: BrandCardContent,
  outputPath: string,
): Promise<string> => {
  await mkdir(dirname(outputPath), { recursive: true });

  const executablePath = await resolveChromium();
  logger.debug(`Chromium utilisé : ${executablePath ?? "(résolution Playwright)"}`);

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      ...(executablePath ? { executablePath } : {}),
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage({
      viewport: { width: CARD_WIDTH, height: CARD_HEIGHT },
      deviceScaleFactor: 1,
    });

    await page.setContent(renderCardHtml(content), { waitUntil: "load" });
    await page.screenshot({ path: outputPath, type: "png" });

    logger.info(`Visuel de marque généré : ${outputPath}`);
    return outputPath;
  } finally {
    await browser?.close();
  }
};
