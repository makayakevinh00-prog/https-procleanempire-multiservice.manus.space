"use client";

import { motion } from "framer-motion";
import { presentationVideo } from "@/lib/content/phase1";
import { getYoutubeId } from "@/lib/youtube";

export function PresentationVideoSection({
  onOpenVideo
}: {
  onOpenVideo: () => void;
}) {
  const youtubeId = getYoutubeId(presentationVideo.youtubeUrl);
  const thumbnail = youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : undefined;

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
            className="group relative mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl border border-[#14213d]/15 bg-slate-900 text-left"
            aria-label={presentationVideo.ctaLabel}
          >
            {/* thumbnail facade only; video is loaded in modal on demand */}
            <div
              className="aspect-[9/16] bg-cover bg-center"
              style={{ backgroundImage: `url(${thumbnail})` }}
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
  if (!open) {
    return null;
  }

  const youtubeId = getYoutubeId(presentationVideo.youtubeUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Video de presentation ProClean Empire"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-soft md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#14213d]">{presentationVideo.title}</h3>
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
            Fermer
          </button>
        </div>
        <div className="aspect-[9/16] overflow-hidden rounded-xl border border-slate-200 bg-black">
          {youtubeId && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`}
              title={presentationVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}
