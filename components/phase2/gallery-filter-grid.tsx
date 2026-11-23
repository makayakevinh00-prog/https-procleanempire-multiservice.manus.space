"use client";

import Image from "next/image";

import { useMemo, useState } from "react";
import {
  galleryCategories,
  galleryItems,
  galleryPageContent,
  type GalleryCategory
} from "@/lib/content/phase2";

export function GalleryFilterGrid() {
  const availableCategories = useMemo(
    () => galleryCategories.filter((category) => galleryItems.some((item) => item.category === category)),
    []
  );
  const [activeCategory, setActiveCategory] = useState<GalleryCategory>(availableCategories[0]);

  const filteredItems = useMemo(
    () => galleryItems.filter((item) => item.category === activeCategory),
    [activeCategory]
  );

  return (
    <section className="section pt-0">
      <div className="rounded-[28px] border border-[#dbe6fc] bg-white p-6 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#1d6fe0]">
          {galleryPageContent.eyebrow}
        </p>
        <h2 className="mt-3 text-4xl lp-serif text-[#101828] md:text-5xl">
          {galleryPageContent.title}
        </h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[#475467]">
          {galleryPageContent.description}
        </p>

        <div className="mt-7 flex flex-wrap gap-2">
          {availableCategories.map((category) => {
            const isActive = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#1e3a6e] text-white"
                    : "border border-[#c9d8f5] bg-white text-[#475467] hover:border-[#1d6fe0]"
                }`}
                aria-pressed={isActive}
              >
                {category}
              </button>
            );
          })}
        </div>

        {filteredItems.length === 0 ? null : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-[24px] border border-[#dbe6fc] bg-white">
                <Image
                  src={item.image}
                  alt={item.alt}
                  width={800}
                  height={520}
                  loading="lazy"
                  className="aspect-[16/10] w-full object-cover"
                />
                <p className="p-3 text-sm font-medium text-[#101828]">{item.title}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
