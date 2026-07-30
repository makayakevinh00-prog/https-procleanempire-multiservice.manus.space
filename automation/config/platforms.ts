/**
 * Contraintes et registre propres à chaque réseau. Le rédacteur reçoit ces
 * consignes pour produire quatre versions réellement différentes — et non la
 * même publication recopiée quatre fois.
 */

export type PlatformId = "instagram" | "facebook" | "linkedin" | "tiktok";

export type PlatformConfig = {
  id: PlatformId;
  label: string;
  /** Longueur maximale acceptée par le réseau, hashtags compris. */
  maxLength: number;
  /** Longueur visée par la rédaction (bien en dessous du maximum). */
  targetLength: [min: number, max: number];
  hashtags: [min: number, max: number];
  guidance: string;
};

export const platforms: Record<PlatformId, PlatformConfig> = {
  instagram: {
    id: "instagram",
    label: "Instagram",
    maxLength: 2200,
    targetLength: [400, 900],
    hashtags: [8, 12],
    guidance:
      "Première ligne = accroche autonome : c'est tout ce qui s'affiche avant « plus ». Paragraphes courts séparés par une ligne vide. 2 emojis maximum, jamais dans la première phrase.",
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    maxLength: 5000,
    targetLength: [300, 700],
    hashtags: [8, 12],
    guidance:
      "Ton conversationnel et local, lectorat plus âgé qu'Instagram. Mentionner la zone d'intervention. Terminer par une question ouverte avant l'appel à l'action.",
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    maxLength: 3000,
    targetLength: [600, 1200],
    hashtags: [8, 12],
    guidance:
      "Registre B2B : dirigeants, office managers, services généraux. Angle gestion, image de l'entreprise, continuité d'exploitation. Aucun emoji. Pas de storytelling personnel excessif.",
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    maxLength: 2200,
    targetLength: [80, 220],
    hashtags: [8, 12],
    guidance:
      "Très court, oral, frontal. La première phrase est une accroche qui donne envie de regarder la vidéo. Tutoiement accepté ici uniquement.",
  },
};

export const platformIds = Object.keys(platforms) as PlatformId[];
