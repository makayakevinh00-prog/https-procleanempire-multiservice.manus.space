import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { PageHeader } from "@/components/crm/page-header";
import { OpenSpace } from "@/components/crm/openspace";
import { OpenSpaceDemo } from "@/components/crm/demo/openspace-demo";
import { Pilotage } from "@/components/crm/pilotage";
import { demoState } from "@/lib/jarvis/demo/demo-state";
import { demoKpiSet } from "@/lib/jarvis/demo/demo-kpis";
import { loadOpenSpaceState } from "@/lib/jarvis/load-openspace";
import { loadKpis } from "@/lib/jarvis/load-kpis";

export const dynamic = "force-dynamic";
export const metadata = { title: "Open space JARVIS" };

export default async function OpenSpacePage({ searchParams }: { searchParams: { demo?: string; agent?: string } }) {
  await requireOwner();
  const wantDemo = searchParams.demo === "1";
  const sb = createClient();
  const real = wantDemo ? null : await loadOpenSpaceState(sb);
  const forcedDemo = !wantDemo && real !== null && !real.installed;
  const showDemo = wantDemo || forcedDemo;
  // Les indicateurs sont lus dans le CRM même quand le socle JARVIS n'est pas installé : ils ne dépendent pas des agents.
  const kpis = wantDemo ? demoKpiSet() : await loadKpis(sb);
  return (
    <>
      <PageHeader
        title="Open space JARVIS"
        subtitle="Le bureau virtuel de vos agents et le pilotage de ProClean Empire. En test : rien n'est modifié dans vos données."
        actions={<>
          <Link href="/jarvis" className="text-sm font-semibold text-primary underline">← Supervision</Link>
          <Link href={wantDemo ? "/jarvis/openspace" : "/jarvis/openspace?demo=1"} className="text-sm font-semibold text-primary underline">{wantDemo ? "Voir les données réelles" : "Voir la démonstration"}</Link>
        </>}
      />
      {showDemo
        ? <OpenSpaceDemo key="demo" initial={demoState(0, new Date())} selectedKey={searchParams.agent} forcedDemo={forcedDemo} />
        : <OpenSpace key="reel" initial={real!} selectedKey={searchParams.agent} />}
      <Pilotage key={wantDemo ? "demo" : "reel"} initial={kpis} demo={wantDemo} />
    </>
  );
}
