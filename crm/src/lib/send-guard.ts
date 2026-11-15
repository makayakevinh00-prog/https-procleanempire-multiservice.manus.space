/**
 * Garde contre les envois en double (double clic, page relancée) : le même document envoyé aux mêmes adresses
 * il y a moins de deux minutes n'est pas renvoyé. Un envoi à d'autres adresses, ou plus tard, reste possible.
 */
export const RESEND_GAP_SECONDS = 120;

const norm = (list: string[]) => list.map((e) => e.trim().toLowerCase()).filter(Boolean).sort().join(",");

export function sentJustNow(sentAt: string | null | undefined, sentTo: string | null | undefined, to: string[], now: Date = new Date()): boolean {
  if (!sentAt) return false;
  const age = (now.getTime() - new Date(sentAt).getTime()) / 1000;
  if (!(age >= 0 && age < RESEND_GAP_SECONDS)) return false;
  return sentTo == null ? true : norm(sentTo.split(/[,;]/)) === norm(to);
}
