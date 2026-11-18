"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Volume2, VolumeX, X } from "lucide-react";
import { applyTheme } from "@/components/crm/theme-switcher";
import { OPEN_EVENT } from "@/components/crm/command-k";

type Item = { id: string; label: string; value: string; say: string; href: string; tone: "ok" | "warn" | "err" | "info" };
type Brief = { greeting: string; items: Item[]; say: string };
const TONE = { ok: "text-emerald-400", warn: "text-amber-400", err: "text-red-400", info: "text-sky-400" } as const;

const ROUTES: [RegExp, string, string][] = [
  [/accueil|tableau de bord/, "/", "l'accueil"], [/action/, "/actions", "vos actions"], [/message/, "/messages", "les messages"], [/client/, "/clients", "les clients"],
  [/devis/, "/devis", "les devis"], [/facture/, "/factures", "les factures"], [/contrat/, "/contrats", "les contrats"], [/planning|agenda/, "/planning", "le planning"],
  [/mission/, "/missions", "les missions"], [/territoire|carte/, "/veille/territoire", "la carte du territoire"], [/conciergerie|airbnb/, "/conciergerie", "la conciergerie"],
  [/equipe|agent/, "/equipe", "l'équipe"], [/compta/, "/comptabilite", "la comptabilité"], [/paiement/, "/paiements", "les paiements"], [/analyse|statistique/, "/analyses", "les analyses"],
  [/site/, "/sites", "les sites"], [/parametre|reglage/, "/parametres", "les paramètres"], [/croissance/, "/croissance", "la croissance"], [/aide/, "/croissance/aides", "les aides publiques"]
];
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Jarvis : une bulle lumineuse qui lit le briefing du jour à voix haute et obéit à la voix (ouvre une page, cherche, change de style). */
export function JarvisOrb() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [talking, setTalking] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [mute, setMute] = useState(false);
  const rec = useRef<any>(null);

  const say = useCallback((text: string) => {
    setReply(text);
    if (mute || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR"; u.rate = 1.02; u.pitch = 0.9;
    const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith("fr")); if (v) u.voice = v;
    u.onstart = () => setTalking(true); u.onend = () => setTalking(false); u.onerror = () => setTalking(false);
    window.speechSynthesis.speak(u);
  }, [mute]);

  const load = useCallback(async () => {
    try { const r = await fetch("/api/jarvis/brief", { cache: "no-store" }); if (r.ok) { const j = (await r.json()) as Brief; setBrief(j); return j; } } catch { /* hors ligne */ }
    return null;
  }, []);
  useEffect(() => { if (open && !brief) void load(); }, [open, brief, load]);
  useEffect(() => { const t = setInterval(() => { if (open && document.visibilityState === "visible") void load(); }, 60000); return () => clearInterval(t); }, [open, load]);
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); rec.current?.stop(); } catch { /* rien */ } }, []);

  const run = useCallback((raw: string) => {
    const t = norm(raw);
    const find = /(?:cherche|trouve|recherche)\s+(.+)/.exec(t);
    if (find) { say(`Je cherche ${find[1]}.`); window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { q: find[1] } })); return; }
    if (/mode jarvis|futuriste/.test(t)) { applyTheme("verre", "cyan", true); say("Mode Jarvis activé."); return; }
    if (/mode classique|style classique/.test(t)) { applyTheme("classique", null, false); say("Style classique rétabli."); return; }
    if (/briefing|resume|point du jour|quoi de neuf/.test(t)) { void load().then((b) => b && say(b.say)); return; }
    if (/tais|silence|stop/.test(t)) { window.speechSynthesis?.cancel(); setTalking(false); return; }
    const hit = ROUTES.find(([re]) => re.test(t));
    if (hit) { say(`J'ouvre ${hit[2]}.`); router.push(hit[1]); return; }
    say("Je n'ai pas compris. Essayez : ouvre les factures, cherche un client, ou donne-moi le briefing.");
  }, [load, router, say]);

  const listen = useCallback(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { say("La reconnaissance vocale n'est pas disponible sur ce navigateur. Utilisez Chrome."); return; }
    try { rec.current?.stop(); } catch { /* rien */ }
    const r = new SR();
    r.lang = "fr-FR"; r.interimResults = true; r.maxAlternatives = 1;
    r.onstart = () => { setListening(true); setHeard(""); };
    r.onresult = (e: any) => { const txt = Array.from(e.results).map((x: any) => x[0].transcript).join(" "); setHeard(txt); if (e.results[e.results.length - 1].isFinal) run(txt); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    rec.current = r; r.start();
  }, [run, say]);

  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Jarvis" aria-expanded={open} className={`jarvis-orb ${talking || listening ? "is-live" : ""}`}><i /><i /><i /></button>
      {open && (
        <section role="dialog" aria-label="Jarvis" className="jarvis-panel">
          <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
            <b className="tracking-[0.18em] text-[12px] uppercase text-[hsl(var(--ac,190_100%_50%))]">J.A.R.V.I.S.</b>
            <span className="flex items-center gap-1">
              <button type="button" onClick={() => setMute((v) => !v)} aria-label={mute ? "Activer la voix" : "Couper la voix"} className="rounded-lg p-1.5 hover:bg-white/10">{mute ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-lg p-1.5 hover:bg-white/10"><X className="h-4 w-4" /></button>
            </span>
          </header>
          <div className="space-y-3 p-4">
            <p className="text-[15px]">{brief ? `${brief.greeting}. Voici votre situation.` : "Analyse en cours…"}</p>
            <div className="grid grid-cols-2 gap-2">
              {brief?.items.map((i) => (
                <button key={i.id} type="button" onClick={() => { say(i.say); router.push(i.href); }} className="jarvis-tile text-left">
                  <span className="block text-[11px] uppercase tracking-wider opacity-70">{i.label}</span>
                  <span className={`num block text-xl font-semibold ${TONE[i.tone]}`}>{i.value}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => brief ? say(brief.say) : void load().then((b) => b && say(b.say))} className="jarvis-btn flex-1"><Volume2 className="h-4 w-4" /> Lire le briefing</button>
              <button type="button" onClick={listen} className={`jarvis-btn flex-1 ${listening ? "is-on" : ""}`}><Mic className="h-4 w-4" /> {listening ? "J'écoute…" : "Parler"}</button>
            </div>
            {heard && <p className="text-[13px] opacity-80">Vous : « {heard} »</p>}
            {reply && <p className="text-[13px] text-[hsl(var(--ac,190_100%_50%))]">Jarvis : {reply}</p>}
            <p className="text-[11px] opacity-50">Dites : « ouvre les factures », « cherche Dupont », « mode Jarvis », « briefing ».</p>
          </div>
        </section>
      )}
    </>
  );
}
