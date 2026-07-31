"use client";

import { ChangeEvent, useMemo, useState } from "react";
import {
  generateMultiVideoPlans,
  MultiVideoPlanResult,
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
      const duration = Number.isFinite(video.duration) ? video.duration : 12;
      URL.revokeObjectURL(objectUrl);
      resolve(Math.max(4, Math.min(240, duration)));
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(12);
    };

    video.src = objectUrl;
  });
}

function createCandidateSegments(params: {
  file: File;
  durationSec: number;
  objective: VideoObjective;
  indexSeed: number;
}): RushClipInput[] {
  const { file, durationSec, objective, indexSeed } = params;
  const segmentCount = Math.max(1, Math.min(8, Math.ceil(durationSec / 8)));
  const segmentDuration = Number((durationSec / segmentCount).toFixed(1));

  return Array.from({ length: segmentCount }, (_, segmentIndex) => {
    const dynamicBoost = segmentIndex % 2 === 0 ? 1 : 0;
    return {
      id: `${file.name}-${file.lastModified}-${indexSeed}-${segmentIndex}`,
      label: `${file.name} · segment ${segmentIndex + 1}`,
      durationSec: Math.max(2.5, Math.min(10, segmentDuration)),
      hookStrength: Math.min(5, defaultClipMetrics.hookStrength + dynamicBoost),
      visualQuality: defaultClipMetrics.visualQuality,
      actionDensity: Math.min(5, defaultClipMetrics.actionDensity + dynamicBoost),
      speechClarity: defaultClipMetrics.speechClarity,
      relevance: defaultClipMetrics.relevance,
      hasHumanFace: false,
      hasBeforeAfterReveal: objective === "before_after"
    };
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
        className="accent-indigo-600"
      />
      <span className="text-[11px] text-slate-500">Niveau: {value}/5</span>
    </label>
  );
}

function downloadPlanAsJson(planResult: MultiVideoPlanResult) {
  const content = JSON.stringify(planResult, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "plans_montage_viraux.json";
  link.click();
  URL.revokeObjectURL(url);
}

export function SocialVideoStudio() {
  const [theme, setTheme] = useState("nettoyage");
  const [platform, setPlatform] = useState<SocialPlatform>("instagram_reels");
  const [objective, setObjective] = useState<VideoObjective>("before_after");
  const [clips, setClips] = useState<RushClipInput[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [variantsCount, setVariantsCount] = useState(3);
  const [crossPostPlatforms, setCrossPostPlatforms] = useState(true);

  const planResult = useMemo(() => {
    if (!hasGenerated || clips.length === 0) {
      return null;
    }
    return generateMultiVideoPlans({
      clips,
      basePlatform: platform,
      objective,
      theme,
      variantsCount,
      crossPostPlatforms
    });
  }, [clips, crossPostPlatforms, hasGenerated, objective, platform, theme, variantsCount]);

  const onFilesChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(event.target.files ?? []);
    if (incomingFiles.length === 0) {
      return;
    }

    setIsExtracting(true);
    const segmentedEntries = await Promise.all(
      incomingFiles.map(async (file, index) => {
        const durationSec = await extractVideoDuration(file);
        return createCandidateSegments({
          file,
          durationSec,
          objective,
          indexSeed: index
        });
      })
    );

    setClips((current) => [...current, ...segmentedEntries.flat()]);
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

  const onGenerate = () => {
    setHasGenerated(true);
  };

  return (
    <section className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-10 md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-indigo-400/30 bg-slate-900/60 p-6 shadow-2xl backdrop-blur md:p-8">
          <p className="inline-flex rounded-full border border-indigo-300/40 bg-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-100">
            App interne · montage viral automatique
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white md:text-4xl">
            Déposez vos vidéos, l&apos;app prépare automatiquement plusieurs montages prêts à publier
          </h1>
          <p className="mt-3 max-w-4xl text-sm text-slate-300 md:text-base">
            Workflow simple: 1) import des rushs, 2) choix d&apos;objectif, 3) génération de plusieurs vidéos
            optimisées par réseau. L&apos;assistant propose les découpes, hooks, sous-titres, CTA et sons tendance.
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-700 bg-slate-900/60 p-6 shadow-lg backdrop-blur md:p-7">
              <h2 className="text-lg font-semibold text-white">Étape 1 — Configuration</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                  Thème principal
                  <input
                    type="text"
                    value={theme}
                    onChange={(event) => setTheme(event.target.value)}
                    placeholder="Ex: nettoyage, detailing, restauration..."
                    className="rounded-xl border border-slate-600 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                  Réseau principal
                  <select
                    value={platform}
                    onChange={(event) => setPlatform(event.target.value as SocialPlatform)}
                    className="rounded-xl border border-slate-600 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400"
                  >
                    {Object.entries(platformLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200 md:col-span-2">
                  Objectif business
                  <select
                    value={objective}
                    onChange={(event) => setObjective(event.target.value as VideoObjective)}
                    className="rounded-xl border border-slate-600 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400"
                  >
                    {Object.entries(objectiveLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-700 bg-slate-900/60 p-6 shadow-lg backdrop-blur md:p-7">
              <h2 className="text-lg font-semibold text-white">Étape 2 — Upload & découpes automatiques</h2>
              <p className="mt-2 text-sm text-slate-300">
                Même avec une seule vidéo longue, l&apos;app crée automatiquement plusieurs segments exploitables.
              </p>

              <div className="mt-4 rounded-2xl border border-dashed border-slate-600 bg-slate-950/50 p-4">
                <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-200 hover:border-indigo-400/60">
                  <span className="font-semibold">Déposer les vidéos</span>
                  <span className="text-xs text-slate-400">
                    Durée détectée automatiquement, puis découpage en segments IA.
                  </span>
                  <input type="file" accept="video/*" multiple onChange={onFilesChange} className="text-xs" />
                </label>
                {isExtracting && <p className="mt-2 text-xs text-slate-400">Analyse et découpage en cours...</p>}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                  Nombre de vidéos à générer
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={variantsCount}
                    onChange={(event) => setVariantsCount(Number(event.target.value))}
                    className="rounded-xl border border-slate-600 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400"
                  />
                </label>
                <label className="inline-flex items-center gap-2 self-end text-sm font-medium text-slate-200">
                  <input
                    type="checkbox"
                    checked={crossPostPlatforms}
                    onChange={(event) => setCrossPostPlatforms(event.target.checked)}
                    className="accent-indigo-500"
                  />
                  Alterner les plateformes (TikTok/Reels/Shorts)
                </label>
              </div>

              <button
                type="button"
                disabled={clips.length === 0}
                onClick={onGenerate}
                className={`mt-6 inline-flex w-full items-center justify-center rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 ${
                  clips.length === 0 ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                Générer mes montages automatiques
              </button>
            </section>
          </div>

          <aside className="rounded-3xl border border-slate-700 bg-slate-900/60 p-6 shadow-lg backdrop-blur md:p-7">
            <h2 className="text-lg font-semibold text-white">Étape 3 — Segments détectés ({clips.length})</h2>
            {clips.length === 0 ? (
              <p className="mt-3 text-sm text-slate-300">
                Aucun segment pour le moment. Importez vos vidéos pour lancer l&apos;analyse automatique.
              </p>
            ) : (
              <div className="mt-4 max-h-[680px] space-y-4 overflow-auto pr-1">
                {clips.map((clip) => (
                  <article key={clip.id} className="rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{clip.label}</p>
                        <p className="text-xs text-slate-400">Durée segment: {clip.durationSec}s</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeClip(clip.id)}
                        className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-rose-300 hover:text-rose-300"
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
                        label="Dynamique"
                        value={clip.actionDensity}
                        onChange={(value) => updateClip(clip.id, { actionDensity: value })}
                      />
                      <MetricSlider
                        label="Clarté voix"
                        value={clip.speechClarity}
                        onChange={(value) => updateClip(clip.id, { speechClarity: value })}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-300">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={clip.hasHumanFace}
                          onChange={(event) => updateClip(clip.id, { hasHumanFace: event.target.checked })}
                          className="accent-indigo-500"
                        />
                        Face caméra
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={clip.hasBeforeAfterReveal}
                          onChange={(event) =>
                            updateClip(clip.id, { hasBeforeAfterReveal: event.target.checked })
                          }
                          className="accent-indigo-500"
                        />
                        Avant / après
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>

        {planResult && (
          <section className="rounded-3xl border border-indigo-400/30 bg-slate-900/70 p-6 shadow-2xl backdrop-blur md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="inline-flex rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Plans générés automatiquement
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  {planResult.plans.length} vidéos prêtes à produire — objectif {planResult.objectiveLabel}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => downloadPlanAsJson(planResult)}
                className="rounded-xl border border-indigo-300/60 px-4 py-2 text-sm font-semibold text-indigo-100 hover:bg-indigo-500/20"
              >
                Télécharger le plan JSON
              </button>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              {planResult.plans.map((plan) => (
                <article key={plan.id} className="rounded-2xl border border-slate-700 bg-slate-950/50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">
                      {plan.title} · {plan.platformLabel}
                    </h3>
                    <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-xs font-medium text-indigo-200">
                      {plan.estimatedDurationSec}s / cible {plan.targetDurationSec}s
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-300">
                    <span className="font-semibold text-white">Angle:</span> {plan.angle}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    <span className="font-semibold text-white">Hook:</span> {plan.openingHook}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    <span className="font-semibold text-white">Sous-titres:</span> {plan.subtitleStyle}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    <span className="font-semibold text-white">Caption:</span> {plan.captionTemplate}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    <span className="font-semibold text-white">CTA:</span> {plan.ctaLine}
                  </p>
                  <p className="mt-2 text-sm text-indigo-200">{plan.publishMoment}</p>

                  <div className="mt-4 rounded-xl border border-slate-700 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Timeline recommandée</p>
                    <ol className="mt-2 space-y-2">
                      {plan.timeline.map((clip, index) => (
                        <li key={`${plan.id}-${clip.id}-${index}`} className="rounded-lg bg-slate-900 p-2 text-xs text-slate-200">
                          #{index + 1} · {clip.label} · garder {clip.keepDurationSec}s · score {clip.score}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-700 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Sons du moment</p>
                      <ul className="mt-2 space-y-1 text-xs text-slate-200">
                        {plan.trendAudioSuggestions.map((track) => (
                          <li key={`${plan.id}-${track}`}>• {track}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-slate-700 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Points de vigilance</p>
                      {plan.dropOffAlerts.length === 0 ? (
                        <p className="mt-2 text-xs text-emerald-300">Aucun décrochage critique détecté.</p>
                      ) : (
                        <ul className="mt-2 space-y-1 text-xs text-amber-200">
                          {plan.dropOffAlerts.map((alert) => (
                            <li key={`${plan.id}-${alert.atSecond}-${alert.message}`}>
                              {alert.atSecond}s ({alert.severity}) · {alert.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
