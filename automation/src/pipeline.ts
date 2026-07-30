import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { analysePhoto } from "./ai/vision.js";
import { writePost } from "./ai/copywriter.js";
import { env } from "./env.js";
import { generateVisual } from "./image/index.js";
import { logger } from "./logger.js";
import { notify } from "./notify/index.js";
import { chooseAngle } from "./planner/angle.js";
import { chooseAudience } from "./planner/audience.js";
import { buildCalendarContext } from "./planner/calendar.js";
import { nextPublicationSlot } from "./planner/schedule.js";
import { publishPost, savePostFiles } from "./publish/index.js";
import { archivePhoto } from "./sources/drive.js";
import { fetchTodaysPhoto } from "./sources/index.js";
import { loadState, recordPost } from "./state/store.js";
import type { PhotoAnalysis, Post, PublishResult, SourcePhoto } from "./types.js";

/**
 * Traitement quotidien complet : de la photo (ou de son absence) jusqu'à la
 * publication programmée.
 */

export type RunOptions = {
  dryRun: boolean;
  /** Ignore Drive et le dossier local : force une publication sans photo. */
  skipPhoto?: boolean;
  /** N'enregistre rien dans l'historique (utilisé par `preview`). */
  ephemeral?: boolean;
  date?: Date;
};

export type RunOutcome = {
  post: Post;
  results: PublishResult[];
  directory: string;
};

export const runDaily = async (options: RunOptions): Promise<RunOutcome> => {
  const config = env();
  const state = await loadState();
  const calendar = buildCalendarContext(options.date ?? new Date());

  logger.step(
    `Publication du ${calendar.date} (${calendar.weekday}, ${calendar.season}` +
      `${calendar.occasion ? `, ${calendar.occasion}` : ""})`,
  );

  // 1. Photo du jour ─────────────────────────────────────────────────────
  const workDir = join(config.ASSETS_DIR, "downloads", calendar.date);
  const used = new Set(state.usedPhotoIds);

  let photo: SourcePhoto | null = null;
  let imageSource: Post["imageSource"] = "generated";
  let analysis: PhotoAnalysis | null = null;

  if (!options.skipPhoto) {
    const picked = await fetchTodaysPhoto(used, workDir);

    if (picked) {
      logger.info(`Photo retenue : ${picked.photo.name} (${picked.source})`);
      analysis = await analysePhoto(picked.photo);

      if (analysis && analysis.quality !== "inexploitable") {
        photo = picked.photo;
        imageSource = picked.source;
      } else {
        // La photo est écartée mais marquée comme utilisée : sans cela, elle
        // serait reproposée tous les jours et bloquerait la file d'attente.
        logger.warn(
          `Photo écartée (${analysis?.quality ?? "analyse impossible"}) : ` +
            `${analysis?.reason ?? "aucune raison précisée"}`,
        );
        used.add(picked.photo.id);
        state.usedPhotoIds = [...used];
        analysis = null;
      }
    }
  } else {
    logger.info("Photo ignorée à la demande (--no-photo).");
  }

  // 2. Angle du jour ─────────────────────────────────────────────────────
  const { angle, reason } = chooseAngle(calendar, state.history, {
    hasPhoto: photo !== null,
  });
  logger.info(`Angle retenu : ${angle.label} (${reason})`);

  const { audience, reason: audienceReason } = chooseAudience(
    calendar,
    state.history,
    analysis,
  );
  logger.info(`Cible retenue : ${audience.label} (${audienceReason})`);

  // 3. Rédaction ─────────────────────────────────────────────────────────
  logger.step("Rédaction des quatre versions");
  const generated = await writePost({
    angle,
    audience,
    calendar,
    analysis,
    history: state.history,
  });
  logger.info(`Sujet : ${generated.topic}`);

  // 4. Visuel ────────────────────────────────────────────────────────────
  logger.step("Préparation du visuel");
  const imagePath =
    photo?.localPath ??
    (await generateVisual({
      angle,
      topic: generated.topic,
      calendar,
      outputPath: join(config.ASSETS_DIR, "generated", `${calendar.date}.png`),
    }));

  // 5. Assemblage ────────────────────────────────────────────────────────
  const post: Post = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    scheduledFor: nextPublicationSlot(
      config.PUBLISH_TIME,
      config.TIMEZONE,
      options.date ?? new Date(),
    ).toISOString(),
    angle: angle.id,
    audience: audience.id,
    topic: generated.topic,
    calendar,
    imagePath,
    imageSource,
    photoAnalysis: analysis,
    content: {
      instagram: generated.instagram,
      facebook: generated.facebook,
      linkedin: generated.linkedin,
      tiktok: generated.tiktok,
    },
  };

  const directory = await savePostFiles(post);

  // 6. Publication ───────────────────────────────────────────────────────
  logger.step("Publication");
  const results = await publishPost(post, { dryRun: options.dryRun });

  // 7. Historique ────────────────────────────────────────────────────────
  if (!options.ephemeral) {
    await recordPost(state, post, photo?.id ?? null);
    if (photo && imageSource === "drive" && !options.dryRun) {
      await archivePhoto(photo.id);
    }
  }

  // 8. Bilan ─────────────────────────────────────────────────────────────
  const failed = results.filter((result) => result.status === "failed");

  if (failed.length > 0) {
    await notify({
      level: "error",
      title: `Publication du ${calendar.date} partiellement en échec`,
      message: failed
        .map((result) => `${result.platform} : ${result.detail}`)
        .join(" | "),
      results,
    });
  }

  logSummary(results);
  return { post, results, directory };
};

const logSummary = (results: PublishResult[]): void => {
  logger.step("Bilan");
  for (const result of results) {
    const line = `${result.platform.padEnd(10)} ${result.status.padEnd(10)} ${result.detail}`;
    if (result.status === "failed") logger.error(line);
    else logger.info(line);
  }
};
