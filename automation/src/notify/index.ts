import { env } from "../env.js";
import { logger } from "../logger.js";
import { HttpError, withRetry } from "../retry.js";
import type { PublishResult } from "../types.js";

/**
 * Notification en cas de problème.
 *
 * Un webhook plutôt qu'un envoi d'e-mail direct : la même URL fonctionne pour
 * n8n, Slack ou Discord, et n8n peut ensuite router vers l'e-mail si besoin.
 * Le corps contient à la fois `text` (lu par Slack/Discord) et des champs
 * structurés (exploitables par n8n).
 */

export type Notification = {
  level: "error" | "warning";
  title: string;
  message: string;
  results?: PublishResult[];
};

export const notify = async (notification: Notification): Promise<void> => {
  const url = env().NOTIFY_WEBHOOK_URL;

  const line = `[ProClean Empire] ${notification.title} — ${notification.message}`;
  if (notification.level === "error") logger.error(line);
  else logger.warn(line);

  if (!url) {
    logger.warn("NOTIFY_WEBHOOK_URL non configuré : notification non envoyée.");
    return;
  }

  try {
    await withRetry(
      "notification",
      async () => {
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: line,
            level: notification.level,
            title: notification.title,
            message: notification.message,
            results: notification.results ?? [],
            timestamp: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          throw new HttpError(response.status, await response.text(), url);
        }
      },
      { attempts: 2 },
    );
  } catch (error) {
    // Une notification qui échoue ne doit pas masquer l'erreur d'origine.
    logger.error(
      "Envoi de la notification impossible",
      error instanceof Error ? error.message : String(error),
    );
  }
};
