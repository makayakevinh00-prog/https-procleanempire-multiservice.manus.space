"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { presentationVideo } from "@/lib/content/phase1";

function getYoutubeId(url: string) {
  if (!url || url.startsWith("[")) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

export function PresentationVideoSection({
  onOpenVideo
}: {
  onOpenVideo: () => void;
}) {
  const youtubeId = useMemo(() => getYoutubeId(presentationVideo.youtubeUrl), []);

  return (
    <section className="section pt-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-bold text-[#14213d] md:text-4xl">{presentationVideo.title}</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-700">{presentationVideo.description}</p>
            <button type="button" className="btn-primary mt-8" onClick={onOpenVideo}>
              ▶ {presentationVideo.ctaLabel}
            </button>
          </div>
          <motion.button
            type="button"
            onClick={onOpenVideo}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="group relative overflow-hidden rounded-2xl border border-[#14213d]/15 bg-slate-900 text-left"
            aria-label={presentationVideo.ctaLabel}
          >
            {/* thumbnail facade only; iframe is loaded in modal on demand */}
            <div
              className="aspect-video bg-cover bg-center"
              style={{
                backgroundImage: youtubeId
                  ? `url(https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg)`
                  : `url(${presentationVideo.thumbnail})`
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <span className="absolute left-4 top-4 rounded-full bg-[#c9a227] px-3 py-1 text-xs font-semibold text-[#14213d]">
              VIDEO
            </span>
            <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#14213d] transition group-hover:bg-white">
              ▶ Lire
            </span>
          </motion.button>
        </div>
      </div>
    </section>
  );
}

export function PresentationVideoModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const youtubeId = useMemo(() => getYoutubeId(presentationVideo.youtubeUrl), []);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Video de presentation ProClean Empire"
    >
      <div className="w-full max-w-4xl rounded-2xl bg-white p-4 shadow-soft md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#14213d]">{presentationVideo.title}</h3>
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
            Fermer
          </button>
        </div>
        {youtubeId ? (
          <div className="aspect-video overflow-hidden rounded-xl border border-slate-200">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
              title="Presentation ProClean Empire"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
            [A REMPLIR PAR VOUS] Ajoutez le lien YouTube de presentation dans
            <code className="ml-1 rounded bg-slate-200 px-1 py-0.5">lib/content/phase1.ts</code>.
          </div>
        )}
      </div>
    </div>
  );
}
