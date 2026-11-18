"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { applyTheme, ACCENTS } from "@/components/crm/theme-switcher";

type Cmd = { id: string; group: string; label: string; sub?: string; run: () => void };
export const OPEN_EVENT = "pce-cmdk";

const PAGES: [string, string][] = [
  ["/", "Accueil"], ["/actions", "Actions à faire"], ["/clients", "Clients"], ["/demandes", "Demandes du site"], ["/devis", "Devis"], ["/devis/ia", "Devis avec l'IA (photos)"], ["/contrats", "Contrats"],
  ["/activites", "Activités"], ["/veille/territoire", "Territoire (carte)"], ["/veille", "Veille concurrentielle"], ["/croissance", "Croissance"], ["/croissance/aides", "Aides publiques"],
  ["/missions", "Missions"], ["/planning", "Planning"], ["/sites", "Sites"], ["/conciergerie", "Conciergerie"], ["/nettoyeurs", "Nettoyeurs"], ["/messages", "Messages"], ["/equipe", "Équipe"], ["/recrutement", "Recrutement"],
  ["/comptabilite", "Comptabilité"], ["/analyses", "Analyses"], ["/factures", "Factures"], ["/facturation-auto", "Facturation automatique"], ["/paiements", "Paiements"],
  ["/fournisseurs", "Fournisseurs"], ["/catalogue", "Catalogue"], ["/parametres", "Paramètres"], ["/journal", "Journal"], ["/compte", "Mon compte"], ["/jarvis", "JARVIS"]
];
const CREATE: [string, string][] = [["/clients/new", "Nouveau client"], ["/devis/new", "Nouveau devis"], ["/factures/new", "Nouvelle facture"], ["/contrats/new", "Nouveau contrat"], ["/sites/new", "Nouveau site"], ["/equipe#ajout", "Nouvel agent"]];
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Commande K (ou Ctrl K) : on tape, on trouve — pages, créations, réglages de style, et clients, devis, factures, sites, missions. */
export function CommandK() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Cmd[]>([]);
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const close = useCallback(() => { setOpen(false); setQ(""); setHits([]); setIdx(0); }, []);
  const go = useCallback((href: string) => { close(); router.push(href); }, [close, router]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => !v); } else if (e.key === "Escape") close(); };
    const ev = (e: Event) => { const q0 = (e as CustomEvent<{ q?: string }>).detail?.q; if (q0) setQ(q0); setOpen(true); };
    window.addEventListener("keydown", key); window.addEventListener(OPEN_EVENT, ev as EventListener);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener(OPEN_EVENT, ev as EventListener); };
  }, [close]);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 30); }, [open]);

  // Résultats de la base, après une courte pause de frappe.
  useEffect(() => {
    if (!open || q.trim().length < 2) { setHits([]); return; }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/recherche/rapide?q=${encodeURIComponent(q)}`, { signal: ctl.signal });
        const j = (await r.json()) as { results: { type: string; label: string; sub: string; href: string }[] };
        setHits(j.results.map((x, i) => ({ id: `h${i}`, group: x.type, label: x.label, sub: x.sub, run: () => go(x.href) })));
      } catch { /* interrompu */ }
    }, 180);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, open, go]);

  const base: Cmd[] = useMemo(() => [
    ...PAGES.map(([h, l]) => ({ id: `p${h}`, group: "Aller à", label: l, run: () => go(h) })),
    ...CREATE.map(([h, l]) => ({ id: `c${h}`, group: "Créer", label: l, run: () => go(h) })),
    ...ACCENTS.map((a) => ({ id: `a-${a.id}`, group: "Style", label: `Couleur ${a.label.toLowerCase()}`, run: () => { applyTheme(a.id); close(); } })),
    { id: "a-origine", group: "Style", label: "Couleurs d'origine", run: () => { applyTheme(null); close(); } }
  ], [go, close]);
  const list = useMemo(() => {
    const n = norm(q.trim());
    const own = n ? base.filter((c) => norm(`${c.label} ${c.group}`).includes(n)) : base.filter((c) => c.group !== "Style").slice(0, 12);
    return [...hits, ...own].slice(0, 30);
  }, [q, base, hits]);
  useEffect(() => setIdx(0), [q]);

  if (!open) return null;
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); list[idx]?.run(); }
  };
  let last = "";
  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/55 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }} role="dialog" aria-modal="true" aria-label="Recherche rapide">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl" onKeyDown={onKey}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tapez pour trouver un client, une facture, une page…" aria-label="Recherche rapide" className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted-foreground" />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">Échap</kbd>
        </div>
        <ul className="max-h-[52vh] overflow-auto p-2" role="listbox">
          {list.map((c, i) => {
            const head = c.group !== last; last = c.group;
            return (
              <li key={c.id} role="option" aria-selected={i === idx}>
                {head && <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c.group}</div>}
                <button type="button" onMouseEnter={() => setIdx(i)} onClick={c.run} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[14px] ${i === idx ? "bg-primary/15" : ""}`}>
                  <span className="min-w-0 truncate"><b className="font-medium">{c.label}</b>{c.sub && <span className="ml-2 text-muted-foreground">{c.sub}</span>}</span>
                  {i === idx && <CornerDownLeft className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </button>
              </li>
            );
          })}
          {!list.length && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Aucun résultat.</li>}
        </ul>
      </div>
    </div>
  );
}
