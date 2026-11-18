"use client";

import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";

export const SKINS = [{ id: "classique", label: "Classique" }, { id: "verre", label: "Vert dépoli" }, { id: "jarvis", label: "Jarvis (HUD)" }] as const;
export const ACCENTS = [{ id: "cyan", label: "Cyan", color: "hsl(190 100% 50%)" }, { id: "vert", label: "Vert", color: "hsl(152 62% 46%)" }, { id: "bleu", label: "Bleu", color: "hsl(212 92% 58%)" }, { id: "violet", label: "Violet", color: "hsl(262 82% 66%)" }, { id: "ambre", label: "Ambre", color: "hsl(38 96% 54%)" }, { id: "rose", label: "Rose", color: "hsl(336 82% 62%)" }] as const;
const KEY = "pce-theme";

/** Applique le réglage sur la page et le garde dans le navigateur. `accent` vide = couleurs d'origine du style classique. */
export function applyTheme(skin: string, accent: string | null, hud?: boolean) {
  const h = document.documentElement;
  const isHud = hud ?? skin === "jarvis";
  const real = skin === "jarvis" ? "verre" : skin;   // « Jarvis » = Vert dépoli + couche HUD (grille, repères lumineux, effets)
  h.dataset.skin = real;
  if (isHud) h.dataset.hud = "on"; else delete h.dataset.hud;
  if (accent) h.dataset.accent = accent; else delete h.dataset.accent;
  try { localStorage.setItem(KEY, JSON.stringify({ skin: real, accent, hud: isHud })); } catch { /* navigation privée */ }
}

/** Choix du style (Classique / Vert dépoli) et de la couleur de toute l'interface, en un clic. */
export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [skin, setSkin] = useState("classique");
  const cur = (h: DOMStringMap) => (h.hud === "on" ? "jarvis" : h.skin ?? "classique");
  const [accent, setAccent] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = document.documentElement; setSkin(cur(h.dataset)); setAccent(h.dataset.accent ?? null); }, []);
  useEffect(() => {
    const on = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", on); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", on); document.removeEventListener("keydown", esc); };
  }, []);
  const pick = (s: string, a: string | null) => { setSkin(s); setAccent(a); applyTheme(s, a); };
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="dialog" aria-expanded={open} aria-label="Style et couleur"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-secondary-foreground transition hover:bg-secondary/70"><Palette className="h-[18px] w-[18px]" /></button>
      {open && (
        <div role="dialog" aria-label="Style et couleur" className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Style</div>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {SKINS.map((s) => <button key={s.id} type="button" onClick={() => pick(s.id, s.id === "jarvis" ? "cyan" : s.id === "verre" ? (accent === "cyan" ? "vert" : accent ?? "vert") : accent)} className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${skin === s.id ? "border-primary bg-primary/15" : "hover:bg-secondary/70"}`}>{s.label}</button>)}
          </div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Couleur de l&apos;interface</div>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENTS.map((a) => <button key={a.id} type="button" onClick={() => pick(skin, a.id)} aria-label={a.label} title={a.label} style={{ background: a.color }} className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-transparent transition hover:scale-110 ${accent === a.id ? "ring-2 ring-foreground" : ""}`} />)}
            {skin === "classique" && accent && <button type="button" onClick={() => pick(skin, null)} className="ml-1 text-xs underline text-muted-foreground">Couleurs d&apos;origine</button>}
          </div>
        </div>
      )}
    </div>
  );
}
