export type SocialPlatform = "tiktok" | "instagram_reels" | "youtube_shorts";
export type VideoObjective = "conversion" | "education" | "before_after" | "authority";

export type RushClipInput = {
  id: string;
  label: string;
  durationSec: number;
  hookStrength: number;
  visualQuality: number;
  actionDensity: number;
  speechClarity: number;
  relevance: number;
  hasHumanFace: boolean;
  hasBeforeAfterReveal: boolean;
};

type PlatformProfile = {
  label: string;
  idealDurationSec: number;
  hardMaxDurationSec: number;
  maxClipDurationSec: number;
  firstHookWindowSec: number;
  cutPaceSec: number;
};

export type OptimizedClip = RushClipInput & {
  score: number;
  keepDurationSec: number;
  reason: string;
};

export type DropOffAlert = {
  atSecond: number;
  severity: "low" | "medium" | "high";
  message: string;
};

export type GeneratedVideoPlan = {
  id: string;
  title: string;
  angle: string;
  platformLabel: string;
  estimatedDurationSec: number;
  targetDurationSec: number;
  openingHook: string;
  subtitleStyle: string;
  captionTemplate: string;
  ctaLine: string;
  trendAudioSuggestions: string[];
  timeline: OptimizedClip[];
  dropOffAlerts: DropOffAlert[];
  publishMoment: string;
};

export type MultiVideoPlanResult = {
  objectiveLabel: string;
  plans: GeneratedVideoPlan[];
};

const platformProfiles: Record<SocialPlatform, PlatformProfile> = {
  tiktok: {
    label: "TikTok",
    idealDurationSec: 24,
    hardMaxDurationSec: 36,
    maxClipDurationSec: 4,
    firstHookWindowSec: 1.7,
    cutPaceSec: 1.8
  },
  instagram_reels: {
    label: "Instagram Reels",
    idealDurationSec: 28,
    hardMaxDurationSec: 40,
    maxClipDurationSec: 5,
    firstHookWindowSec: 2,
    cutPaceSec: 2.2
  },
  youtube_shorts: {
    label: "YouTube Shorts",
    idealDurationSec: 34,
    hardMaxDurationSec: 50,
    maxClipDurationSec: 6,
    firstHookWindowSec: 2.3,
    cutPaceSec: 2.5
  }
};

const objectiveLabels: Record<VideoObjective, string> = {
  conversion: "Conversion client",
  education: "Éducation / conseils",
  before_after: "Avant / après transformation",
  authority: "Preuve d'expertise"
};

const objectiveBoosts: Record<VideoObjective, Partial<Record<keyof RushClipInput, number>>> = {
  conversion: {
    relevance: 1.5,
    hasHumanFace: 1.4
  },
  education: {
    speechClarity: 1.7,
    relevance: 1.4
  },
  before_after: {
    hasBeforeAfterReveal: 2.2,
    actionDensity: 1.2
  },
  authority: {
    visualQuality: 1.5,
    speechClarity: 1.4
  }
};

const objectiveAngles: Record<VideoObjective, string[]> = {
  conversion: ["Résultat immédiat", "Objection client", "Preuve sociale", "Offre claire"],
  education: ["Erreur fréquente", "Checklist rapide", "Astuce pro", "Comparatif simple"],
  before_after: ["Reveal choc", "Transformation étape par étape", "Mini making-of", "Top 3 changements"],
  authority: ["Preuve méthode", "Coulisses process", "Standard qualité", "Pourquoi ça marche"]
};

const publishMoments = [
  "Créneau recommandé: 12h30-13h30",
  "Créneau recommandé: 18h00-19h30",
  "Créneau recommandé: 20h30-22h00",
  "Créneau recommandé: 09h00-10h00"
];

const audioThemeMap: Record<string, string[]> = {
  nettoyage: [
    "House minimal avec montée progressive (120-124 BPM)",
    "Beat drill léger + impacts avant/après",
    "Afro-house soft tendance Reels avec percussions claires"
  ],
  detailing: [
    "Phonk doux (pas agressif) pour cuts serrés",
    "Deep house clean transitions",
    "Trap ambience avec hits sur transitions"
  ],
  default: [
    "Pop électronique rythmée (tendance courte vidéo)",
    "House dynamique sans voix trop présente",
    "Instrumental punchy avec drops légers"
  ]
};

function normalizeScore(input: number): number {
  return Math.min(5, Math.max(1, input));
}

function getClipScore(clip: RushClipInput, objective: VideoObjective): number {
  const base =
    normalizeScore(clip.hookStrength) * 2.2 +
    normalizeScore(clip.visualQuality) * 1.8 +
    normalizeScore(clip.actionDensity) * 1.6 +
    normalizeScore(clip.speechClarity) * 1.3 +
    normalizeScore(clip.relevance) * 2.1;

  const boostConfig = objectiveBoosts[objective];
  let bonus = 0;

  if (boostConfig.relevance) {
    bonus += normalizeScore(clip.relevance) * boostConfig.relevance;
  }
  if (boostConfig.speechClarity) {
    bonus += normalizeScore(clip.speechClarity) * boostConfig.speechClarity;
  }
  if (boostConfig.visualQuality) {
    bonus += normalizeScore(clip.visualQuality) * boostConfig.visualQuality;
  }
  if (boostConfig.actionDensity) {
    bonus += normalizeScore(clip.actionDensity) * boostConfig.actionDensity;
  }
  if (boostConfig.hasHumanFace && clip.hasHumanFace) {
    bonus += 3;
  }
  if (boostConfig.hasBeforeAfterReveal && clip.hasBeforeAfterReveal) {
    bonus += 4;
  }

  return Number((base + bonus).toFixed(2));
}

function getSubtitleStyle(platform: SocialPlatform): string {
  if (platform === "tiktok") {
    return "Sous-titres centrés, mots-clés en jaune, animation mot-par-mot rapide.";
  }
  if (platform === "instagram_reels") {
    return "Sous-titres bas écran, style clean blanc + contour noir, 4 à 6 mots par ligne.";
  }
  return "Sous-titres dynamiques type Shorts, transitions légères et ponctuation visuelle.";
}

function getCaptionTemplate(theme: string, objective: VideoObjective, angle: string): string {
  const subject = theme.trim() || "ce sujet";
  if (objective === "education") {
    return `${angle}: 3 erreurs qui ruinent ${subject}. Laquelle vous faites encore ?`;
  }
  if (objective === "before_after") {
    return `${angle} en moins de 30 sec sur ${subject}. Vous notez le résultat combien /10 ?`;
  }
  if (objective === "authority") {
    return `${angle}: notre protocole pro sur ${subject}, version ultra courte.`;
  }
  return `${angle}: vous voulez ce niveau de résultat en ${subject} ? Commentez "INFO".`;
}

function getCtaLine(objective: VideoObjective): string {
  if (objective === "education") {
    return "CTA final: « Abonnez-vous pour la partie 2 »";
  }
  if (objective === "before_after") {
    return "CTA final: « Vous voulez la même transformation ? DM 'AVANTAPRES' »";
  }
  if (objective === "authority") {
    return "CTA final: « Commentez 'CHECKLIST' pour recevoir la méthode »";
  }
  return "CTA final: « Écrivez 'DEVIS' en commentaire pour qu'on vous contacte »";
}

function getTrendAudio(theme: string): string[] {
  const normalizedTheme = theme.trim().toLowerCase();
  return audioThemeMap[normalizedTheme] ?? audioThemeMap.default;
}

function getOpeningHook(theme: string, angle: string, profile: PlatformProfile): string {
  const cleanedTheme = theme.trim() || "votre sujet";
  return `${angle}: montrez un résultat fort dans les ${profile.firstHookWindowSec}s puis enchaînez sur ${cleanedTheme} sans intro longue.`;
}

function buildTimeline(params: {
  rankedClips: (RushClipInput & { score: number })[];
  profile: PlatformProfile;
  rotationOffset: number;
}): { timeline: OptimizedClip[]; estimatedDurationSec: number } {
  const { rankedClips, profile, rotationOffset } = params;
  const rotated = [
    ...rankedClips.slice(rotationOffset),
    ...rankedClips.slice(0, Math.min(rotationOffset, rankedClips.length))
  ];

  const timeline: OptimizedClip[] = [];
  let totalDuration = 0;

  for (const clip of rotated) {
    if (totalDuration >= profile.hardMaxDurationSec) {
      break;
    }

    const keepDurationSec = Math.min(
      clip.durationSec,
      profile.maxClipDurationSec,
      Math.max(1.4, profile.cutPaceSec + clip.actionDensity * 0.35)
    );

    if (totalDuration + keepDurationSec > profile.hardMaxDurationSec + 0.7) {
      continue;
    }

    const reason =
      clip.hookStrength >= 4
        ? "Très bon hook, à placer tôt."
        : clip.hasBeforeAfterReveal
          ? "Segment clé avant/après à conserver."
          : clip.speechClarity >= 4
            ? "Clair pour la compréhension et la rétention."
            : "Bon score global pour maintenir le rythme.";

    timeline.push({
      ...clip,
      keepDurationSec: Number(keepDurationSec.toFixed(1)),
      reason
    });

    totalDuration += keepDurationSec;

    if (totalDuration >= profile.idealDurationSec && timeline.length >= 4) {
      break;
    }
  }

  return { timeline, estimatedDurationSec: Number(totalDuration.toFixed(1)) };
}

function buildDropOffAlerts(timeline: OptimizedClip[]): DropOffAlert[] {
  const alerts: DropOffAlert[] = [];
  let cursor = 0;

  for (const clip of timeline) {
    const lowHook = clip.hookStrength <= 2;
    const lowAction = clip.actionDensity <= 2;

    if (lowHook || lowAction) {
      alerts.push({
        atSecond: Number(cursor.toFixed(1)),
        severity: lowHook && lowAction ? "high" : "medium",
        message:
          lowHook && lowAction
            ? "Risque fort de décrochage: ajoutez zoom, texte choc ou jump cut ici."
            : "Segment plus faible: accélérer à 1.1x ou superposer sous-titre punchy."
      });
    }

    cursor += clip.keepDurationSec;
  }

  return alerts;
}

function pickPlanPlatforms(basePlatform: SocialPlatform, count: number, crossPost: boolean): SocialPlatform[] {
  if (!crossPost) {
    return Array.from({ length: count }, () => basePlatform);
  }

  const allPlatforms: SocialPlatform[] = ["instagram_reels", "tiktok", "youtube_shorts"];
  const startsWith = [basePlatform, ...allPlatforms.filter((item) => item !== basePlatform)];
  return Array.from({ length: count }, (_, index) => startsWith[index % startsWith.length]);
}

export function generateMultiVideoPlans(params: {
  clips: RushClipInput[];
  basePlatform: SocialPlatform;
  objective: VideoObjective;
  theme: string;
  variantsCount: number;
  crossPostPlatforms: boolean;
}): MultiVideoPlanResult {
  const { clips, basePlatform, objective, theme, variantsCount, crossPostPlatforms } = params;
  const count = Math.max(1, Math.min(6, variantsCount));

  const ranked = [...clips]
    .map((clip) => ({
      ...clip,
      score: getClipScore(clip, objective)
    }))
    .sort((a, b) => b.score - a.score);

  const platformSequence = pickPlanPlatforms(basePlatform, count, crossPostPlatforms);
  const angles = objectiveAngles[objective];

  const plans: GeneratedVideoPlan[] = platformSequence.map((platform, index) => {
    const profile = platformProfiles[platform];
    const angle = angles[index % angles.length];
    const rotationOffset = ranked.length === 0 ? 0 : index % ranked.length;
    const { timeline, estimatedDurationSec } = buildTimeline({
      rankedClips: ranked,
      profile,
      rotationOffset
    });

    return {
      id: `plan-${index + 1}`,
      title: `Vidéo ${index + 1}`,
      angle,
      platformLabel: profile.label,
      estimatedDurationSec,
      targetDurationSec: profile.idealDurationSec,
      openingHook: getOpeningHook(theme, angle, profile),
      subtitleStyle: getSubtitleStyle(platform),
      captionTemplate: getCaptionTemplate(theme, objective, angle),
      ctaLine: getCtaLine(objective),
      trendAudioSuggestions: getTrendAudio(theme),
      timeline,
      dropOffAlerts: buildDropOffAlerts(timeline),
      publishMoment: publishMoments[index % publishMoments.length]
    };
  });

  return {
    objectiveLabel: objectiveLabels[objective],
    plans
  };
}
