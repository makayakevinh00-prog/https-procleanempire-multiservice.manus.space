import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Les routes cron s'authentifient elles-mêmes (CRON_SECRET) ; tout le reste exige une session.
const PUBLIC = ["/login", "/acces-refuse", "/api/cron/", "/api/qonto/sync", "/api/inbound/", "/agent/", "/api/agent/", "/suivi/", "/api/public/"];

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
  // À l'ouverture d'un espace comptable, seules ses routes /compta/** seront exemptées de cette exigence.
  if (data.user && !isPublic) {
    const { data: owner, error } = await supabase.rpc("is_owner");
    if (error || owner !== true) {
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
