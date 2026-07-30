/**
 * Calcul de l'heure de publication dans le fuseau de l'entreprise.
 *
 * Aucune dépendance de gestion de fuseaux : `Intl` sait déjà convertir, il
 * suffit de mesurer le décalage réel à la date concernée — ce qui gère
 * correctement le passage à l'heure d'été.
 */

/** Décalage, en minutes, entre un fuseau et UTC à un instant donné. */
export const offsetMinutes = (date: Date, timeZone: string): number => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  // `Intl` peut rendre « 24 » pour minuit selon l'environnement.
  const hour = Number(parts.hour) % 24;

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );

  return (asUtc - date.getTime()) / 60_000;
};

/** Date du jour (dans le fuseau donné) à l'heure `HH:mm`, en instant absolu. */
export const timeInZone = (
  reference: Date,
  time: string,
  timeZone: string,
): Date => {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year = 0, month = 1, day = 1] = formatter
    .format(reference)
    .split("-")
    .map(Number);

  const naive = Date.UTC(year, month - 1, day, hours, minutes, 0);
  // Première approximation du décalage, puis correction : deux passes suffisent
  // même lorsque l'heure visée tombe le jour d'un changement d'heure.
  const firstGuess = new Date(naive - offsetMinutes(new Date(naive), timeZone) * 60_000);
  const correction = offsetMinutes(firstGuess, timeZone);

  return new Date(naive - correction * 60_000);
};

/**
 * Créneau de publication : aujourd'hui à l'heure configurée, ou dans quelques
 * minutes si cette heure est déjà passée — un planificateur refuse une date
 * dans le passé.
 */
export const nextPublicationSlot = (
  time: string,
  timeZone: string,
  now = new Date(),
): Date => {
  const target = timeInZone(now, time, timeZone);
  const minimum = new Date(now.getTime() + 10 * 60_000);

  return target.getTime() > minimum.getTime() ? target : minimum;
};
