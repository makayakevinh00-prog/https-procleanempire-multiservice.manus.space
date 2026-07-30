import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { env, hasDriveConfig } from "../env.js";
import { logger } from "../logger.js";
import type { SourcePhoto } from "../types.js";
import { downloadPhoto, listNewPhotos } from "./drive.js";
import { mediaTypeFor } from "../ai/vision.js";

/**
 * Récupération de la photo du jour.
 *
 * Deux sources, dans l'ordre : Google Drive si configuré, sinon un dossier
 * local (utile pour les tests et pour dépanner sans accès Drive). Les deux
 * excluent les fichiers déjà publiés, identifiés par l'historique.
 */

export type PhotoPick = {
  photo: SourcePhoto;
  source: "drive" | "local";
} | null;

export const fetchTodaysPhoto = async (
  usedIds: ReadonlySet<string>,
  workDir: string,
): Promise<PhotoPick> => {
  if (hasDriveConfig()) {
    try {
      const candidates = await listNewPhotos(usedIds);

      if (candidates.length === 0) {
        logger.info("Aucune nouvelle photo dans Google Drive.");
      } else {
        // La plus ancienne d'abord : on publie dans l'ordre d'arrivée.
        const photo = await downloadPhoto(candidates[0]!, workDir);
        return { photo, source: "drive" };
      }
    } catch (error) {
      // Un incident Drive ne doit pas empêcher la publication du jour :
      // on bascule sur un contenu sans photo.
      logger.warn(
        "Google Drive inaccessible, poursuite sans photo",
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  } else {
    logger.info("Google Drive non configuré, tentative sur le dossier local.");
  }

  return fetchLocalPhoto(usedIds, workDir);
};

const fetchLocalPhoto = async (
  usedIds: ReadonlySet<string>,
  workDir: string,
): Promise<PhotoPick> => {
  const dir = env().LOCAL_PHOTOS_DIR;
  if (!dir) return null;

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    logger.warn(`Dossier local de photos introuvable : ${dir}`);
    return null;
  }

  const images = entries
    .filter((name) => mediaTypeFor(name) !== null)
    .filter((name) => !usedIds.has(localId(name)))
    .sort();

  if (images.length === 0) {
    logger.info("Aucune nouvelle photo dans le dossier local.");
    return null;
  }

  const name = images[0] as string;
  const sourcePath = join(dir, name);
  await mkdir(workDir, { recursive: true });
  const localPath = join(workDir, name);
  await copyFile(sourcePath, localPath);

  const info = await stat(sourcePath);

  return {
    source: "local",
    photo: {
      id: localId(name),
      name,
      mimeType: mediaTypeFor(name) ?? "image/jpeg",
      localPath,
      createdTime: info.birthtime.toISOString(),
    },
  };
};

/** Identifiant stable pour une photo locale, aligné sur son nom de fichier. */
const localId = (name: string): string => `local:${name}`;
