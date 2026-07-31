"use client";

import { ChangeEvent, useMemo, useState } from "react";
import {
  optimizeSocialVideo,
  RushClipInput,
  SocialPlatform,
  VideoObjective
} from "@/lib/social-video-optimizer";

const defaultClipMetrics = {
  hookStrength: 3,
  visualQuality: 3,
  actionDensity: 3,
  speechClarity: 3,
  relevance: 3
};

const platformLabels: Record<SocialPlatform, string> = {
  tiktok: "TikTok",
  instagram_reels: "Instagram Reels",
  youtube_shorts: "YouTube Shorts"
};

const objectiveLabels: Record<VideoObjective, string> = {
  conversion: "Générer des demandes clients",
  education: "Éduquer avec conseils utiles",
  before_after: "Montrer un avant / après impactant",
  authority: "Prouver l'expertise"
};

async function extractVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 6;
      URL.revokeObjectURL(objectUrl);
      resolve(Math.max(2, Math.min(60, duration)));
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(6);
    };

    video.src = objectUrl;
  });
}

function MetricSlider({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
      <span>{label}</span>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-[#14213d]"
      />
      <span className="text-[11px] text-slate-500">Niveau: {value}/5</span>
    </label>
  );
}

export function SocialVideoStudio() {
  const [theme, setTheme] = useState("nettoyage");
  const [platform, setPlatform] = useState<SocialPlatform>("instagram_reels");
  const [objective, setObjective] = useState<VideoObjective>("before_after");
  const [clips, setClips] = useState<RushClipInput[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const optimization = useMemo(() => {
    if (!hasGenerated || clips.length === 0) {
      return null;
    }
    return optimizeSocialVideo({
      clips,
      platform,
      objective,
      theme
    });
  }, [clips, hasGenerated, objective, platform, theme]);

  const onFilesChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(event.target.files ?? []);
    if (incomingFiles.length === 0) {
      return;
    }

    setIsExtracting(true);
    const hydrated = await Promise.all(
      incomingFiles.map(async (file, index) => {
        const durationSec = await extractVideoDuration(file);
        return {
          id: `${file.name}-${file.lastModified}-${index}`,
          label: file.name,
          durationSec: Number(durationSec.toFixed(1)),
          ...defaultClipMetrics,
          hasHumanFace: false,
          hasBeforeAfterReveal: objective === "before_after"
        } satisfies RushClipInput;
      })
    );

    setClips((current) => [...current, ...hydrated]);
    setHasGenerated(false);
    setIsExtracting(false);
    event.target.value = "";
  };

  const updateClip = (clipId: string, patch: Partial<RushClipInput>) => {
    setClips((current) =>
      current.map((clip) => {
        if (clip.id !== clipId) {
          return clip;
        }
        return {
          ...clip,
          ...patch
        };
      })
    );
    setHasGenerated(false);
  };

  const removeClip = (clipId: string) => {
    setClips((current) => current.filter((clip) => clip.id !== clipId));
    setHasGenerated(false);
  };

  return (
    <section className="section">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="card p-8">
          <span className="inline-flex rounded-full bg-[#14213d]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#14213d]">
            Studio IA social
          </span>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
            Montage vidéo automatique orienté rétention réseaux sociaux
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Application de montage indépendante du site vitrine: chargez vos rushs, sélectionnez votre objectif et
            laissez l&apos;assistant vous proposer un plan qui maximise le watch time, les hooks et la conversion.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="card p-6 md:p-8">
            <h2 className="text-xl font-semibold text-slate-900">Configuration du montage</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Thème principal
                <input
                  type="text"
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                  placeholder="Ex: nettoyage, detailing, restauration..."
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#14213d]"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Réseau ciblé
                <select
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value as SocialPlatform)}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#14213d]"
                >
                  {Object.entries(platformLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Objectif de la vidéo
                <select
                  value={objective}
                  onChange={(event) => setObjective(event.target.value as VideoObjective)}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#14213d]"
                >
                  {Object.entries(objectiveLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 hover:border-[#14213d]/40">
                <span className="font-semibold">Ajouter vos rushs vidéo</span>
                <span className="text-xs text-slate-500">
                  Formats acceptés via navigateur. Les durées sont détectées automatiquement.
                </span>
                <input type="file" accept="video/*" multiple onChange={onFilesChange} className="text-xs" />
              </label>
              {isExtracting && <p className="mt-2 text-xs text-slate-500">Analyse des fichiers en cours...</p>}
            </div>

            <button
              type="button"
              disabled={clips.length === 0}
              onClick={() => setHasGenerated(true)}
              className={`btn-primary mt-6 w-full ${clips.length === 0 ? "cursor-not-allowed opacity-60" : ""}`}
            >
              Générer le plan de montage automatique
            </button>
          </div>

          <div className="card p-6 md:p-8">
            <h2 className="text-xl font-semibold text-slate-900">Rushs importés ({clips.length})</h2>
            {clips.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">
                Aucun rush pour le moment. Ajoutez vos vidéos pour calibrer le scoring de montage.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {clips.map((clip) => (
                  <article key={clip.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{clip.label}</p>
                        <p className="text-xs text-slate-500">Durée brute: {clip.durationSec}s</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeClip(clip.id)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-rose-300 hover:text-rose-600"
                      >
                        Retirer
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MetricSlider
                        label="Force du hook"
                        value={clip.hookStrength}
                        onChange={(value) => updateClip(clip.id, { hookStrength: value })}
                      />
                      <MetricSlider
                        label="Qualité visuelle"
                        value={clip.visualQuality}
                        onChange={(value) => updateClip(clip.id, { visualQuality: value })}
                      />
                      <MetricSlider
                        label="Dynamique / mouvement"
                        value={clip.actionDensity}
                        onChange={(value) => updateClip(clip.id, { actionDensity: value })}
                      />
                      <MetricSlider
                        label="Clarté voix / explication"
                        value={clip.speechClarity}
                        onChange={(value) => updateClip(clip.id, { speechClarity: value })}
                      />
                      <MetricSlider
                        label="Pertinence pour le thème"
                        value={clip.relevance}
                        onChange={(value) => updateClip(clip.id, { relevance: value })}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={clip.hasHumanFace}
                          onChange={(event) => updateClip(clip.id, { hasHumanFace: event.target.checked })}
                          className="accent-[#14213d]"
                        />
                        Présence humaine (face caméra)
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={clip.hasBeforeAfterReveal}
                          onChange={(event) =>
                            updateClip(clip.id, { hasBeforeAfterReveal: event.target.checked })
                          }
                          className="accent-[#14213d]"
                        />
                        Reveal avant / après
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        {optimization && (
          <div className="card p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Plan généré
              </span>
              <span className="text-xs text-slate-500">
                Durée cible {optimization.targetDurationSec}s • estimée {optimization.estimatedDurationSec}s
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-semibold text-slate-900">
              Recommandations pour {optimization.platformLabel} — {optimization.objectiveLabel}
            </h2>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Hook d&apos;ouverture</h3>
                <p className="mt-2 text-sm text-slate-700">{optimization.openingHook}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Sous-titres et caption</h3>
                <p className="mt-2 text-sm text-slate-700">{optimization.subtitleStyle}</p>
                <p className="mt-2 text-sm text-slate-700">
                  <span className="font-semibold">Caption:</span> {optimization.captionTemplate}
                </p>
                <p className="mt-2 text-sm text-slate-700">{optimization.ctaLine}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                  Timeline de montage
                </h3>
                <ol className="mt-3 space-y-3">
                  {optimization.timeline.map((clip, index) => (
                    <li key={clip.id} className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-900">
                        #{index + 1} — {clip.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Conserver {clip.keepDurationSec}s • score {clip.score}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">{clip.reason}</p>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                    Sons du moment conseillés
                  </h3>
                  <ul className="mt-3 space-y-2 rounded-2xl border border-slate-200 p-4">
                    {optimization.trendAudioSuggestions.map((track) => (
                      <li key={track} className="text-sm text-slate-700">
                        • {track}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                    Points de décrochage à corriger
                  </h3>
                  {optimization.dropOffAlerts.length === 0 ? (
                    <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                      Aucun décrochage critique détecté sur la version proposée.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {optimization.dropOffAlerts.map((alert) => (
                        <li
                          key={`${alert.atSecond}-${alert.message}`}
                          className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                        >
                          À {alert.atSecond}s ({alert.severity}) — {alert.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
