import { writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { brand } from "../../config/brand.js";
import type { Angle } from "../../config/angles.js";
import { env } from "../env.js";
import { logger } from "../logger.js";
import { HttpError, withRetry } from "../retry.js";
import type { CalendarContext } from "../types.js";
import { generateBrandCard } from "./brandCard.js";

/**
 * Fabrication du visuel lorsqu'aucune photo n'est disponible.
 *
 * Deux fournisseurs : la carte de marque rendue en HTML (défaut, gratuite,
 * toujours identique à la charte) et un générateur d'images IA (optionnel).
 * La carte reste le défaut parce qu'un générateur d'images écrit mal le
 * français et ne respecte pas des couleurs imposées de façon fiable.
 */

export type VisualRequest = {
  angle: Angle;
  topic: string;
  calendar: CalendarContext;
  outputPath: string;
};

export const generateVisual = async (request: VisualRequest): Promise<string> => {
  if (env().IMAGE_PROVIDER === "openai") {
    try {
      return await generateWithOpenAi(request);
    } catch (error) {
      // Le visuel ne doit jamais bloquer la publication : on retombe sur la
      // carte de marque, qui ne dépend d'aucun service externe.
      logger.warn(
        "Génération OpenAI impossible, repli sur la carte de marque",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return generateBrandCard(
    {
      kicker: request.angle.label,
      headline: toHeadline(request.topic),
      footnote: `Devis sous ${brand.quoteDelay} · ${brand.phone}`,
    },
    request.outputPath,
  );
};

/**
 * Le sujet est rédigé pour un humain ; sur un visuel il doit tenir en une
 * phrase courte, sans point final.
 */
export const toHeadline = (topic: string): string => {
  const firstSentence = topic.split(/[.!?]/)[0]?.trim() ?? topic;
  const trimmed = firstSentence.length > 110
    ? `${firstSentence.slice(0, 107).trimEnd()}…`
    : firstSentence;

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const generateWithOpenAi = async (request: VisualRequest): Promise<string> => {
  const config = env();
  if (!config.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY absent alors que IMAGE_PROVIDER vaut « openai ».");
  }

  const prompt = [
    "Visuel de communication d'entreprise, format portrait, haut de gamme, minimaliste et moderne.",
    `Palette stricte : bleu marine ${brand.colors.navy}, doré ${brand.colors.gold}, blanc cassé ${brand.colors.white}.`,
    "Composition épurée, beaucoup d'espace vide, lumière douce, style photographique éditorial.",
    `Sujet : ${request.topic}. Secteur : propreté et multiservices professionnels.`,
    "Aucun texte, aucune lettre, aucun logo dans l'image.",
  ].join(" ");

  const response = await withRetry("OpenAI Images", async () => {
    const result = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.OPENAI_IMAGE_MODEL,
        prompt,
        size: "1024x1536",
        n: 1,
      }),
    });

    if (!result.ok) {
      throw new HttpError(
        result.status,
        await result.text(),
        "https://api.openai.com/v1/images/generations",
      );
    }

    return (await result.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  });

  const image = response.data?.[0];
  await mkdir(dirname(request.outputPath), { recursive: true });

  if (image?.b64_json) {
    await writeFile(request.outputPath, Buffer.from(image.b64_json, "base64"));
  } else if (image?.url) {
    const download = await fetch(image.url);
    await writeFile(request.outputPath, Buffer.from(await download.arrayBuffer()));
  } else {
    throw new Error("Réponse OpenAI sans image exploitable.");
  }

  logger.info(`Visuel généré par OpenAI : ${request.outputPath}`);
  return request.outputPath;
};
