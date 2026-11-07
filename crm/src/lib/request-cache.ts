import * as React from "react";

/**
 * Mémoïse une fonction pour la durée d'UNE requête serveur (React `cache`) : la mise en page, la page et les composants
 * qui l'appellent partagent un seul résultat. Aucune donnée n'est partagée entre deux requêtes ni entre deux utilisateurs.
 * Hors rendu serveur (tests), la fonction s'exécute normalement.
 */
export function requestCache<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const c = (React as unknown as { cache?: <T extends (...a: never[]) => unknown>(f: T) => T }).cache;
  return c ? (c(fn as never) as unknown as (...args: A) => R) : fn;
}
