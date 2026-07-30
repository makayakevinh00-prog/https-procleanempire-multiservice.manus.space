import { logger } from "./logger.js";

/**
 * Réessai avec attente exponentielle.
 *
 * Utilisé pour tout appel réseau : modèle, Drive, Buffer. Trois tentatives par
 * défaut, comme demandé pour la publication.
 */
export const withRetry = async <T>(
  label: string,
  operation: () => Promise<T>,
  options: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> => {
  const attempts = options.attempts ?? 3;
  const baseDelay = options.baseDelayMs ?? 2000;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error) || attempt === attempts) break;

      const delay = baseDelay * 2 ** (attempt - 1);
      logger.warn(
        `${label} : échec de la tentative ${attempt}/${attempts}, nouvelle tentative dans ${delay / 1000}s`,
        error instanceof Error ? error.message : String(error),
      );
      await sleep(delay);
    }
  }

  throw new RetryError(label, attempts, lastError);
};

export class RetryError extends Error {
  constructor(
    readonly label: string,
    readonly attempts: number,
    override readonly cause: unknown,
  ) {
    super(
      `${label} : abandon après ${attempts} tentative(s) — ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    this.name = "RetryError";
  }
}

/**
 * Une erreur d'authentification ou de requête malformée ne se règle pas en
 * réessayant : on échoue tout de suite plutôt que d'attendre trois fois.
 */
const isRetryable = (error: unknown): boolean => {
  if (error instanceof HttpError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return true;
};

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    url: string,
  ) {
    super(`HTTP ${status} sur ${url} — ${body.slice(0, 300)}`);
    this.name = "HttpError";
  }
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
