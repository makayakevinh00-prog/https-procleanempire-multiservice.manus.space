import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requestCache } from "@/lib/request-cache";
import { loadActions } from "@/lib/actions";

/** « Actions à faire » chargées UNE fois par requête (menu, bandeau du haut et accueil partagent le résultat). */
export const loadActionsCached = requestCache(() => loadActions(createClient()));
