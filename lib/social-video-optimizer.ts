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

export type OptimizationResult = {
  platformLabel: string;
  objectiveLabel: string;
  targetDurationSec: number;
  estimatedDurationSec: number;
  openingHook: string;
  subtitleStyle: string;
  captionTemplate: string;
  ctaLine: string;
  trendAudioSuggestions: string[];
  timeline: OptimizedClip[];
  dropOffAlerts: DropOffAlert[];
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

function getOpeningHook(theme: string, objective: VideoObjective, profile: PlatformProfile): string {
  const cleanedTheme = theme.trim() || "votre sujet";

  if (objective === "before_after") {
    return `Montrez le résultat final en moins de ${profile.firstHookWindowSec}s puis révélez le avant/après de ${cleanedTheme}.`;
  }
  if (objective === "education") {
    return `Commencez par la promesse: "Voici l'erreur n°1 en ${cleanedTheme}" puis enchaînez immédiatement sur une preuve visuelle.`;
  }
  if (objective === "conversion") {
    return `Hook direct: "Vous voulez ce résultat en ${cleanedTheme} ? Regardez ça." puis cut sur l'élément le plus satisfaisant.`;
  }
  return `Hook crédibilité: "Technique pro utilisée en ${cleanedTheme}" + plan rapproché d'exécution dans les ${profile.firstHookWindowSec}s.`;
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

function getCaptionTemplate(theme: string, objective: VideoObjective): string {
  const subject = theme.trim() || "ce sujet";
  if (objective === "education") {
    return `3 erreurs qui ruinent ${subject} (et comment les éviter). Laquelle vous faites encore ?`;
  }
  if (objective === "before_after") {
    return `Avant/Après ${subject} en moins de 30 sec. Vous notez combien /10 le résultat ?`;
  }
  if (objective === "authority") {
    return `Notre protocole pro pour ${subject}, étape par étape. Vous voulez le process complet ?`;
  }
  return `Si vous voulez ce niveau de résultat en ${subject}, écrivez "INFO" en commentaire.`;
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

export function optimizeSocialVideo(params: {
  clips: RushClipInput[];
  platform: SocialPlatform;
  objective: VideoObjective;
  theme: string;
}): OptimizationResult {
  const { clips, platform, objective, theme } = params;
  const profile = platformProfiles[platform];

  const ranked = [...clips]
    .map((clip) => ({
      ...clip,
      score: getClipScore(clip, objective)
    }))
    .sort((a, b) => b.score - a.score);

  const timeline: OptimizedClip[] = [];
  let totalDuration = 0;

  for (const clip of ranked) {
    if (totalDuration >= profile.hardMaxDurationSec) {
      break;
    }

    const keepDurationSec = Math.min(
      clip.durationSec,
      profile.maxClipDurationSec,
      Math.max(1.5, profile.cutPaceSec + clip.actionDensity * 0.35)
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

  const dropOffAlerts: DropOffAlert[] = [];
  let runningCursor = 0;
  for (const clip of timeline) {
    const lowHook = clip.hookStrength <= 2;
    const lowAction = clip.actionDensity <= 2;

    if (lowHook || lowAction) {
      dropOffAlerts.push({
        atSecond: Number(runningCursor.toFixed(1)),
        severity: lowHook && lowAction ? "high" : "medium",
        message:
          lowHook && lowAction
            ? "Risque fort de décrochage: ajoutez zoom, texte choc ou jump cut ici."
            : "Segment plus faible: accélérer à 1.1x ou superposer sous-titre punchy."
      });
    }

    runningCursor += clip.keepDurationSec;
  }

  return {
    platformLabel: profile.label,
    objectiveLabel: objectiveLabels[objective],
    targetDurationSec: profile.idealDurationSec,
    estimatedDurationSec: Number(totalDuration.toFixed(1)),
    openingHook: getOpeningHook(theme, objective, profile),
    subtitleStyle: getSubtitleStyle(platform),
    captionTemplate: getCaptionTemplate(theme, objective),
    ctaLine: getCtaLine(objective),
    trendAudioSuggestions: getTrendAudio(theme),
    timeline,
    dropOffAlerts
  };
}
