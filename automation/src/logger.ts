/**
 * Journal minimal, lisible aussi bien dans un terminal que dans les logs d'un
 * nœud n8n « Execute Command ». Chaque ligne est préfixée d'un horodatage ISO
 * pour pouvoir recouper avec l'historique d'exécution.
 */

type Level = "info" | "warn" | "error" | "debug";

const symbols: Record<Level, string> = {
  info: "·",
  warn: "!",
  error: "✕",
  debug: "…",
};

const write = (level: Level, message: string, details?: unknown) => {
  const line = `${new Date().toISOString()} ${symbols[level]} ${message}`;
  const stream = level === "error" || level === "warn" ? console.error : console.log;

  if (details === undefined) {
    stream(line);
    return;
  }

  stream(
    `${line}\n${typeof details === "string" ? details : JSON.stringify(details, null, 2)}`,
  );
};

export const logger = {
  info: (message: string, details?: unknown) => write("info", message, details),
  warn: (message: string, details?: unknown) => write("warn", message, details),
  error: (message: string, details?: unknown) => write("error", message, details),
  debug: (message: string, details?: unknown) => {
    if (process.env.DEBUG) write("debug", message, details);
  },
  /** Titre de section, pour repérer les étapes dans un long journal. */
  step: (message: string) => console.log(`\n▸ ${message}`),
};
