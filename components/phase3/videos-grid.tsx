"use client";

import { useMemo, useState } from "react";
import { videosList, videosPageContent, type VideoEntry } from "@/lib/content/phase3";

const categories: Array<VideoEntry["category"] | "Toutes"> = [
  "Toutes",
  "Presentation",
  "Demonstrations",
  "Conseils",
  "Etudes de cas",
  "Coulisses",
  "Interventions"
];

function getYoutubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2] ?? null;
      }
      return parsed.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

const hasRealChannelUrl = !videosPageContent.youtubeChannelUrl.startsWith("[");

export function VideosGrid() {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("Toutes");

  const filteredVideos = useMemo(() => {
    if (activeCategory === "Toutes") {
      return videosList;
    }
    return videosList.filter((video) => video.category === activeCategory);
  }, [activeCategory]);

  return (
    <section className="section pt-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-10">
        <h1 className="text-4xl font-bold text-[#14213d] md:text-5xl">{videosPageContent.title}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-700">
          {videosPageContent.description}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  active
                    ? "bg-[#14213d] text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-[#c9a227]"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {filteredVideos.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            {videosPageContent.placeholder}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredVideos.map((video) => {
              const id = video.youtubeUrl ? getYoutubeId(video.youtubeUrl) : null;
              const thumb = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined;

              return (
                <article key={video.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {video.videoSrc ? (
                    <video
                      src={video.videoSrc}
                      poster={video.poster}
                      controls
                      playsInline
                      preload="metadata"
                      className="aspect-video w-full bg-black object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb ?? "/media/placeholders/video-thumbnail.jpg"}
                      alt={`Miniature video ${video.title}`}
                      loading="lazy"
                      className="aspect-video w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#c9a227]">
                      {video.category}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[#14213d]">{video.title}</h2>
                    <p className="mt-2 text-sm text-slate-600">{video.description}</p>
                    {video.youtubeUrl && !video.videoSrc && (
                      <a
                        href={video.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex text-sm font-semibold text-[#14213d] underline"
                      >
                        Regarder
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {hasRealChannelUrl && (
          <a
            href={videosPageContent.youtubeChannelUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-8"
          >
            Voir toute notre chaine YouTube
          </a>
        )}
      </div>
    </section>
  );
}
