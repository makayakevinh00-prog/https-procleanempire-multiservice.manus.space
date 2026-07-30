import Anthropic from "@anthropic-ai/sdk";
import { env, requireAnthropic } from "../env.js";
import { logger } from "../logger.js";
import { withRetry } from "../retry.js";
import { mockResponse, type MockTask } from "./mock.js";

/**
 * Accès au modèle. Une seule porte d'entrée, pour que le mode hors ligne
 * (`MOCK_AI=1`) couvre réellement tout le pipeline.
 */

export type ModelImage = {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
};

export type ModelCall = {
  /** Sert au routage des réponses factices en mode MOCK_AI. */
  task: MockTask;
  system: string;
  user: string;
  image?: ModelImage;
  maxTokens?: number;
  temperature?: number;
};

let client: Anthropic | null = null;

const getClient = (): Anthropic => {
  if (!client) client = new Anthropic({ apiKey: requireAnthropic() });
  return client;
};

export const callModel = async (call: ModelCall): Promise<string> => {
  if (env().MOCK_AI) {
    logger.debug(`MOCK_AI : réponse factice pour « ${call.task} »`);
    return mockResponse(call.task, call.user);
  }

  const content: Anthropic.MessageParam["content"] = [];

  if (call.image) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: call.image.mediaType,
        data: call.image.base64,
      },
    });
  }

  content.push({ type: "text", text: call.user });

  const response = await withRetry(`modèle (${call.task})`, () =>
    getClient().messages.create({
      model: env().ANTHROPIC_MODEL,
      max_tokens: call.maxTokens ?? 4000,
      temperature: call.temperature ?? 1,
      system: call.system,
      messages: [{ role: "user", content }],
    }),
  );

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) throw new Error(`Le modèle n'a rien renvoyé pour « ${call.task} ».`);

  return text;
};

/**
 * Extrait le premier objet JSON d'une réponse.
 *
 * Même avec une consigne explicite, un modèle encadre parfois sa réponse d'un
 * bloc de code ou d'une phrase d'introduction : on récupère l'objet plutôt que
 * d'échouer sur du bruit.
 */
export const extractJson = <T>(raw: string, context: string): T => {
  const withoutFence = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `Réponse non exploitable pour ${context} : aucun objet JSON trouvé.\n${raw.slice(0, 500)}`,
    );
  }

  const candidate = withoutFence.slice(start, end + 1);

  try {
    return JSON.parse(candidate) as T;
  } catch (error) {
    throw new Error(
      `JSON invalide pour ${context} : ${(error as Error).message}\n${candidate.slice(0, 500)}`,
    );
  }
};
