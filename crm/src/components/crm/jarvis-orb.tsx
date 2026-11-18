"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Send, Volume2, VolumeX, X } from "lucide-react";
import { applyTheme } from "@/components/crm/theme-switcher";
import { OPEN_EVENT } from "@/components/crm/command-k";
import { decideProposalAction } from "@/app/actions/messages";
import { LEVELS, parseLevel, type Level } from "@/lib/jarvis/autonomy";

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
  const [level, setLevel] = useState<Level>(0);
  const [alerts, setAlerts] = useState<{ id: string; say: string; href: string; severity: string }[]>([]);
  const [props, setProps] = useState<{ id: string; title: string; summary: string | null; level: string }[]>([]);
  const [alert, setAlert] = useState(false);
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const chatRef = useRef(chat); chatRef.current = chat;
  const sayRef = useRef<(t: string) => void>(() => undefined);
  const seen = useRef<Set<string>>(new Set());

  const audio = useRef<HTMLAudioElement | null>(null);
  const proVoice = useRef<boolean | null>(null);   // null = pas encore essayé, false = voix premium non configurée

  /** Voix du navigateur, la plus naturelle trouvée (voix françaises « améliorées » ou Google), phrase par phrase pour de vraies pauses. */
  const speakLocal = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const voices = synth.getVoices().filter((x) => x.lang.toLowerCase().startsWith("fr"));
    const best = voices.find((x) => /thomas|google|premium|enhanced|am[eé]lior/i.test(x.name)) ?? voices.find((x) => /male|homme|daniel|paul/i.test(x.name)) ?? voices[0];
    const parts = text.match(/[^.!?]+[.!?]*/g) ?? [text];
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part.trim());
      u.lang = "fr-FR"; u.rate = 0.94; u.pitch = 0.78; u.volume = 1;
      if (best) u.voice = best;
      if (i === 0) u.onstart = () => setTalking(true);
      if (i === parts.length - 1) { u.onend = () => setTalking(false); u.onerror = () => setTalking(false); }
      synth.speak(u);
    });
  }, []);

  const say = useCallback(async (text: string) => {
    setReply(text);
    if (mute || typeof window === "undefined") return;
    window.speechSynthesis?.cancel(); audio.current?.pause();
    if (proVoice.current !== false) {
      try {
        setTalking(true);
        const r = await fetch("/api/jarvis/voice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
        if (r.ok) {
          proVoice.current = true;
          const a = new Audio(URL.createObjectURL(await r.blob()));
          audio.current = a; a.onended = () => setTalking(false); a.onerror = () => setTalking(false);
          await a.play();
          return;
        }
        if (r.status === 503) proVoice.current = false;   // pas de voix premium configurée : on garde la voix du navigateur
      } catch { /* repli sur la voix du navigateur */ }
      setTalking(false);
    }
    speakLocal(text);
  }, [mute, speakLocal]);

  sayRef.current = (t: string) => void say(t);
  useEffect(() => {
    try { setLevel(parseLevel(localStorage.getItem("jarvis-niveau"))); seen.current = new Set(JSON.parse(localStorage.getItem("jarvis-seen") ?? "[]")); } catch { /* sans mémoire */ }
  }, []);
  const chooseLevel = (l: Level) => { setLevel(l); try { localStorage.setItem("jarvis-niveau", String(l)); } catch { /* rien */ } };

  // Veille : toutes les 45 s, Jarvis regarde ce qui se passe. Ce qui est nouveau est dit à voix haute (une seule fois) et la bulle s'illumine.
  useEffect(() => {
    let dead = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`/api/jarvis/watch?niveau=${level}`, { cache: "no-store" });
        if (!r.ok || dead) return;
        const j = (await r.json()) as { events: { id: string; say: string; href: string; severity: string }[]; proposals: { id: string; title: string; summary: string | null; level: string }[] };
        setProps(j.proposals);
        const fresh = j.events.filter((e) => !seen.current.has(e.id));
        setAlerts(j.events);
        if (fresh.length) {
          fresh.forEach((e) => seen.current.add(e.id));
          try { localStorage.setItem("jarvis-seen", JSON.stringify([...seen.current].slice(-200))); } catch { /* rien */ }
          setAlert(true);
          const line = fresh.slice(0, 2).map((e) => e.say).join(" ");
          sayRef.current(line);
          try { if ("Notification" in window && Notification.permission === "granted") new Notification("Jarvis", { body: line }); } catch { /* rien */ }
        }
      } catch { /* hors ligne */ }
    };
    const first = setTimeout(tick, 4000), t = setInterval(tick, 45000);
    return () => { dead = true; clearTimeout(first); clearInterval(t); };
  }, [level]);

  const decide = useCallback(async (id: string, ok: boolean) => {
    setProps((p) => p.filter((x) => x.id !== id));
    try { const r = await decideProposalAction(id, ok); say(r.ok ? (ok ? "C'est validé." : "Très bien, j'annule.") : "Je n'ai pas pu enregistrer votre décision."); } catch { say("Je n'ai pas pu enregistrer votre décision."); }
  }, [say]);

  const ask = useCallback(async (q: string) => {
    const msgs = [...chatRef.current, { role: "user" as const, content: q }];
    setChat(msgs); setThinking(true);
    try {
      const r = await fetch("/api/jarvis/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: msgs, niveau: level }) });
      const j = await r.json().catch(() => ({}));
      const reply = r.ok ? String(j.reply ?? "") : String(j.error ?? "Je n'ai pas pu répondre.");
      setChat([...msgs, { role: "assistant", content: reply }]); void say(reply);
    } catch { const m = "Je n'arrive pas à joindre mon cerveau pour le moment."; setChat([...msgs, { role: "assistant", content: m }]); void say(m); }
    setThinking(false);
  }, [level, say]);

  const load = useCallback(async () => {
    try { const r = await fetch("/api/jarvis/brief", { cache: "no-store" }); if (r.ok) { const j = (await r.json()) as Brief; setBrief(j); return j; } } catch { /* hors ligne */ }
    return null;
  }, []);
  useEffect(() => { if (open && !brief) void load(); }, [open, brief, load]);
  // Raccourci téléphone : l'adresse du CRM avec ?jarvis=1 ouvre Jarvis et lance l'écoute.
  useEffect(() => { if (new URLSearchParams(window.location.search).get("jarvis") === "1") setOpen(true); }, []);
  useEffect(() => { const t = setInterval(() => { if (open && document.visibilityState === "visible") void load(); }, 60000); return () => clearInterval(t); }, [open, load]);
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); rec.current?.stop(); } catch { /* rien */ } }, []);

  const run = useCallback((raw: string) => {
    const t = norm(raw);
    const find = /(?:cherche|trouve|recherche)\s+(.+)/.exec(t);
    if (find) { say(`Je cherche ${find[1]}.`); window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { q: find[1] } })); return; }
    if (/mode jarvis|futuriste/.test(t)) { applyTheme("verre", "cyan", true); say("Mode Jarvis activé."); return; }
    if (/mode classique|style classique/.test(t)) { applyTheme("classique", null, false); say("Style classique rétabli."); return; }
    if (/briefing|resume|point du jour|quoi de neuf/.test(t)) { void load().then((b) => b && say(b.say)); return; }
    if (/^(oui|ok|valide|vas y|d accord|c est bon)\b/.test(t) && props[0]) { void decide(props[0].id, true); return; }
    if (/^(non|annule|refuse|pas maintenant)\b/.test(t) && props[0]) { void decide(props[0].id, false); return; }
    if (/tais|silence|stop/.test(t)) { window.speechSynthesis?.cancel(); audio.current?.pause(); setTalking(false); return; }
    const hit = ROUTES.find(([re]) => re.test(t));
    if (hit) { say(`J'ouvre ${hit[2]}.`); router.push(hit[1]); return; }
    void ask(raw);
  }, [load, router, say, props, decide, ask]);

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
      <button type="button" onClick={() => { setOpen((v) => !v); setAlert(false); try { if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission(); } catch { /* rien */ } }} aria-label="Jarvis" aria-expanded={open} className={`jarvis-orb ${talking || listening || alert ? "is-live" : ""}`}><i /><i /><i /></button>
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
            {props.length > 0 && (
              <div className="space-y-2 rounded-xl border border-amber-400/40 bg-amber-400/5 p-3">
                <b className="text-[12px] uppercase tracking-wider text-amber-300">À valider ({props.length})</b>
                {props.map((p) => (
                  <div key={p.id} className="space-y-1.5">
                    <p className="text-[13px]"><b>{p.title}</b>{p.summary ? ` — ${p.summary}` : ""}</p>
                    <div className="flex gap-2"><button type="button" onClick={() => void decide(p.id, true)} className="jarvis-btn flex-1" style={{ height: 34 }}>Oui</button><button type="button" onClick={() => void decide(p.id, false)} className="jarvis-btn flex-1" style={{ height: 34 }}>Non</button></div>
                  </div>
                ))}
              </div>
            )}
            {alerts.length > 0 && <ul className="space-y-1 text-[12.5px]">{alerts.slice(0, 4).map((a) => <li key={a.id}><button type="button" onClick={() => router.push(a.href)} className={`text-left underline-offset-2 hover:underline ${a.severity === "err" ? "text-red-300" : a.severity === "warn" ? "text-amber-300" : ""}`}>• {a.say}</button></li>)}</ul>}
            <div className="max-h-40 space-y-1.5 overflow-auto text-[13px]">
              {chat.map((m, i) => <p key={i} className={m.role === "user" ? "opacity-80" : "text-[hsl(var(--ac,190_100%_50%))]"}>{m.role === "user" ? "Vous" : "Jarvis"} : {m.content}</p>)}
              {thinking && <p className="opacity-60">Jarvis réfléchit…</p>}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const q = text.trim(); if (q) { setText(""); run(q); } }} className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Parlez-lui ou écrivez…" aria-label="Message à Jarvis" className="h-10 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-[14px] outline-none" />
              <button aria-label="Envoyer" className="jarvis-btn" style={{ width: 40 }}><Send className="h-4 w-4" /></button>
            </form>
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wider opacity-60">Autonomie · l&apos;argent reste toujours à vous</div>
              <div className="grid grid-cols-3 gap-1.5">{LEVELS.map((l) => <button key={l.id} type="button" onClick={() => chooseLevel(l.id)} title={l.help} className={`jarvis-btn ${level === l.id ? "is-on" : ""}`} style={{ height: 32, fontSize: 12 }}>{l.label}</button>)}</div>
              <p className="mt-1 text-[11px] opacity-55">{LEVELS.find((l) => l.id === level)?.help}</p>
            </div>
            <p className="text-[11px] opacity-50">Dites : « ouvre les factures », « cherche Dupont », « mode Jarvis », « briefing ».</p>
          </div>
        </section>
      )}
    </>
  );
}
