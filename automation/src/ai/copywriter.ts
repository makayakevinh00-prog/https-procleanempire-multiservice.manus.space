import { brand } from "../../config/brand.js";
import type { Angle } from "../../config/angles.js";
import type { Audience } from "../../config/audiences.js";
import { platforms, platformIds } from "../../config/platforms.js";
import { logger } from "../logger.js";
import {
  checkDuplicate,
  fingerprint,
  overusedHashtags,
  SIMILARITY_THRESHOLD,
} from "../planner/dedupe.js";
import {
  generatedPostSchema,
  type CalendarContext,
  type GeneratedPost,
  type HistoryEntry,
  type PhotoAnalysis,
} from "../types.js";
import { callModel, extractJson } from "./client.js";
import { bullets, fillTemplate, loadPrompt } from "./prompts.js";

/** Nombre de rédactions tentées avant d'accepter la moins ressemblante. */
const MAX_ATTEMPTS = 3;

export type CopyRequest = {
  angle: Angle;
  audience: Audience;
  calendar: CalendarContext;
  analysis: PhotoAnalysis | null;
  history: HistoryEntry[];
};

const describeMaterial = (analysis: PhotoAnalysis | null): string => {
  if (!analysis) {
    return [
      "Aucune photo disponible aujourd'hui : la publication s'appuie uniquement sur l'expertise métier.",
      "Le visuel sera une carte graphique aux couleurs de la marque : le texte ne doit donc décrire aucune image.",
    ].join("\n");
  }

  return [
    `Une photo réelle accompagne la publication.`,
    `- Prestation identifiée : ${analysis.serviceType}`,
    `- Ce que montre l'image : ${analysis.subject}`,
    `- Éléments remarquables : ${analysis.notableElements.join(", ")}`,
    analysis.isBeforeAfter
      ? "- L'image est une comparaison avant / après : le texte peut s'y appuyer."
      : "- L'image n'est pas une comparaison avant / après : ne fais pas semblant qu'elle en soit une.",
  ].join("\n");
};

const describePlatformRules = (): string =>
  platformIds
    .map((id) => {
      const platform = platforms[id];
      const [min, max] = platform.targetLength;
      const [tagMin, tagMax] = platform.hashtags;
      return `### ${platform.label} (\`${id}\`)\n- Longueur du corps visée : ${min} à ${max} caractères (maximum absolu ${platform.maxLength}).\n- Hashtags : ${tagMin} à ${tagMax}.\n- ${platform.guidance}`;
    })
    .join("\n\n");

const describeRecentTopics = (history: HistoryEntry[]): string => {
  const recent = history.slice(0, 12);
  if (recent.length === 0) return "- (aucune publication antérieure)";
  return recent
    .map(
      (entry) =>
        `- ${entry.date} — ${entry.angle}${entry.audience ? ` → ${entry.audience}` : ""} — ${entry.topic}`,
    )
    .join("\n");
};

/**
 * Rédige la publication du jour, puis vérifie qu'elle ne ressemble pas à une
 * publication récente. En cas de trop forte ressemblance, on relance en
 * indiquant explicitement au modèle ce qu'il vient de produire.
 */
export const writePost = async (request: CopyRequest): Promise<GeneratedPost> => {
  const template = await loadPrompt("copywriter");

  const basePrompt = fillTemplate(template, {
    VOICE_DO: bullets(brand.voice.do),
    VOICE_AVOID: bullets(brand.voice.avoid),
    DATE: request.calendar.date,
    WEEKDAY: request.calendar.weekday,
    SEASON: request.calendar.season,
    SEASON_GUIDANCE: request.calendar.seasonGuidance,
    WEEKDAY_GUIDANCE: request.calendar.weekdayGuidance,
    OCCASION: request.calendar.occasion ?? "aucun évènement particulier",
    ANGLE_LABEL: request.angle.label,
    ANGLE_BRIEF: request.angle.brief,
    AUDIENCE_LABEL: request.audience.label,
    AUDIENCE_BRIEF: request.audience.brief,
    MATERIAL: describeMaterial(request.analysis),
    RECENT_TOPICS: describeRecentTopics(request.history),
    OVERUSED_HASHTAGS:
      overusedHashtags(request.history).join(", ") || "(aucun pour l'instant)",
    PLATFORM_RULES: describePlatformRules(),
    WEBSITE: brand.website,
    PHONE: brand.phone,
  });

  let best: { post: GeneratedPost; score: number } | null = null;
  let extraInstruction = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const raw = await callModel({
      task: "copy",
      system: basePrompt,
      user:
        `Rédige la publication du ${request.calendar.date}.` +
        (extraInstruction ? `\n\n${extraInstruction}` : ""),
      maxTokens: 4000,
      // Un peu de température : à 0, le modèle réécrit presque le même texte
      // d'un jour à l'autre, ce qui est exactement ce qu'on cherche à éviter.
      temperature: 1,
    });

    const parsed = generatedPostSchema.safeParse(
      extractJson(raw, "la rédaction de la publication"),
    );

    if (!parsed.success) {
      logger.warn(
        `Rédaction invalide (tentative ${attempt}/${MAX_ATTEMPTS}), nouvelle tentative`,
        parsed.error.issues.slice(0, 5),
      );
      extraInstruction =
        "La réponse précédente n'était pas un JSON conforme au schéma demandé. Renvoie strictement l'objet JSON attendu.";
      continue;
    }

    const post = parsed.data;
    const duplicate = checkDuplicate(
      fingerprint(post.instagram.body),
      request.history,
    );

    if (!duplicate.isDuplicate) {
      if (attempt > 1) {
        logger.info(`Rédaction acceptée à la tentative ${attempt}`);
      }
      return post;
    }

    logger.warn(
      `Trop proche d'une publication du ${duplicate.against?.date} ` +
        `(similarité ${duplicate.score.toFixed(2)} ≥ ${SIMILARITY_THRESHOLD}), nouvelle rédaction`,
    );

    if (!best || duplicate.score < best.score) {
      best = { post, score: duplicate.score };
    }

    extraInstruction = [
      `Ta proposition précédente ressemblait trop à la publication du ${duplicate.against?.date} sur le sujet « ${duplicate.against?.topic} ».`,
      "Change de sujet précis à l'intérieur du même angle, et change complètement la structure et les tournures.",
    ].join("\n");
  }

  if (!best) {
    throw new Error(
      `Aucune rédaction exploitable après ${MAX_ATTEMPTS} tentatives.`,
    );
  }

  logger.warn(
    `Aucune version suffisamment originale après ${MAX_ATTEMPTS} tentatives : ` +
      `publication de la moins ressemblante (similarité ${best.score.toFixed(2)}).`,
  );

  return best.post;
};
