/**
 * Next.js met en cache les appels `fetch` des pages serveur (y compris les POST de supabase-js).
 * Ici, chaque donnée doit être lue fraîche : suivi client, missions, automatisations, factures.
 */
export const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });
