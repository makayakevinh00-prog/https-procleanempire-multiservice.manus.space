"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cleanerOnlineAction, cleanerPingAction, cleanerPushAction } from "@/app/actions/nettoyeur";

const KEY = "pc_cleaner_link", SKIP = "pc_cleaner_skip";

/** Mémorise le lien personnel sur ce téléphone (nettoyeur indépendant ou agent salarié) : en rouvrant l'application, on retrouve directement sa journée. */
export function Remember({ token, base = "nettoyeur" }: { token: string; base?: "nettoyeur" | "agent" }) {
  useEffect(() => { try { localStorage.setItem(KEY, `/${base}/${token}`); } catch { /* navigation privée */ } }, [token, base]);
  return null;
}

/** Page d'accueil de l'application : redirige vers le compte mémorisé, sinon affiche son contenu. */
export function Resume({ reset, children }: { reset?: boolean; children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      if (reset) localStorage.removeItem(KEY);
      else {
        const v = localStorage.getItem(KEY) ?? "";
        const path = /^[0-9a-f]{64}$/.test(v) ? `/nettoyeur/${v}` : /^\/(nettoyeur|agent)\/[0-9a-f]{64}$/.test(v) ? v : null;
        if (path) { window.location.replace(path); return; }
      }
    } catch { /* ignoré */ }
    setReady(true);
  }, [reset]);
  return ready ? <>{children}</> : <p className="py-24 text-center text-[var(--a-mute)]">Chargement…</p>;
}

/** Les demandes arrivent en direct : la liste se rafraîchit toute seule ; un nouveau ménage fait vibrer et sonner le téléphone. */
export function LiveRefresh({ every = 15, ids = [] }: { every?: number; ids?: string[] }) {
  const router = useRouter();
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    if (seen.current === null) { seen.current = new Set(ids); return; }
    const added = ids.filter((i) => !seen.current!.has(i));
    ids.forEach((i) => seen.current!.add(i));
    if (!added.length) return;
    setFresh(true);
    try { navigator.vibrate?.([250, 120, 250]); } catch { /* ignoré */ }
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx(), o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.setValueAtTime(0.15, ctx.currentTime); o.start(); o.stop(ctx.currentTime + 0.25);
    } catch { /* ignoré */ }
    const t = setTimeout(() => setFresh(false), 8000);
    return () => clearTimeout(t);
  }, [ids]);
  useEffect(() => {
    // Le travail de fond (calendriers, distribution) tourne à part ; l'écran se rafraîchit sans l'attendre.
    const tick = () => { if (document.visibilityState === "visible") { void fetch("/api/nettoyeur/tick", { method: "POST" }).then(() => router.refresh()).catch(() => undefined); router.refresh(); } };
    tick();
    const id = setInterval(tick, every * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [router, every]);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--a-ok)]">
      <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--a-ok)]" />{fresh ? "Nouvelle demande !" : "En direct"}
    </span>
  );
}

const keyBytes = (b64: string) => { const p = "=".repeat((4 - (b64.length % 4)) % 4), r = atob((b64 + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };

async function enablePush(token: string): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return false;
    if (Notification.permission === "denied") return false;
    if (Notification.permission !== "granted" && (await Notification.requestPermission()) !== "granted") return false;
    const key = ((await (await fetch("/api/nettoyeur/push-key")).json()) as { key: string | null }).key;
    if (!key) return false;
    const reg = await navigator.serviceWorker.register("/nettoyeur/sw.js", { scope: "/nettoyeur/" });
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
    const j = sub.toJSON();
    if (!j.endpoint || !j.keys?.p256dh || !j.keys.auth) return false;
    return (await cleanerPushAction(token, { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth })).ok;
  } catch { return false; }
}

/** Le gros bouton des chauffeurs : se mettre en ligne pour recevoir les ménages (notification + position en direct). */
export function OnlinePanel({ token, online, hasPush, zone }: { token: string; online: boolean; hasPush: boolean; zone: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  // Position en direct tant que l'écran est ouvert et qu'on est en ligne (au plus toutes les 30 s).
  useEffect(() => {
    if (!online || !("geolocation" in navigator)) return;
    let last = 0;
    const id = navigator.geolocation.watchPosition((p) => { if (Date.now() - last > 30_000) { last = Date.now(); void cleanerPingAction(token, p.coords.latitude, p.coords.longitude); } }, () => undefined, { enableHighAccuracy: true, maximumAge: 20_000 });
    return () => navigator.geolocation.clearWatch(id);
  }, [online, token]);
  const toggle = async () => {
    setBusy(true); setNote("");
    if (!online) {
      const pushed = hasPush || (await enablePush(token));
      const ios = /iPhone|iPad/.test(navigator.userAgent) && !(window.matchMedia("(display-mode: standalone)").matches);
      setNote(pushed ? "" : ios ? "Pour être prévenu sur iPhone : ajoutez l'application à l'écran d'accueil (Partager › Sur l'écran d'accueil). En attendant, vous serez prévenu par e-mail." : "Notifications non activées : vous serez prévenu par e-mail.");
      if ("geolocation" in navigator) navigator.geolocation.getCurrentPosition((p) => void cleanerPingAction(token, p.coords.latitude, p.coords.longitude), () => undefined, { enableHighAccuracy: true, timeout: 8000 });
    }
    const r = await cleanerOnlineAction(token, !online);
    if (!r.ok) setNote(r.error ?? "Impossible pour le moment.");
    setBusy(false); router.refresh();
  };
  return (
    <section className={`mb-4 rounded-3xl p-5 text-center ${online ? "bg-[var(--a-okbg)]" : "bg-[var(--a-card)]"}`}>
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={online} aria-label={online ? "Se mettre hors ligne" : "Se mettre en ligne"}
        className={`mx-auto flex h-32 w-32 items-center justify-center rounded-full text-[28px] font-extrabold text-white shadow-lg active:scale-95 disabled:opacity-60 ${online ? "bg-[var(--a-ok)]" : "bg-[var(--a-pri)]"}`}>
        {busy ? "…" : online ? "STOP" : "GO"}
      </button>
      <div className="mt-3 text-[20px] font-extrabold">{online ? "Vous êtes en ligne" : "Vous êtes hors ligne"}</div>
      <p className="mt-0.5 text-[14px] text-[var(--a-mute)]">{online ? `Vous recherchez des ménages autour de ${zone}. Nous vous prévenons dès qu'un ménage apparaît.` : "Mettez-vous en ligne pour recevoir les ménages en priorité, avec une notification."}</p>
      {online && <p className="mt-1 text-[12px] text-[var(--a-mute)]">{hasPush ? "🔔 Notifications activées" : "✉️ Vous serez aussi prévenu par e-mail"}</p>}
      {note && <p role="status" className="mt-2 text-[13px] font-semibold text-[var(--a-warn)]">{note}</p>}
    </section>
  );
}

/** Une demande de ménage : « J'accepte » ou « Passer » (Passer la masque sur ce téléphone, sans rien changer pour les autres). */
export function RequestCard({ id, children, accept }: { id: string; children: React.ReactNode; accept: React.ReactNode }) {
  const [skipped, setSkipped] = useState(false);
  useEffect(() => { try { setSkipped((JSON.parse(localStorage.getItem(SKIP) ?? "[]") as string[]).includes(id)); } catch { /* ignoré */ } }, [id]);
  if (skipped) return null;
  const skip = () => {
    try { const l = JSON.parse(localStorage.getItem(SKIP) ?? "[]") as string[]; localStorage.setItem(SKIP, JSON.stringify([id, ...l].slice(0, 200))); } catch { /* ignoré */ }
    setSkipped(true);
  };
  return (
    <article className="space-y-3 rounded-3xl bg-[var(--a-card)] p-4">
      {children}
      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <button type="button" onClick={skip} className="h-14 rounded-2xl border border-[var(--a-line)] text-[17px] font-extrabold text-[var(--a-mute)] active:opacity-80">Passer</button>
        {accept}
      </div>
    </article>
  );
}

/** « Utiliser ma position » : le téléphone donne sa position GPS, envoyée avec le profil (rayon calculé depuis ce point). */
export function GpsButton() {
  const [msg, setMsg] = useState<string>("");
  const use = () => {
    if (!navigator.geolocation) { setMsg("La localisation n'est pas disponible sur cet appareil."); return; }
    setMsg("Localisation en cours…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const f = document.getElementById("gps-lat") as HTMLInputElement | null, g = document.getElementById("gps-lng") as HTMLInputElement | null;
        if (f && g) { f.value = String(p.coords.latitude); g.value = String(p.coords.longitude); }
        setMsg("Position GPS prise : enregistrez le profil pour l'utiliser.");
      },
      () => setMsg("Autorisez la localisation dans votre navigateur, ou renseignez votre adresse."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  return (
    <div>
      <input type="hidden" name="gps_lat" id="gps-lat" /><input type="hidden" name="gps_lng" id="gps-lng" />
      <button type="button" onClick={use} className="h-12 w-full rounded-2xl border border-[var(--a-pri)] text-base font-extrabold text-[var(--a-pri)]">📍 Utiliser ma position GPS</button>
      {msg && <p role="status" className="mt-1 text-xs text-[var(--a-mute)]">{msg}</p>}
    </div>
  );
}

/** Réduit une image (1280 px, JPEG) avant envoi. */
const toJpeg = (src: CanvasImageSource, w: number, h: number) => new Promise<Blob>((ok, ko) => {
  const scale = Math.min(1, 1280 / Math.max(w, h)), c = document.createElement("canvas");
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  c.toBlob((b) => (b ? ok(b) : ko(new Error("Image illisible"))), "image/jpeg", 0.7);
});

/** Tire `n` images réparties sur toute la durée d'une vidéo (dans le téléphone : la vidéo elle-même n'est jamais envoyée). */
async function videoFrames(file: File, n: number, onStep: (i: number) => void): Promise<Blob[]> {
  const url = URL.createObjectURL(file), v = document.createElement("video");
  v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
  try {
    await new Promise<void>((ok, ko) => { v.onloadeddata = () => ok(); v.onerror = () => ko(new Error("Vidéo illisible sur cet appareil.")); setTimeout(() => ko(new Error("Vidéo trop longue à ouvrir.")), 20000); });
    const d = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
    if (!d) throw new Error("Vidéo illisible sur cet appareil.");
    const out: Blob[] = [];
    for (let i = 0; i < n; i++) {
      await new Promise<void>((ok, ko) => { v.onseeked = () => ok(); v.onerror = () => ko(new Error("Vidéo illisible.")); v.currentTime = Math.min(d - 0.05, (d * (i + 0.5)) / n); setTimeout(() => ok(), 4000); });
      out.push(await toJpeg(v, v.videoWidth, v.videoHeight)); onStep(i + 1);
    }
    return out;
  } finally { URL.revokeObjectURL(url); }
}

/** « Filmer la pièce » : 8 images sont tirées de la vidéo et envoyées comme des photos avant / après, puis analysées. */
export function CleanerVideoButton({ token, job, kind, label }: { token: string; job: string; kind: "avant" | "apres"; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  async function onFile(f: File | undefined) {
    if (!f) return;
    setMsg(""); setBusy("Lecture de la vidéo…");
    try {
      const frames = await videoFrames(f, 8, (i) => setBusy(`Images ${i}/8…`));
      for (let i = 0; i < frames.length; i++) {
        setBusy(`Envoi ${i + 1}/${frames.length}…`);
        const fd = new FormData();
        fd.set("token", token); fd.set("job", job); fd.set("kind", kind); fd.set("file", frames[i]!, "image.jpg");
        if (i < frames.length - 1) fd.set("defer", "1");                 // l'analyse se fait une seule fois, sur la dernière image
        const r = await fetch("/api/nettoyeur/photo", { method: "POST", body: fd });
        if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Envoi impossible.");
      }
      router.refresh();
    } catch (e) { setMsg((e as Error).message || "Vidéo non lue : prenez des photos à la place."); }
    finally { setBusy(""); if (input.current) input.current.value = ""; }
  }
  return (
    <div>
      <button type="button" disabled={!!busy} onClick={() => input.current?.click()} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--a-line)] bg-[var(--a-bg)] text-[15px] font-bold text-[var(--a-pri)] active:opacity-80 disabled:opacity-60">🎥 {busy || label}</button>
      <input ref={input} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {msg && <p role="alert" className="mt-1 text-sm font-semibold text-[var(--a-bad)]">{msg}</p>}
    </div>
  );
}
