import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { env } from "../env.js";
import { logger } from "../logger.js";
import { HttpError, withRetry } from "../retry.js";
import type { PlatformId } from "../../config/platforms.js";
import type { PlatformPost, PublishResult } from "../types.js";

/**
 * Publication via Buffer.
 *
 * Buffer est utilisé plutôt que les API natives parce qu'il couvre les quatre
 * réseaux avec un seul jeton, et surtout parce qu'il gère la publication
 * Instagram et TikTok sans passer par une validation d'application Meta pour
 * chaque compte client.
 */

const API = "https://api.bufferapp.com/1";

const profileIdFor = (platform: PlatformId): string | undefined => {
  const config = env();
  switch (platform) {
    case "instagram":
      return config.BUFFER_PROFILE_INSTAGRAM;
    case "facebook":
      return config.BUFFER_PROFILE_FACEBOOK;
    case "linkedin":
      return config.BUFFER_PROFILE_LINKEDIN;
    case "tiktok":
      return config.BUFFER_PROFILE_TIKTOK;
  }
};

/** Assemble corps, appel à l'action et hashtags en un texte publiable. */
export const composeText = (post: PlatformPost): string =>
  [post.body.trim(), post.cta.trim(), post.hashtags.join(" ")]
    .filter(Boolean)
    .join("\n\n");

export const publishToBuffer = async (
  platform: PlatformId,
  post: PlatformPost,
  imagePath: string,
  scheduledFor: Date,
): Promise<PublishResult> => {
  const token = env().BUFFER_ACCESS_TOKEN;
  const profileId = profileIdFor(platform);

  if (!token) {
    return { platform, status: "skipped", detail: "BUFFER_ACCESS_TOKEN absent" };
  }

  if (!profileId) {
    return {
      platform,
      status: "skipped",
      detail: `Aucun profil Buffer configuré pour ${platform}`,
    };
  }

  const body = new URLSearchParams();
  body.set("profile_ids[]", profileId);
  body.set("text", composeText(post));
  // Buffer attend un horodatage Unix en secondes.
  body.set("scheduled_at", String(Math.floor(scheduledFor.getTime() / 1000)));

  const media = await encodeMedia(imagePath);
  if (media) {
    body.set("media[photo]", media.dataUri);
    body.set("media[thumbnail]", media.dataUri);
    body.set("media[alt_text]", media.altText);
  }

  const result = await withRetry(
    `Buffer (${platform})`,
    async () => {
      const response = await fetch(`${API}/updates/create.json?access_token=${token}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!response.ok) {
        throw new HttpError(response.status, await response.text(), `${API}/updates/create.json`);
      }

      return (await response.json()) as { success?: boolean; message?: string };
    },
    { attempts: 3 },
  );

  if (result.success === false) {
    throw new Error(`Buffer a refusé la publication ${platform} : ${result.message}`);
  }

  logger.info(`Programmé sur ${platform} pour ${scheduledFor.toISOString()}`);
  return {
    platform,
    status: "scheduled",
    detail: `programmé pour ${scheduledFor.toISOString()}`,
  };
};

/**
 * Buffer accepte une image en data URI, ce qui évite d'avoir à héberger le
 * visuel quelque part avant de publier.
 */
const encodeMedia = async (
  imagePath: string,
): Promise<{ dataUri: string; altText: string } | null> => {
  try {
    const buffer = await readFile(imagePath);
    const mime = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";
    return {
      dataUri: `data:${mime};base64,${buffer.toString("base64")}`,
      altText: `Visuel ProClean Empire — ${basename(imagePath)}`,
    };
  } catch (error) {
    logger.warn(
      `Visuel illisible, publication sans image : ${imagePath}`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
};
