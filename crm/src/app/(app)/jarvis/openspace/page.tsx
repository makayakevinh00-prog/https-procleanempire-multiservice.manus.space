import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { PageHeader } from "@/components/crm/page-header";
import { OpenSpace } from "@/components/crm/openspace";
import { HqOffice } from "@/components/crm/hq/office";
import { HabboOffice } from "@/components/crm/hq/habbo";
import {
  HabboOfficeDemo,
  HqOfficeDemo,
  OpenSpaceDemo,
} from "@/components/crm/demo/openspace-demo";
import { Pilotage } from "@/components/crm/pilotage";
import { demoState } from "@/lib/jarvis/demo/demo-state";
import { demoKpiSet } from "@/lib/jarvis/demo/demo-kpis";
import { loadOpenSpaceState } from "@/lib/jarvis/load-openspace";
import { loadKpis } from "@/lib/jarvis/load-kpis";
import { loadAlerts } from "@/lib/jarvis/load-alerts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Locaux JARVIS" };

export default async function OpenSpacePage({
  searchParams,
}: {
  searchParams: { demo?: string; agent?: string; vue?: string };
}) {
  await requireOwner();
  const wantDemo = searchParams.demo === "1",
    classic = searchParams.vue === "classique",
    bureau = searchParams.vue === "bureau";
  const sb = createClient();
  const real = wantDemo ? null : await loadOpenSpaceState(sb);
  const forcedDemo = !wantDemo && real !== null && !real.installed;
  const showDemo = wantDemo || forcedDemo;
  // Indicateurs et alertes : lus dans le CRM même sans socle JARVIS (ils ne dépendent pas des agents). Jamais en démonstration.
  const [kpis, alerts] = wantDemo
    ? [demoKpiSet(), null]
    : await Promise.all([
        loadKpis(sb),
        loadAlerts(sb)
          .then((v) => v.summary)
          .catch(() => null),
      ]);
  const q = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams(
      Object.entries({ ...searchParams, ...p }).filter(([, x]) => x) as [
        string,
        string,
      ][],
    );
    return `/jarvis/openspace${u.size ? `?${u}` : ""}`;
  };
  return (
    <>
      <PageHeader
        title="Locaux ProClean Empire"
        subtitle="Le siège virtuel en direct : vos agents à leur poste, qui marchent, se parlent et reçoivent les consignes de JARVIS. Cliquez sur quelqu'un."
        actions={
          <>
            <Link
              href="/jarvis"
              className="text-sm font-semibold text-primary underline"
            >
              ← Supervision
            </Link>
            <Link
              href="/jarvis/alertes"
              className="text-sm font-semibold text-primary underline"
            >
              Alertes
            </Link>
            <Link
              href={q({ vue: classic ? undefined : "classique" })}
              className="text-sm font-semibold text-primary underline"
            >
              {classic ? "Vue des locaux" : "Ancienne vue (grille)"}
            </Link>
            <Link
              href={q({ vue: bureau ? undefined : "bureau" })}
              className="text-sm font-semibold text-primary underline"
            >
              {bureau ? "Vue animée" : "Vue détaillée (écrans)"}
            </Link>
            <Link
              href={q({ demo: wantDemo ? undefined : "1" })}
              className="text-sm font-semibold text-primary underline"
            >
              {wantDemo ? "Voir les données réelles" : "Voir la démonstration"}
            </Link>
          </>
        }
      />
      {classic ? (
        showDemo ? (
          <OpenSpaceDemo
            key="demo"
            initial={demoState(0, new Date())}
            selectedKey={searchParams.agent}
            forcedDemo={forcedDemo}
          />
        ) : (
          <OpenSpace
            key="reel"
            initial={real!}
            selectedKey={searchParams.agent}
          />
        )
      ) : !bureau ? (
        showDemo ? (
          <HabboOfficeDemo key="demo" initial={demoState(0, new Date())} selectedKey={searchParams.agent} forcedDemo={forcedDemo} />
        ) : (
          <HabboOffice key="reel" initial={real!} initialAgent={searchParams.agent} />
        )
      ) : showDemo ? (
        <HqOfficeDemo
          key="demo"
          initial={demoState(0, new Date())}
          selectedKey={searchParams.agent}
          forcedDemo={forcedDemo}
        />
      ) : (
        <HqOffice
          key="reel"
          initial={real!}
          kpis={kpis}
          alerts={alerts}
          demo={false}
          initialAgent={searchParams.agent}
        />
      )}
      <Pilotage
        key={wantDemo ? "demo" : "reel"}
        initial={kpis}
        demo={wantDemo}
        startCollapsed={!bureau && !classic}
      />
    </>
  );
}
