import { agentClient } from "@/lib/agent";
import { CleanerTabs } from "@/components/agent/cleaner-tabs";

/** La barre du bas avec la pastille « Demandes » (nombre de ménages à saisir). Si le décompte échoue, la barre s'affiche sans pastille. */
export async function CleanerDock({ token }: { token: string }) {
  let n = 0;
  try {
    const r = await agentClient().rpc("cleaner_open_jobs", { p_token: token });
    n = ((r.data as { jobs?: unknown[] } | null)?.jobs ?? []).length;
  } catch {
    /* barre sans pastille */
  }
  return <CleanerTabs token={token} requests={n} />;
}
