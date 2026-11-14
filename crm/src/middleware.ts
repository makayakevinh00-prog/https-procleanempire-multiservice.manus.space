import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { pathAllowed, sanitizePerms } from "@/lib/team";

// Les routes cron s'authentifient elles-mêmes (CRON_SECRET) ; tout le reste exige une session.
const PUBLIC = ["/login", "/acces-refuse", "/api/cron/", "/api/qonto/sync", "/api/inbound/", "/agent/", "/api/agent/", "/suivi/", "/api/public/", "/api/calendrier/", "/api/mcp", "/.well-known/", "/register", "/authorize", "/token", "/compta/activer", "/invitation", "/nettoyeur/", "/api/nettoyeur/", "/reserver", "/linge/", "/partenaire/", "/api/partenaire/", "/connexion"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  if (!data.user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  // Point de contrôle UNIQUE de tout l'espace patron : pages, routes API ET actions serveur (un POST sur une page) passent ici.
  // Une page peut être demandée sans sa mise en page : le contrôle de layout.tsx ne suffit donc pas. La base reste la référence (is_owner()).
  // Espace comptable : seules les routes /compta/** et /api/compta/** sont ouvertes au comptable invité (voir plus bas).
  if (data.user && !isPublic) {
    const { data: owner, error } = await supabase.rpc("is_owner");
    if (error || owner !== true) {
      // Espace comptable : le comptable invité (is_accountant, côté base) ne voit QUE /compta/** et ses exports ; tout le reste lui est refusé.
      const accountantArea = pathname === "/compta" || pathname.startsWith("/compta/") || pathname.startsWith("/api/compta/");
      // Équipe : un membre invité ne voit que les sections que le patron lui a ouvertes (la base applique les mêmes droits ligne par ligne).
      const { data: access } = await supabase.rpc("my_access");
      if ((access as any)?.kind === "team") {
        const perms = sanitizePerms((access as any).perms);
        if (pathAllowed(perms, pathname)) return response;
        const url = request.nextUrl.clone(); url.pathname = "/bienvenue"; url.search = "";
        return NextResponse.redirect(url);
      }
      const { data: acc } = await supabase.rpc("is_accountant");
      if (acc === true) {
        if (accountantArea) return response;
        const url = request.nextUrl.clone(); url.pathname = "/compta"; url.search = "";
        return NextResponse.redirect(url);
      }
      // Compte connecté qui n'a pas (encore) activé l'accès comptable : on le guide vers la saisie du code plutôt que d'afficher un refus.
      if (pathname === "/") { const url = request.nextUrl.clone(); url.pathname = "/invitation"; url.search = ""; return NextResponse.redirect(url); }
      if (pathname === "/compta") { const url = request.nextUrl.clone(); url.pathname = "/compta/activer"; url.search = ""; return NextResponse.redirect(url); }
      const denied = NextResponse.rewrite(new URL("/acces-refuse", request.url), { status: 403 });
      response.cookies.getAll().forEach((c) => denied.cookies.set(c));
      return denied;
    }
  }
  if (data.user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|manifest.webmanifest|icons/).*)"] };
