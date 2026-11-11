"use client";

import { useCallback, useEffect, useState } from "react";
import { Camera, MapPin, ChevronRight } from "lucide-react";
import type { Dict } from "@/lib/field-ui";

/** Seuls des textes simples passent du serveur au navigateur (les fonctions du dictionnaire n'y sont pas transmissibles). */
export type PermissionLabels = Pick<Dict, "camera" | "location" | "granted" | "denied" | "ask" | "unknown" | "cameraOk" | "cameraNo" | "cameraAsk" | "locOk" | "locNo" | "locAsk" | "openSettings">;

type State = "granted" | "denied" | "prompt" | "unknown";

/** État des autorisations du téléphone (caméra, localisation). Toucher une ligne « à autoriser » déclenche la demande ; une autorisation refusée se change dans les réglages. */
export function Permissions({ t }: { t: PermissionLabels }) {
  const [cam, setCam] = useState<State>("unknown");
  const [loc, setLoc] = useState<State>("unknown");
  const [hint, setHint] = useState(false);

  const read = useCallback(async () => {
    const q = async (name: string): Promise<State> => {
      try { const r = await navigator.permissions.query({ name: name as PermissionName }); return r.state as State; } catch { return "unknown"; }
    };
    setCam(await q("camera")); setLoc(await q("geolocation"));
  }, []);
  useEffect(() => { void read(); }, [read]);

  async function ask(kind: "cam" | "loc") {
    const state = kind === "cam" ? cam : loc;
    if (state === "denied") { setHint(true); return; }
    try {
      if (kind === "cam") { const s = await navigator.mediaDevices.getUserMedia({ video: true }); s.getTracks().forEach((x) => x.stop()); }
      else await new Promise<void>((res, rej) => navigator.geolocation.getCurrentPosition(() => res(), rej, { timeout: 15000 }));
    } catch { setHint(true); }
    void read();
  }

  const label = (s: State) => (s === "granted" ? t.granted : s === "denied" ? t.denied : s === "prompt" ? t.ask : t.unknown);
  const tone = (s: State) => (s === "granted" ? "text-[var(--a-ok)]" : s === "denied" ? "text-[var(--a-bad)]" : "text-[var(--a-warn)]");
  const rows = [
    { k: "cam" as const, icon: Camera, title: t.camera, s: cam, text: cam === "granted" ? t.cameraOk : cam === "denied" ? t.cameraNo : t.cameraAsk },
    { k: "loc" as const, icon: MapPin, title: t.location, s: loc, text: loc === "granted" ? t.locOk : loc === "denied" ? t.locNo : t.locAsk }
  ];
  return (
    <div className="divide-y divide-[var(--a-line)] rounded-3xl bg-[var(--a-card)]">
      {rows.map(({ k, icon: Icon, title, s, text }) => (
        <button key={k} onClick={() => void ask(k)} className="flex w-full items-center gap-3 p-4 text-left">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--a-bg)] text-[var(--a-pri)]"><Icon className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1"><b className="block text-[18px]">{title}</b><span className="block text-[14px] text-[var(--a-mute)]">{text}</span></span>
          <span className={`flex items-center gap-1 text-[15px] font-extrabold ${tone(s)}`}>{label(s)}<ChevronRight className="h-4 w-4" /></span>
        </button>
      ))}
      {hint && <p role="status" className="p-4 text-[14px] text-[var(--a-mute)]">{t.openSettings}</p>}
    </div>
  );
}
