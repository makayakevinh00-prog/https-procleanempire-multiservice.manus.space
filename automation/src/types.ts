import { z } from "zod";
import type { AngleId } from "../config/angles.js";
import type { AudienceId } from "../config/audiences.js";
import { platformIds, type PlatformId } from "../config/platforms.js";

/** Photo candidate à publication, provenant de Drive ou du disque local. */
export type SourcePhoto = {
  id: string;
  name: string;
  mimeType: string;
  /** Chemin du fichier téléchargé localement. */
  localPath: string;
  createdTime?: string;
};

/** Résultat de l'analyse visuelle par le modèle. */
export const photoAnalysisSchema = z.object({
  serviceType: z
    .string()
    .describe("Prestation identifiée : vitres, bureaux, voiture, sols, canapé…"),
  subject: z.string().describe("Ce que l'on voit, en une phrase factuelle"),
  notableElements: z.array(z.string()).min(1).max(6),
  isBeforeAfter: z.boolean(),
  quality: z.enum(["publiable", "moyenne", "inexploitable"]),
  /** Raison si la photo est jugée inexploitable. */
  reason: z.string().optional(),
});

export type PhotoAnalysis = z.infer<typeof photoAnalysisSchema>;

/** Contexte calendaire injecté dans la rédaction. */
export type CalendarContext = {
  date: string;
  weekday: string;
  season: "hiver" | "printemps" | "été" | "automne";
  /** Jour férié ou évènement du jour, s'il y en a un. */
  occasion: string | null;
  /** Consigne éditoriale liée au jour de la semaine. */
  weekdayGuidance: string;
  /** Consigne éditoriale liée à la saison. */
  seasonGuidance: string;
};

const platformPostSchema = z.object({
  body: z.string().min(1),
  cta: z.string().min(1),
  hashtags: z.array(z.string()).min(6).max(15),
});

export const generatedPostSchema = z.object({
  /** Sujet en une phrase, sert au contrôle anti-répétition. */
  topic: z.string().min(1),
  instagram: platformPostSchema,
  facebook: platformPostSchema,
  linkedin: platformPostSchema,
  tiktok: platformPostSchema,
});

export type GeneratedPost = z.infer<typeof generatedPostSchema>;
export type PlatformPost = z.infer<typeof platformPostSchema>;

/** Publication complète, prête à être planifiée. */
export type Post = {
  id: string;
  createdAt: string;
  scheduledFor: string;
  angle: AngleId;
  audience: AudienceId;
  topic: string;
  calendar: CalendarContext;
  /** Chemin du visuel joint (photo réelle ou visuel généré). */
  imagePath: string;
  imageSource: "drive" | "local" | "generated";
  photoAnalysis: PhotoAnalysis | null;
  content: Record<PlatformId, PlatformPost>;
};

/** Entrée d'historique, utilisée pour éviter les répétitions. */
export type HistoryEntry = {
  id: string;
  date: string;
  angle: AngleId;
  /** Absente des historiques créés avant l'introduction des cibles. */
  audience?: AudienceId;
  topic: string;
  /** Texte normalisé de la version Instagram, pour la comparaison. */
  fingerprint: string;
  hashtags: string[];
  serviceType: string | null;
};

export type PublishResult = {
  platform: PlatformId;
  status: "published" | "scheduled" | "skipped" | "failed";
  detail: string;
};

export const isPlatformId = (value: string): value is PlatformId =>
  (platformIds as string[]).includes(value);
