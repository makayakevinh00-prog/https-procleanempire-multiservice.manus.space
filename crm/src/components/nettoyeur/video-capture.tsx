"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toJpeg, videoFrames } from "@/components/nettoyeur/live";

const MAX_FRAMES = 14,
  EVERY_MS = 2500,
  MIN_FRAMES = 4;
const mmss = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Caméra intégrée de la mission : le nettoyeur appuie sur « Filmer », fait le tour, appuie sur « Terminer ».
 * Des captures sont tirées toutes les 2,5 s pendant le film (la vidéo elle-même n'est jamais envoyée) puis envoyées à l'IA, qui les classe par pièce.
 * Si le navigateur refuse la caméra, le film se fait avec l'appareil du téléphone (même résultat).
 */
export function VideoCapture({
  token,
  job,
  kind,
  title,
  hint,
  onDone,
  onCancel,
  endpoint = "/api/nettoyeur/photo",
  lastLabel,
  minHint,
}: {
  token: string;
  job: string;
  kind: "avant" | "apres";
  title: string;
  hint: string;
  onDone: () => void;
  onCancel?: () => void;
  /** Où partent les captures : l'appli nettoyeur par défaut, « /api/agent/photo » pour un agent ProClean. */
  endpoint?: string;
  /** Message affiché pendant l'envoi de la dernière image (l'analyse) ; par défaut selon « kind ». */
  lastLabel?: string;
  /** Message quand le film est trop court ; par défaut « faites le tour du logement ». */
  minHint?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const frames = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lock = useRef<any>(null);
  const ticks = useRef(0),
    stride = useRef(1);
  const input = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [direct, setDirect] = useState(true); // false : caméra du navigateur indisponible → appareil du téléphone
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(0);
  const [count, setCount] = useState(0);
  const [sending, setSending] = useState("");
  const [msg, setMsg] = useState("");
  const [retry, setRetry] = useState(false);

  const stopCamera = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    lock.current?.release?.().catch(() => undefined);
    lock.current = null;
  }, []);

  useEffect(() => {
    let dead = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setDirect(false);
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (dead) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        const v = video.current;
        if (v) {
          v.srcObject = s;
          v.muted = true;
          await v.play().catch(() => undefined);
        }
        setReady(true);
      } catch {
        if (!dead) setDirect(false);
      }
    })();
    return () => {
      dead = true;
      stopCamera();
    };
  }, [stopCamera]);

  const grab = useCallback(async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const b = await toJpeg(v, v.videoWidth, v.videoHeight).catch(() => null);
    if (!b) return;
    frames.current.push(b);
    // Trop d'images : on garde une image sur deux et on espace les suivantes, pour couvrir tout le film.
    if (frames.current.length > MAX_FRAMES) {
      frames.current = frames.current.filter((_, i) => i % 2 === 0);
      stride.current *= 2;
    }
    setCount(frames.current.length);
  }, []);

  const upload = useCallback(
    async (list: Blob[]) => {
      setMsg("");
      try {
        for (let i = 0; i < list.length; i++) {
          setSending(
            i === list.length - 1
              ? lastLabel ?? (kind === "avant" ? "L'IA analyse le lieu…" : "L'IA contrôle votre travail…")
              : `Envoi ${i + 1}/${list.length}…`,
          );
          const fd = new FormData();
          fd.set("token", token);
          fd.set("job", job);
          fd.set("kind", kind);
          fd.set("file", list[i]!, "image.jpg");
          fd.set("film", "1");
          fd.set("index", String(i));
          if (i < list.length - 1) fd.set("defer", "1"); // l'analyse se fait une seule fois, sur la dernière image
          const r = await fetch(endpoint, {
            method: "POST",
            body: fd,
          });
          if (!r.ok)
            throw new Error(
              ((await r.json().catch(() => ({}))) as { error?: string })
                .error ?? "Envoi impossible.",
            );
        }
        setSending("");
        onDone();
      } catch (e) {
        setSending("");
        setMsg((e as Error).message || "Envoi impossible, réessayez.");
      }
    },
    [token, job, kind, onDone, endpoint, lastLabel],
  );

  const start = async () => {
    frames.current = [];
    ticks.current = 0;
    stride.current = 1;
    setCount(0);
    setSecs(0);
    setMsg("");
    setRec(true);
    (navigator as any).wakeLock
      ?.request("screen")
      .then((l: any) => {
        lock.current = l;
      })
      .catch(() => undefined);
    await grab();
    timer.current = setInterval(() => {
      ticks.current += 1;
      setSecs(Math.round((ticks.current * 500) / 1000));
      if (ticks.current % (5 * stride.current) === 0) void grab(); // 5 × 0,5 s = 2,5 s
    }, 500);
  };
  const stop = async () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    await grab();
    if (frames.current.length < MIN_FRAMES) {
      setRec(false);
      setMsg(
        minHint ?? "Filmez un peu plus longtemps : faites le tour du logement (au moins 10 secondes).",
      );
      frames.current = [];
      setCount(0);
      return;
    }
    setRec(false);
    stopCamera();
    void upload(frames.current);
  };
  const fromPhone = async (f: File | undefined) => {
    if (!f) return;
    setMsg("");
    setSending("Lecture du film…");
    try {
      const list = await videoFrames(f, 10, (i) =>
        setSending(`Images ${i}/10…`),
      );
      await upload(list);
    } catch (e) {
      setSending("");
      setMsg((e as Error).message || "Film illisible : filmez à nouveau.");
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--a-bg)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]"
      role="dialog"
      aria-label={title}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-extrabold leading-tight tracking-tight">
            {title}
          </h2>
          <p className="mt-0.5 text-[14px] text-[var(--a-mute)]">{hint}</p>
        </div>
        {onCancel && !rec && !sending && (
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            className="shrink-0 rounded-full border border-[var(--a-line)] px-4 py-2 text-[14px] font-bold text-[var(--a-mute)]"
          >
            Fermer
          </button>
        )}
      </div>

      {direct ? (
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[28px] border border-[var(--a-line)] bg-[var(--a-card)]">
          <video
            ref={video}
            playsInline
            muted
            autoPlay
            className="h-full w-full object-cover"
          />
          {!ready && (
            <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-[15px] font-semibold text-[var(--a-mute)]">
              Ouverture de la caméra… autorisez-la si le téléphone le demande.
            </p>
          )}
          {rec && (
            <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-[var(--a-bg)] px-3 py-1.5 text-[14px] font-extrabold">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--a-bad)]" />
              {mmss(secs)} · {count} captures
            </span>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-[28px] bg-[var(--a-card)] p-6 text-center">
          <p className="text-[16px] font-semibold">
            Filmez avec l&apos;appareil du téléphone : faites le tour du
            logement, puis validez la vidéo. Les captures sont tirées toutes
            seules.
          </p>
          <button
            type="button"
            disabled={!!sending}
            onClick={() => input.current?.click()}
            className="h-16 w-full rounded-full bg-[var(--a-pri)] text-[18px] font-extrabold text-white active:scale-[0.98] disabled:opacity-60"
          >
            {sending || "Ouvrir la caméra"}
          </button>
          <input
            ref={input}
            type="file"
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void fromPhone(e.target.files?.[0])}
          />
        </div>
      )}

      {msg && (
        <p
          role="alert"
          className="mt-3 rounded-2xl bg-[var(--a-badbg)] p-3 text-center text-[14px] font-bold text-[var(--a-bad)]"
        >
          {msg}
          {!direct || frames.current.length ? "" : ""}
        </p>
      )}
      {sending && direct && (
        <p
          role="status"
          className="mt-3 rounded-2xl bg-[var(--a-soft)] p-3 text-center text-[15px] font-extrabold text-[var(--a-pri)]"
        >
          {sending}
        </p>
      )}
      {direct && !sending && !retry && (
        <div className="mt-4 flex items-center justify-center">
          {!rec ? (
            <button
              type="button"
              disabled={!ready}
              onClick={() => void start()}
              className="h-16 w-full max-w-sm rounded-full bg-[var(--a-pri)] text-[19px] font-extrabold text-white active:scale-[0.98] disabled:opacity-50"
            >
              ● Filmer
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void stop()}
              className="h-16 w-full max-w-sm rounded-full bg-[var(--a-ok)] text-[19px] font-extrabold text-[var(--a-bg)] active:scale-[0.98]"
            >
              ■ Terminer le film
            </button>
          )}
        </div>
      )}
      {msg &&
        direct &&
        !sending &&
        !rec &&
        frames.current.length === 0 &&
        count === 0 &&
        /Envoi|impossible|Réessayez/i.test(msg) &&
        null}
    </div>
  );
}
