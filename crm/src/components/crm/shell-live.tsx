import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requestCache } from "@/lib/request-cache";
import { loadActionsCached } from "@/lib/actions-request";
import { menuCountsFrom } from "@/lib/actions";
import { Sidebar } from "@/components/crm/nav";
import { Topbar } from "@/components/crm/topbar";

type SignOut = () => Promise<void>;

const counts = requestCache(async (): Promise<Record<string, number>> => {
  try { return menuCountsFrom(await loadActionsCached()); } catch { return {}; }
});
/** E-mail affiché en haut : lu dans le jeton déjà vérifié par le middleware (signature contrôlée localement, aucun appel réseau). Affichage seulement. */
const email = requestCache(async (): Promise<string> => {
  try { const r = await createClient().auth.getClaims(); return (r.data?.claims?.email as string | undefined) ?? ""; } catch { return ""; }
});

/** Menu : s'affiche tout de suite, les pastilles de comptage arrivent ensuite (la page n'attend pas ces requêtes). */
export function SidebarLive({ signOut }: { signOut: SignOut }) {
  return <Suspense fallback={<Sidebar signOut={signOut} counts={{}} />}><SidebarCounts signOut={signOut} /></Suspense>;
}
export async function SidebarCounts({ signOut }: { signOut: SignOut }) { return <Sidebar signOut={signOut} counts={await counts()} />; }

export function TopbarLive({ signOut }: { signOut: SignOut }) {
  return <Suspense fallback={<Topbar actionsCount={0} email="" signOut={signOut} />}><TopbarCounts signOut={signOut} /></Suspense>;
}
export async function TopbarCounts({ signOut }: { signOut: SignOut }) {
  const [c, e] = await Promise.all([counts(), email()]);
  return <Topbar actionsCount={c["/actions"] ?? 0} email={e} signOut={signOut} />;
}
