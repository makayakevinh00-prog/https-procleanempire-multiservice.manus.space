"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  galleryCategories,
  galleryItems,
  galleryPageContent,
  type GalleryCategory
} from "@/lib/content/phase2";

export function GalleryFilterGrid() {
  const [activeCategory, setActiveCategory] = useState<GalleryCategory>(galleryCategories[0]);

  const filteredItems = useMemo(
    () => galleryItems.filter((item) => item.category === activeCategory),
    [activeCategory]
  );

  return (
    <section className="section pt-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#c9a227]">
          {galleryPageContent.eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-bold text-[#14213d] md:text-5xl">
          {galleryPageContent.title}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-700">
          {galleryPageContent.description}
        </p>

        <div className="mt-7 flex flex-wrap gap-2">
          {galleryCategories.map((category) => {
            const isActive = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#14213d] text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-[#c9a227]"
                }`}
                aria-pressed={isActive}
              >
                {category}
              </button>
            );
          })}
        </div>

        {filteredItems.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            {galleryPageContent.placeholder}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <Image
                  src={item.image}
                  alt={item.alt}
                  width={800}
                  height={520}
                  loading="lazy"
                  className="aspect-[16/10] w-full object-cover"
                />
                <p className="p-3 text-sm font-medium text-[#14213d]">{item.title}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
