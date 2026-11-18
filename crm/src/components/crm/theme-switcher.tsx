"use client";

import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";

export const ACCENTS = [{ id: "vert", label: "Vert", color: "hsl(152 62% 46%)" }, { id: "bleu", label: "Bleu", color: "hsl(212 92% 58%)" }, { id: "violet", label: "Violet", color: "hsl(262 82% 66%)" }, { id: "ambre", label: "Ambre", color: "hsl(38 96% 54%)" }, { id: "rose", label: "Rose", color: "hsl(336 82% 62%)" }] as const;
const KEY = "pce-theme";

/** Applique la couleur sur la page et la garde dans le navigateur. `accent` vide = couleurs d'origine. */
export function applyTheme(accent: string | null) {
  const h = document.documentElement;
  if (accent) h.dataset.accent = accent; else delete h.dataset.accent;
  try { localStorage.setItem(KEY, JSON.stringify({ skin: "classique", accent })); } catch { /* navigation privée */ }
}

/** Choix de la couleur de toute l'interface, en un clic. */
export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [accent, setAccent] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setAccent(document.documentElement.dataset.accent ?? null); }, []);
  useEffect(() => {
    const on = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", on); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", on); document.removeEventListener("keydown", esc); };
  }, []);
  const pick = (a: string | null) => { setAccent(a); applyTheme(a); };
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="dialog" aria-expanded={open} aria-label="Couleur de l'interface"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-secondary-foreground transition hover:bg-secondary/70"><Palette className="h-[18px] w-[18px]" /></button>
      {open && (
        <div role="dialog" aria-label="Couleur de l'interface" className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-border bg-card p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Couleur de l&apos;interface</div>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENTS.map((a) => <button key={a.id} type="button" onClick={() => pick(a.id)} aria-label={a.label} title={a.label} style={{ background: a.color }} className={`h-9 w-9 rounded-full transition hover:scale-110 ${accent === a.id ? "ring-2 ring-foreground ring-offset-2" : ""}`} />)}
          </div>
          {accent && <button type="button" onClick={() => pick(null)} className="mt-3 text-xs text-muted-foreground underline">Couleurs d&apos;origine</button>}
        </div>
      )}
    </div>
  );
}
