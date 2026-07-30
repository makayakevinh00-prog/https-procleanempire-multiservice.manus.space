import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { platformIds } from "../../config/platforms.js";
import { env, hasBufferConfig } from "../env.js";
import { logger } from "../logger.js";
import type { Post, PublishResult } from "../types.js";
import { composeText, publishToBuffer } from "./buffer.js";

/**
 * Orchestration de la publication sur les quatre réseaux.
 *
 * Un réseau en échec n'empêche pas les autres : chaque plateforme est traitée
 * indépendamment et le bilan complet est renvoyé à l'appelant, qui décide
 * ensuite s'il faut notifier.
 */

export const publishPost = async (
  post: Post,
  options: { dryRun: boolean },
): Promise<PublishResult[]> => {
  const scheduledFor = new Date(post.scheduledFor);

  if (options.dryRun || !hasBufferConfig()) {
    const reason = options.dryRun
      ? "mode --dry-run"
      : "Buffer non configuré (BUFFER_ACCESS_TOKEN absent)";
    logger.info(`Publication non envoyée en ligne : ${reason}.`);

    return platformIds.map((platform) => ({
      platform,
      status: "skipped" as const,
      detail: reason,
    }));
  }

  const results: PublishResult[] = [];

  for (const platform of platformIds) {
    try {
      results.push(
        await publishToBuffer(
          platform,
          post.content[platform],
          post.imagePath,
          scheduledFor,
        ),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      logger.error(`Publication ${platform} en échec`, detail);
      results.push({ platform, status: "failed", detail });
    }
  }

  return results;
};

/**
 * Enregistre la publication sur le disque : un JSON complet pour la reprise
 * automatique, et un Markdown lisible pour relecture humaine.
 */
export const savePostFiles = async (post: Post): Promise<string> => {
  const dir = join(env().POSTS_DIR, post.calendar.date);
  await mkdir(dir, { recursive: true });

  await writeFile(
    join(dir, "post.json"),
    `${JSON.stringify(post, null, 2)}\n`,
    "utf8",
  );

  await writeFile(join(dir, "post.md"), renderMarkdown(post), "utf8");

  logger.info(`Publication enregistrée dans ${dir}`);
  return dir;
};

const renderMarkdown = (post: Post): string => {
  const sections = platformIds.map((platform) => {
    const content = post.content[platform];
    return [
      `## ${platform}`,
      "",
      content.body.trim(),
      "",
      `**Appel à l'action :** ${content.cta}`,
      "",
      content.hashtags.join(" "),
      "",
      `_${composeText(content).length} caractères au total_`,
    ].join("\n");
  });

  return [
    `# ${post.topic}`,
    "",
    `- **Date :** ${post.calendar.date} (${post.calendar.weekday})`,
    `- **Angle :** ${post.angle}`,
    `- **Cible :** ${post.audience}`,
    `- **Saison :** ${post.calendar.season}`,
    `- **Évènement :** ${post.calendar.occasion ?? "aucun"}`,
    `- **Visuel :** ${post.imagePath} (${post.imageSource})`,
    `- **Programmé pour :** ${post.scheduledFor}`,
    "",
    ...sections,
    "",
  ].join("\n");
};
