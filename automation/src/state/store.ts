import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { env } from "../env.js";
import { logger } from "../logger.js";
import type { HistoryEntry, Post } from "../types.js";

/**
 * État persistant du système : ce qui a déjà été publié et quelles photos ont
 * déjà servi.
 *
 * Un simple fichier JSON versionnable suffit à ce volume (une publication par
 * jour) et évite d'imposer une base de données pour faire tourner le projet.
 */

const historyEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  angle: z.string(),
  audience: z.string().optional(),
  topic: z.string(),
  fingerprint: z.string(),
  hashtags: z.array(z.string()),
  serviceType: z.string().nullable(),
});

const stateSchema = z.object({
  version: z.literal(1),
  /** Identifiants des photos déjà publiées (Drive ou local). */
  usedPhotoIds: z.array(z.string()),
  /** Historique, du plus récent au plus ancien. */
  history: z.array(historyEntrySchema),
});

export type State = {
  version: 1;
  usedPhotoIds: string[];
  history: HistoryEntry[];
};

const emptyState = (): State => ({ version: 1, usedPhotoIds: [], history: [] });

export const loadState = async (): Promise<State> => {
  const path = env().STATE_FILE;

  try {
    const raw = await readFile(path, "utf8");
    const parsed = stateSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      logger.warn(
        `Fichier d'état illisible (${path}), redémarrage sur un état vide`,
        parsed.error.issues.slice(0, 3),
      );
      return emptyState();
    }

    return parsed.data as State;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyState();
    throw error;
  }
};

/**
 * Écriture atomique : on écrit dans un fichier temporaire puis on renomme.
 * Une interruption au mauvais moment ne peut pas laisser un historique tronqué.
 */
export const saveState = async (state: State): Promise<void> => {
  const path = env().STATE_FILE;
  await mkdir(dirname(path), { recursive: true });

  const temp = `${path}.tmp`;
  await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temp, path);
};

export const recordPost = async (
  state: State,
  post: Post,
  photoId: string | null,
): Promise<State> => {
  const entry: HistoryEntry = {
    id: post.id,
    date: post.calendar.date,
    angle: post.angle,
    audience: post.audience,
    topic: post.topic,
    fingerprint: post.content.instagram.body,
    hashtags: post.content.instagram.hashtags,
    serviceType: post.photoAnalysis?.serviceType ?? null,
  };

  const next: State = {
    version: 1,
    usedPhotoIds: photoId
      ? [...new Set([photoId, ...state.usedPhotoIds])].slice(0, 500)
      : state.usedPhotoIds,
    history: [entry, ...state.history].slice(0, env().HISTORY_WINDOW),
  };

  await saveState(next);
  return next;
};
