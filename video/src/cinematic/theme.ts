/**
 * Vidéo de présentation cinématique : art déco (Gatsby), rythme et aplomb du
 * Loup de Wall Street, sobriété d'une keynote Apple — une idée par écran.
 */

export const FPS = 30;

/**
 * Le montage est calé sur un tempo, pas sur des durées arbitraires : toutes les
 * coupes tombent sur un temps. Si vous ajoutez une musique à 120 BPM, l'image
 * est déjà synchronisée. Pour une musique plus lente, changez `BPM` et tout le
 * montage se recale.
 */
export const BPM = 120;

/** Durée de `n` temps, en images. À 120 BPM : 1 temps = 15 images. */
export const beat = (n: number) => Math.round((60 / BPM) * FPS * n);

/**
 * Sérif à fort contraste, en capitales très espacées : c'est ce qui donne le
 * caractère gravé / art déco. Georgia sur les postes qui l'ont, sinon les
 * sérifs libres équivalents.
 */
export const serif =
  'Georgia, "Liberation Serif", "DejaVu Serif", "Times New Roman", serif';

export const sans =
  '"Helvetica Neue", "Liberation Sans", "DejaVu Sans", Arial, sans-serif';

export const gold = {
  base: "#c9a227",
  light: "#f3dd8f",
  deep: "#8a6b12",
};

export const ink = {
  black: "#05070d",
  navy: "#0b1326",
  white: "#f7f5ef",
};

/** Dégradé doré appliqué au texte via `background-clip: text`. */
export const goldGradient = `linear-gradient(180deg, ${gold.light} 0%, ${gold.base} 45%, ${gold.deep} 100%)`;

export const goldTextStyle: React.CSSProperties = {
  backgroundImage: goldGradient,
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
};
