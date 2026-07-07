"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { premiumReviewsData } from "@/lib/content/phase1";

type CarouselSlide =
  | { kind: "text"; id: string; name: string; company: string; role: string; rating: number; text: string }
  | { kind: "video"; id: string; title: string; description: string; youtubeUrl: string };

function Rating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1 text-[#c9a227]" aria-label={`${value} sur 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} aria-hidden>
          {index < value ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

const AUTOPLAY_DELAY_MS = 6000;

export function ReviewsPremiumSection() {
  const slides = useMemo<CarouselSlide[]>(() => {
    const textSlides: CarouselSlide[] = premiumReviewsData.textReviews.map((review) => ({
      kind: "text",
      ...review
    }));
    const videoSlides: CarouselSlide[] = premiumReviewsData.videoTestimonials.map((video) => ({
      kind: "video",
      ...video
    }));
    return [...textSlides, ...videoSlides];
  }, []);

  const [activeIndex, setActiveIndex] = useState(0);
  const hasScreenshots = premiumReviewsData.googleReviewScreenshots.length > 0;

  useEffect(() => {
    if (slides.length < 2) {
      return;
    }
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_DELAY_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="section pt-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-10">
        <h2 className="text-3xl font-bold text-[#14213d] md:text-4xl">
          {premiumReviewsData.sectionTitle}
        </h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-700">
          {premiumReviewsData.sectionDescription}
        </p>

        {slides.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            {premiumReviewsData.placeholders.textReviews}
          </div>
        ) : (
          <div className="relative mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="p-6 md:p-10"
              >
                {slides[activeIndex].kind === "text" ? (
                  <>
                    <Rating value={slides[activeIndex].rating} />
                    <p className="mt-4 text-lg leading-relaxed text-slate-700">
                      &ldquo;{slides[activeIndex].text}&rdquo;
                    </p>
                    <p className="mt-5 text-sm font-semibold text-[#14213d]">
                      {slides[activeIndex].name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {slides[activeIndex].role} · {slides[activeIndex].company}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#c9a227]">
                      Temoignage video
                    </p>
                    <p className="mt-3 text-lg font-semibold text-[#14213d]">
                      {slides[activeIndex].title}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{slides[activeIndex].description}</p>
                    <a
                      href={slides[activeIndex].youtubeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex text-sm font-semibold text-[#14213d] underline"
                    >
                      Voir la video
                    </a>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {slides.length > 1 && (
              <div className="flex items-center justify-center gap-2 pb-5">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Avis ${index + 1}`}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === activeIndex ? "w-6 bg-[#14213d]" : "w-2 bg-slate-300"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {hasScreenshots && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Captures Google Reviews
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              {premiumReviewsData.googleReviewScreenshots.map((image) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={image}
                  src={image}
                  alt="Capture d'ecran Google Reviews"
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
