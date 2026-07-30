import type { HistoryEntry } from "../types.js";

/**
 * Contrôle anti-répétition.
 *
 * Le modèle, laissé libre, retombe naturellement sur les mêmes tournures et les
 * mêmes sujets. On compare donc chaque texte produit à l'historique récent et on
 * régénère si la ressemblance dépasse un seuil.
 */

/** Mots vides français : ils sont présents partout et fausseraient la mesure. */
const STOP_WORDS = new Set([
  "alors","au","aucun","aussi","autre","avant","avec","avoir","bon","car","ce",
  "cela","ces","cet","cette","ceux","chaque","comme","dans","de","des","du",
  "elle","elles","en","encore","est","et","eu","fait","faire","hors","ici","il",
  "ils","je","juste","la","le","les","leur","là","ma","mais","mes","mon","même",
  "ne","nos","notre","nous","on","ont","ou","où","par","parce","pas","peut",
  "plus","pour","que","quel","quelle","qui","sa","sans","se","ses","seulement",
  "si","sien","son","sont","sous","sur","ta","tandis","tes","ton","tous","tout",
  "trop","très","tu","un","une","vos","votre","vous","été","être","c","d","l",
  "n","s","j","m","t","y","a","à","的",
]);

/** Normalise un texte en un ensemble de mots significatifs. */
export const fingerprint = (text: string): string =>
  tokenize(text).join(" ");

export const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/#[^\s]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

/**
 * Similarité de Jaccard sur les bigrammes de mots.
 *
 * Les bigrammes plutôt que les mots isolés : deux textes sur le même service
 * partagent forcément beaucoup de mots, mais rarement les mêmes enchaînements.
 */
export const similarity = (a: string, b: string): number => {
  const setA = bigrams(tokenize(a));
  const setB = bigrams(tokenize(b));

  if (setA.size === 0 || setB.size === 0) return 0;

  let shared = 0;
  for (const gram of setA) {
    if (setB.has(gram)) shared += 1;
  }

  return shared / (setA.size + setB.size - shared);
};

const bigrams = (tokens: string[]): Set<string> => {
  const grams = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i += 1) {
    grams.add(`${tokens[i]} ${tokens[i + 1]}`);
  }
  // Un texte d'un seul mot n'a pas de bigramme : on retombe sur le mot lui-même.
  if (grams.size === 0 && tokens.length === 1) grams.add(tokens[0] as string);
  return grams;
};

export const SIMILARITY_THRESHOLD = 0.3;

export type DuplicateCheck = {
  isDuplicate: boolean;
  score: number;
  against: HistoryEntry | null;
};

/** Compare un texte candidat à tout l'historique récent. */
export const checkDuplicate = (
  candidate: string,
  history: HistoryEntry[],
  threshold = SIMILARITY_THRESHOLD,
): DuplicateCheck => {
  let worst: DuplicateCheck = { isDuplicate: false, score: 0, against: null };

  for (const entry of history) {
    const score = similarity(candidate, entry.fingerprint);
    if (score > worst.score) {
      worst = { isDuplicate: score >= threshold, score, against: entry };
    }
  }

  return worst;
};

/**
 * Hashtags trop utilisés récemment : on les signale au rédacteur pour qu'il
 * varie, sans les interdire — certains sont incontournables.
 */
export const overusedHashtags = (
  history: HistoryEntry[],
  lookback = 7,
  minOccurrences = 4,
): string[] => {
  const counts = new Map<string, number>();

  for (const entry of history.slice(0, lookback)) {
    for (const tag of entry.hashtags) {
      const normalized = tag.toLowerCase();
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= minOccurrences)
    .map(([tag]) => tag);
};
