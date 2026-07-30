import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { callModel, extractJson, type ModelImage } from "./client.js";
import { loadPrompt } from "./prompts.js";
import { photoAnalysisSchema, type PhotoAnalysis, type SourcePhoto } from "../types.js";
import { logger } from "../logger.js";

/** Types d'image acceptés par le modèle. */
const MEDIA_TYPES: Record<string, ModelImage["mediaType"]> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export const mediaTypeFor = (path: string): ModelImage["mediaType"] | null =>
  MEDIA_TYPES[extname(path).toLowerCase()] ?? null;

/**
 * Analyse une photo : type de prestation, éléments remarquables, exploitabilité.
 * Retourne `null` si le format n'est pas lisible par le modèle.
 */
export const analysePhoto = async (
  photo: SourcePhoto,
): Promise<PhotoAnalysis | null> => {
  const mediaType = mediaTypeFor(photo.localPath);

  if (!mediaType) {
    logger.warn(`Format non pris en charge, photo ignorée : ${photo.name}`);
    return null;
  }

  const system = await loadPrompt("vision");
  const buffer = await readFile(photo.localPath);

  const raw = await callModel({
    task: "vision",
    system,
    user: `Analyse cette photo (nom du fichier : ${photo.name}).`,
    image: { base64: buffer.toString("base64"), mediaType },
    maxTokens: 1000,
    temperature: 0.2,
  });

  const parsed = photoAnalysisSchema.safeParse(extractJson(raw, "l'analyse photo"));

  if (!parsed.success) {
    logger.warn(
      `Analyse photo invalide pour ${photo.name}, la photo est écartée`,
      parsed.error.issues,
    );
    return null;
  }

  return parsed.data;
};
