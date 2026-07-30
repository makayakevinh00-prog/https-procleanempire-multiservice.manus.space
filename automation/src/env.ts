import "dotenv/config";
import { z } from "zod";

/**
 * Configuration par variables d'environnement.
 *
 * Rien n'est obligatoire au chargement : le projet doit pouvoir tourner en
 * `--dry-run` sans aucune clé. Chaque brique vérifie ce dont elle a besoin au
 * moment de s'en servir, via les helpers `require*` en bas de fichier.
 */

const bool = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((value) =>
      value === undefined || value === ""
        ? defaultValue
        : ["1", "true", "yes", "on"].includes(value.toLowerCase()),
    );

const envSchema = z.object({
  // ─── Modèle de langage ────────────────────────────────────────────────
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),
  /** Contenu factice déterministe : permet de tester tout le pipeline hors ligne. */
  MOCK_AI: bool(false),

  // ─── Google Drive ─────────────────────────────────────────────────────
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),
  /** Dossier où déplacer les photos déjà publiées (facultatif). */
  GOOGLE_DRIVE_ARCHIVE_FOLDER_ID: z.string().optional(),
  /** Chemin vers le JSON du compte de service. */
  GOOGLE_SERVICE_ACCOUNT_FILE: z.string().optional(),
  /** Alternative : le même JSON encodé en base64 (pratique en CI). */
  GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: z.string().optional(),

  /** Source de secours : un dossier local de photos. */
  LOCAL_PHOTOS_DIR: z.string().optional(),

  // ─── Publication ──────────────────────────────────────────────────────
  BUFFER_ACCESS_TOKEN: z.string().optional(),
  BUFFER_PROFILE_INSTAGRAM: z.string().optional(),
  BUFFER_PROFILE_FACEBOOK: z.string().optional(),
  BUFFER_PROFILE_LINKEDIN: z.string().optional(),
  BUFFER_PROFILE_TIKTOK: z.string().optional(),
  /** Heure de publication programmée, format HH:mm. */
  PUBLISH_TIME: z.string().regex(/^\d{2}:\d{2}$/).default("08:00"),
  TIMEZONE: z.string().default("Europe/Paris"),
  /** N'écrit rien en ligne : les publications sont seulement enregistrées. */
  DRY_RUN: bool(false),

  // ─── Visuels ──────────────────────────────────────────────────────────
  IMAGE_PROVIDER: z.enum(["brand-card", "openai"]).default("brand-card"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-1"),
  /**
   * Chrome/Chromium utilisé pour rendre les visuels de marque.
   * Laisser vide pour utiliser celui installé par Playwright.
   */
  CHROMIUM_EXECUTABLE: z.string().optional(),

  // ─── Notifications ────────────────────────────────────────────────────
  /** Webhook appelé en cas d'échec (n8n, Slack, Discord…). */
  NOTIFY_WEBHOOK_URL: z.string().url().optional(),

  // ─── Stockage ─────────────────────────────────────────────────────────
  POSTS_DIR: z.string().default("posts"),
  ASSETS_DIR: z.string().default("assets"),
  STATE_FILE: z.string().default("posts/history.json"),
  /** Nombre de publications conservées pour le contrôle anti-répétition. */
  HISTORY_WINDOW: z.coerce.number().int().positive().default(60),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export const env = (): Env => {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuration invalide :\n${issues}`);
  }

  cached = parsed.data;
  return cached;
};

/** Réinitialise le cache — utilisé par les tests. */
export const resetEnv = () => {
  cached = null;
};

export class MissingConfigError extends Error {
  constructor(what: string, vars: string[]) {
    super(
      `${what} n'est pas configuré. Renseignez : ${vars.join(", ")} (voir .env.example).`,
    );
    this.name = "MissingConfigError";
  }
}

export const requireAnthropic = (): string => {
  const key = env().ANTHROPIC_API_KEY;
  if (!key) {
    throw new MissingConfigError("Le modèle de langage", ["ANTHROPIC_API_KEY"]);
  }
  return key;
};

export const hasDriveConfig = (): boolean => {
  const config = env();
  return Boolean(
    config.GOOGLE_DRIVE_FOLDER_ID &&
      (config.GOOGLE_SERVICE_ACCOUNT_FILE ||
        config.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64),
  );
};

export const hasBufferConfig = (): boolean => Boolean(env().BUFFER_ACCESS_TOKEN);
