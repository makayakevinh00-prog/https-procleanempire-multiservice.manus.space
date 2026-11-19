"use client";

import Image from "next/image";

import { useMemo, useState } from "react";
import { videosList, videosPageContent, type VideoEntry } from "@/lib/content/phase3";
import { YoutubeVideoCard } from "@/components/ui/youtube-video-card";

const categories: Array<VideoEntry["category"] | "Toutes"> = [
  "Toutes",
  "Présentation",
  "Demonstrations",
  "Conseils",
  "Études de cas",
  "Coulisses",
  "Interventions"
];

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
      <div className="rounded-[28px] border border-[#dbe6fc] bg-white p-6 md:p-10">
        <h1 className="text-4xl lp-serif text-[#101828] md:text-5xl">{videosPageContent.title}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[#475467]">
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
                    ? "bg-[#1e3a6e] text-white"
                    : "border border-[#c9d8f5] bg-white text-[#475467] hover:border-[#1d6fe0]"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {filteredVideos.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-[#c9d8f5] bg-[#f7f9fd] p-5 text-sm text-[#475467]">
            {videosPageContent.placeholder}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredVideos.map((video) => {
              return (
                <article key={video.id} className="overflow-hidden rounded-[24px] border border-[#dbe6fc] bg-white">
                  {video.videoSrc ? (
                    <video
                      src={video.videoSrc}
                      poster={video.poster}
                      controls
                      playsInline
                      preload="metadata"
                      className="aspect-video w-full bg-black object-cover"
                    />
                  ) : video.youtubeUrl ? (
                    <YoutubeVideoCard youtubeUrl={video.youtubeUrl} title={video.title} />
                  ) : (
                    <Image
                      src="/media/photos/hero-showcase.webp"
                      alt={`Miniature vidéo ${video.title}`}
                      width={1600}
                      height={1600}
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="aspect-video w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#1d6fe0]">
                      {video.category}
                    </p>
                    <h2 className="mt-2 text-lg lp-serif text-[#101828]">{video.title}</h2>
                    <p className="mt-2 text-sm text-[#475467]">{video.description}</p>
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
            Voir toute notre chaîne YouTube
          </a>
        )}
      </div>
    </section>
  );
}
