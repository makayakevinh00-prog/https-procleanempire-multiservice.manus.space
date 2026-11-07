"use client";

import { OpenSpace } from "@/components/crm/openspace";
import { demoState } from "@/lib/jarvis/demo/demo-state";
import type { OpenSpaceState } from "@/lib/jarvis/openspace";

/** Enveloppe de la DÉMONSTRATION : seul endroit côté écran qui connaît le scénario fictif. */
export function OpenSpaceDemo({ initial, selectedKey, forcedDemo }: { initial: OpenSpaceState; selectedKey?: string; forcedDemo?: boolean }) {
  return <OpenSpace initial={initial} selectedKey={selectedKey} forcedDemo={forcedDemo} demoNext={demoState} />;
}
