"use client";

import { useState } from "react";
import { getYoutubeId } from "@/lib/youtube";

export function YoutubeVideoCard({
  youtubeUrl,
  title,
  aspect = "aspect-video"
}: {
  youtubeUrl: string;
  title: string;
  aspect?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const id = getYoutubeId(youtubeUrl);

  if (!id) {
    return null;
  }

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className={`${aspect} w-full`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className={`group relative block ${aspect} w-full`}
      aria-label={`Lire ${title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt={`Miniature vidéo ${title}`}
        loading="lazy"
        className="h-full w-full object-cover"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/30">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#14213d] transition group-hover:bg-white">
          ▶ Lire
        </span>
      </span>
    </button>
  );
}
