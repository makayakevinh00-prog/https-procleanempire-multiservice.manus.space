import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requestCache } from "@/lib/request-cache";
import { loadActionsCached } from "@/lib/actions-request";
import { menuCountsFrom } from "@/lib/actions";
import { Sidebar } from "@/components/crm/nav";
import { SectionTabs } from "@/components/crm/section-tabs";
import { Topbar } from "@/components/crm/topbar";
import type { Perms } from "@/lib/team";

type SignOut = () => Promise<void>;

const counts = requestCache(async (): Promise<Record<string, number>> => {
  let out: Record<string, number> = {};
  try { out = menuCountsFrom(await loadActionsCached()); } catch { /* pastilles absentes */ }
  // Messages non lus des agents.
  try { const { count } = await createClient().from("team_messages").select("id", { count: "exact", head: true }).eq("from_owner", false).is("read_at", null); if (count) out = { ...out, "/messages": count }; } catch { /* table absente */ }
  return out;
});
/** E-mail affiché en haut : lu dans le jeton déjà vérifié par le middleware (signature contrôlée localement, aucun appel réseau). Affichage seulement. */
const email = requestCache(async (): Promise<string> => {
  try { const r = await createClient().auth.getClaims(); return (r.data?.claims?.email as string | undefined) ?? ""; } catch { return ""; }
});

/** Menu : s'affiche tout de suite, les pastilles de comptage arrivent ensuite (la page n'attend pas ces requêtes). */
export function SidebarLive({ signOut, perms = null }: { signOut: SignOut; perms?: Perms | null }) {
  // Équipe : pas de pastilles (elles comptent des données que la personne ne voit pas toutes) ; menu limité à ses sections.
  if (perms) return <Sidebar signOut={signOut} counts={{}} perms={perms} />;
  return <Suspense fallback={<Sidebar signOut={signOut} counts={{}} />}><SidebarCounts signOut={signOut} /></Suspense>;
}
export async function SidebarCounts({ signOut }: { signOut: SignOut }) { return <Sidebar signOut={signOut} counts={await counts()} />; }

export function TopbarLive({ signOut, team = false }: { signOut: SignOut; team?: boolean }) {
  if (team) return <TopbarTeam signOut={signOut} />;
  return <Suspense fallback={<Topbar actionsCount={0} email="" signOut={signOut} />}><TopbarCounts signOut={signOut} /></Suspense>;
}
export async function TopbarCounts({ signOut }: { signOut: SignOut }) {
  const [c, e] = await Promise.all([counts(), email()]);
  return <Topbar actionsCount={c["/actions"] ?? 0} email={e} signOut={signOut} />;
}

async function TopbarTeam({ signOut }: { signOut: SignOut }) { return <Topbar actionsCount={0} email={await email()} signOut={signOut} team />; }

/** Onglets de la rubrique : affichés tout de suite, les pastilles de comptage arrivent ensuite. */
export function SectionTabsLive({ perms = null }: { perms?: Perms | null }) {
  if (perms) return <SectionTabs perms={perms} />;
  return <Suspense fallback={<SectionTabs />}><SectionTabsCounts /></Suspense>;
}
async function SectionTabsCounts() { return <SectionTabs counts={await counts()} />; }
