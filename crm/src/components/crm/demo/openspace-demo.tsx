"use client";

import { OpenSpace } from "@/components/crm/openspace";
import { HqOffice } from "@/components/crm/hq/office";
import { demoState } from "@/lib/jarvis/demo/demo-state";
import { demoAlertSummary, demoKpiSet } from "@/lib/jarvis/demo/demo-kpis";
import type { OpenSpaceState } from "@/lib/jarvis/openspace";

/** Enveloppes de la DÉMONSTRATION : seul endroit côté écran qui connaît le scénario fictif. */
export function OpenSpaceDemo({
  initial,
  selectedKey,
  forcedDemo,
}: {
  initial: OpenSpaceState;
  selectedKey?: string;
  forcedDemo?: boolean;
}) {
  return (
    <OpenSpace
      initial={initial}
      selectedKey={selectedKey}
      forcedDemo={forcedDemo}
      demoNext={demoState}
    />
  );
}
export function HqOfficeDemo({
  initial,
  selectedKey,
  forcedDemo,
}: {
  initial: OpenSpaceState;
  selectedKey?: string;
  forcedDemo?: boolean;
}) {
  return (
    <HqOffice
      initial={initial}
      kpis={demoKpiSet()}
      alerts={demoAlertSummary()}
      demo
      forcedDemo={forcedDemo}
      demoNext={demoState}
      initialAgent={selectedKey}
    />
  );
}
