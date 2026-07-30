/**
 * Configuration du montage TikTok / Reels.
 *
 * C'EST LE SEUL FICHIER À MODIFIER pour changer le montage : ajoutez vos rushes
 * dans `public/media/videos/` (dossier public du site), listez-les ici avec le
 * point d'entrée / de sortie et le texte à afficher, le reste suit.
 */

export const FPS = 30;

/** Le son d'origine des rushes est conservé. Musique optionnelle par-dessus. */
export const music = {
  /** Chemin dans public/, ex. "media/audio/musique.mp3". `null` = pas de musique. */
  src: null as string | null,
  /** Volume de la musique sous la voix / le son direct. */
  volume: 0.25,
};

export type Shot = {
  /** Chemin du rush dans public/ */
  src: string;
  /** Première image utilisée du rush. */
  trimBefore: number;
  /** Nombre d'images gardées (= durée du plan dans le montage). */
  durationInFrames: number;
  /**
   * Le rush est-il déjà vertical (9:16) ? Sinon on ajoute un fond flouté pour
   * remplir le cadre.
   *
   * ⚠️ Une vidéo filmée au téléphone est souvent stockée en paysage avec une
   * métadonnée de rotation : elle s'affiche pourtant en portrait. Vérifiez avec
   * `npx remotion ffprobe <fichier>` en regardant la ligne `rotation` autant
   * que les dimensions.
   */
  vertical: boolean;
  /** Texte affiché mot par mot pendant le plan. Laisser vide pour aucun. */
  caption: string;
  /** Sens du zoom : "in" = on se rapproche, "out" = on s'éloigne. */
  zoom: "in" | "out";
  /** Garder le son d'origine de ce plan ? */
  sound: boolean;
};

/**
 * ⚠️ Les textes ci-dessous sont des exemples : adaptez-les à ce que montre
 * réellement chaque rush.
 */
export const shots: Shot[] = [
  {
    src: "media/videos/proclean-demonstration-2.mp4",
    trimBefore: 0,
    durationInFrames: 33,
    vertical: true,
    // Vide volontairement : l'accroche occupe seule ce premier plan.
    caption: "",
    zoom: "in",
    sound: true,
  },
  {
    src: "media/videos/proclean-demonstration-1.mp4",
    trimBefore: 0,
    durationInFrames: 74,
    vertical: true,
    caption: "Injection extraction en profondeur",
    zoom: "out",
    sound: true,
  },
  {
    src: "media/videos/proclean-presentation.mp4",
    trimBefore: 0,
    durationInFrames: 118,
    vertical: true,
    caption: "Le résultat parle tout seul",
    zoom: "in",
    sound: true,
  },
];

/** Accroche affichée sur la première seconde — c'est elle qui retient. */
export const hook = {
  line1: "Personne ne nettoie",
  line2: "ça correctement",
};

/** Carte de fin. Courte : on ne perd pas la boucle. */
export const endCard = {
  durationInFrames: 60,
  line: "Devis en 24h",
};
