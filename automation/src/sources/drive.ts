import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { google, type drive_v3 } from "googleapis";
import { env, hasDriveConfig, MissingConfigError } from "../env.js";
import { logger } from "../logger.js";
import { withRetry } from "../retry.js";
import type { SourcePhoto } from "../types.js";

/**
 * Source principale : un dossier Google Drive alimenté par les équipes depuis
 * le terrain.
 *
 * Authentification par compte de service : c'est le seul mode qui fonctionne
 * sans interaction humaine sur la durée (un jeton OAuth utilisateur finit par
 * expirer). Le dossier Drive doit être **partagé avec l'adresse e-mail du
 * compte de service**, sinon il apparaît vide.
 */

const SCOPES = ["https://www.googleapis.com/auth/drive"];

const loadCredentials = async (): Promise<Record<string, unknown>> => {
  const config = env();

  if (config.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
    return JSON.parse(
      Buffer.from(config.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, "base64").toString("utf8"),
    );
  }

  if (config.GOOGLE_SERVICE_ACCOUNT_FILE) {
    return JSON.parse(await readFile(config.GOOGLE_SERVICE_ACCOUNT_FILE, "utf8"));
  }

  throw new MissingConfigError("Google Drive", [
    "GOOGLE_SERVICE_ACCOUNT_FILE",
    "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64",
  ]);
};

const driveClient = async (): Promise<drive_v3.Drive> => {
  const credentials = await loadCredentials();
  const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  return google.drive({ version: "v3", auth });
};

/**
 * Liste les photos du dossier, de la plus ancienne à la plus récente, en
 * excluant celles déjà publiées.
 */
export const listNewPhotos = async (
  usedIds: ReadonlySet<string>,
): Promise<drive_v3.Schema$File[]> => {
  if (!hasDriveConfig()) {
    throw new MissingConfigError("Google Drive", [
      "GOOGLE_DRIVE_FOLDER_ID",
      "GOOGLE_SERVICE_ACCOUNT_FILE",
    ]);
  }

  const drive = await driveClient();
  const folderId = env().GOOGLE_DRIVE_FOLDER_ID as string;

  const response = await withRetry("Google Drive (liste)", () =>
    drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: "files(id, name, mimeType, createdTime, size)",
      orderBy: "createdTime",
      pageSize: 50,
    }),
  );

  const files = response.data.files ?? [];
  return files.filter((file) => file.id && !usedIds.has(file.id));
};

/** Télécharge une photo Drive dans le dossier de travail. */
export const downloadPhoto = async (
  file: drive_v3.Schema$File,
  targetDir: string,
): Promise<SourcePhoto> => {
  if (!file.id || !file.name) {
    throw new Error("Fichier Drive sans identifiant ni nom.");
  }

  await mkdir(targetDir, { recursive: true });
  const localPath = join(targetDir, `${file.id}-${sanitize(file.name)}`);

  const drive = await driveClient();
  const response = await withRetry("Google Drive (téléchargement)", () =>
    drive.files.get(
      { fileId: file.id as string, alt: "media" },
      { responseType: "stream" },
    ),
  );

  await pipeline(response.data, createWriteStream(localPath));
  logger.info(`Photo téléchargée : ${file.name}`);

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType ?? "image/jpeg",
    localPath,
    createdTime: file.createdTime ?? undefined,
  };
};

/**
 * Déplace la photo publiée vers le dossier d'archive, si celui-ci est
 * configuré. Sans archive, le suivi repose uniquement sur l'historique local.
 */
export const archivePhoto = async (fileId: string): Promise<void> => {
  const archiveId = env().GOOGLE_DRIVE_ARCHIVE_FOLDER_ID;
  if (!archiveId) return;

  const drive = await driveClient();

  await withRetry("Google Drive (archivage)", async () => {
    const current = await drive.files.get({ fileId, fields: "parents" });
    const parents = current.data.parents?.join(",") ?? "";

    await drive.files.update({
      fileId,
      addParents: archiveId,
      removeParents: parents,
      fields: "id, parents",
    });
  });

  logger.info(`Photo archivée dans Drive : ${fileId}`);
};

const sanitize = (name: string): string =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
