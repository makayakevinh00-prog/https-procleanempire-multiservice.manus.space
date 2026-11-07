import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { PageHeader } from "@/components/crm/page-header";
import { OpenSpace } from "@/components/crm/openspace";
import { demoState } from "@/lib/jarvis/openspace";
import { loadOpenSpaceState } from "@/lib/jarvis/load-openspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Open space JARVIS" };

export default async function OpenSpacePage({ searchParams }: { searchParams: { demo?: string; agent?: string } }) {
  await requireOwner();
  const wantDemo = searchParams.demo === "1";
  const real = wantDemo ? null : await loadOpenSpaceState(createClient());
  const forcedDemo = !wantDemo && real !== null && !real.installed;
  const initial = wantDemo || forcedDemo ? demoState(0, new Date()) : real!;
  return (
    <>
      <PageHeader
        title="Open space JARVIS"
        subtitle="Le bureau virtuel de vos agents : qui travaille, qui attend votre validation, qui collabore avec qui. Prototype : en test, pas encore en production."
        actions={<>
          <Link href="/jarvis" className="text-sm font-semibold text-primary underline">← Supervision</Link>
          <Link href={wantDemo ? "/jarvis/openspace" : "/jarvis/openspace?demo=1"} className="text-sm font-semibold text-primary underline">{wantDemo ? "Voir les données réelles" : "Voir la démonstration"}</Link>
        </>}
      />
      <OpenSpace key={initial.mode} initial={initial} selectedKey={searchParams.agent} forcedDemo={forcedDemo} />
    </>
  );
}
