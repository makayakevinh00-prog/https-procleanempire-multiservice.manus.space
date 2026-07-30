#!/usr/bin/env node
import { env, hasBufferConfig, hasDriveConfig } from "./env.js";
import { logger } from "./logger.js";
import { notify } from "./notify/index.js";
import { runDaily } from "./pipeline.js";
import { resolveChromium } from "./image/brandCard.js";
import { loadState } from "./state/store.js";
import { buildCalendarContext } from "./planner/calendar.js";

/**
 * Point d'entrée en ligne de commande.
 *
 * C'est cette commande que n8n déclenche chaque matin :
 *   node --import tsx src/index.ts run
 */

const HELP = `
ProClean Empire — publication automatique

  run                Exécute la publication du jour
    --dry-run        N'envoie rien en ligne, enregistre seulement les fichiers
    --no-photo       Ignore Drive et force un contenu sans photo
    --date=AAAA-MM-JJ  Simule une autre date

  preview            Comme « run --dry-run », mais sans toucher à l'historique
  history            Affiche les dernières publications enregistrées
  doctor             Vérifie la configuration et l'environnement
`;

const parseArgs = (argv: string[]) => {
  const command = argv[0] ?? "run";
  const flags = new Set(argv.filter((arg) => arg.startsWith("--")));
  const dateArg = argv.find((arg) => arg.startsWith("--date="))?.slice(7);

  return {
    command,
    dryRun: flags.has("--dry-run"),
    skipPhoto: flags.has("--no-photo"),
    date: dateArg ? new Date(`${dateArg}T09:00:00Z`) : undefined,
  };
};

const commandDoctor = async (): Promise<void> => {
  const config = env();
  const calendar = buildCalendarContext();

  const chromium = await resolveChromium().catch((error: Error) => `⚠ ${error.message}`);

  const checks: Array<[string, string]> = [
    ["Modèle", config.MOCK_AI ? "MOCK_AI actif (contenu factice)" : config.ANTHROPIC_API_KEY ? `clé présente, modèle ${config.ANTHROPIC_MODEL}` : "✕ ANTHROPIC_API_KEY manquant"],
    ["Google Drive", hasDriveConfig() ? "configuré" : config.LOCAL_PHOTOS_DIR ? `non configuré — dossier local : ${config.LOCAL_PHOTOS_DIR}` : "non configuré (publications sans photo)"],
    ["Buffer", hasBufferConfig() ? "jeton présent" : "✕ non configuré (aucune publication en ligne)"],
    ["Profils Buffer", [
      config.BUFFER_PROFILE_INSTAGRAM && "instagram",
      config.BUFFER_PROFILE_FACEBOOK && "facebook",
      config.BUFFER_PROFILE_LINKEDIN && "linkedin",
      config.BUFFER_PROFILE_TIKTOK && "tiktok",
    ].filter(Boolean).join(", ") || "aucun"],
    ["Visuels", `${config.IMAGE_PROVIDER} — Chromium : ${chromium ?? "résolution automatique"}`],
    ["Notifications", config.NOTIFY_WEBHOOK_URL ? "webhook configuré" : "✕ NOTIFY_WEBHOOK_URL absent"],
    ["Planification", `${config.PUBLISH_TIME} (${config.TIMEZONE})`],
    ["Aujourd'hui", `${calendar.date} — ${calendar.weekday}, ${calendar.season}${calendar.occasion ? `, ${calendar.occasion}` : ""}`],
  ];

  console.log("\nVérification de la configuration\n");
  for (const [label, value] of checks) {
    console.log(`  ${label.padEnd(18)} ${value}`);
  }

  const state = await loadState();
  console.log(`  ${"Historique".padEnd(18)} ${state.history.length} publication(s), ${state.usedPhotoIds.length} photo(s) déjà utilisée(s)\n`);
};

const commandHistory = async (): Promise<void> => {
  const state = await loadState();

  if (state.history.length === 0) {
    console.log("Aucune publication enregistrée pour l'instant.");
    return;
  }

  console.log("\nDernières publications\n");
  for (const entry of state.history.slice(0, 20)) {
    console.log(`  ${entry.date}  ${entry.angle.padEnd(22)} ${entry.topic}`);
  }
  console.log("");
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case "run":
      await runDaily({
        dryRun: args.dryRun,
        skipPhoto: args.skipPhoto,
        date: args.date,
      });
      return;

    case "preview":
      await runDaily({
        dryRun: true,
        ephemeral: true,
        skipPhoto: args.skipPhoto,
        date: args.date,
      });
      return;

    case "doctor":
      await commandDoctor();
      return;

    case "history":
      await commandHistory();
      return;

    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      return;

    default:
      console.error(`Commande inconnue : ${args.command}`);
      console.log(HELP);
      process.exitCode = 1;
  }
};

main().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error("Exécution interrompue", message);

  // Une sortie en échec est ce que n8n surveille pour déclencher sa propre
  // relance ; la notification prévient en parallèle.
  await notify({
    level: "error",
    title: "Publication quotidienne interrompue",
    message,
  });

  process.exitCode = 1;
});
