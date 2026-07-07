"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useMemo } from "react";
import { conversionHeroContent } from "@/lib/content/phase1";

function AnimatedValue({ value, fallback, suffix }: { value?: number; fallback: string; suffix?: string }) {
  const displayValue = useMemo(() => value ?? null, [value]);

  if (displayValue === null) {
    return <span>{fallback}</span>;
  }

  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {displayValue}
      </motion.span>
      {suffix ?? ""}
    </motion.span>
  );
}

export function HeroConversion({ onOpenVideo }: { onOpenVideo: () => void }) {
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : -90]);

  return (
    <section className="relative overflow-hidden">
      <motion.div
        aria-hidden
        style={{ y }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(201,162,39,0.18),_rgba(20,33,61,0.08)_36%,_transparent_65%)]"
      />
      <div className="section relative z-10 grid items-start gap-12 pb-8 lg:grid-cols-[1.1fr,0.9fr]">
        <div>
          <p className="mb-5 inline-flex rounded-full bg-[#14213d]/10 px-4 py-2 text-sm font-semibold text-[#14213d]">
            {conversionHeroContent.eyebrow}
          </p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-4xl font-bold leading-tight text-[#14213d] md:text-6xl"
          >
            {conversionHeroContent.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
            className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-700"
          >
            {conversionHeroContent.subtitle}
          </motion.p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={conversionHeroContent.ctaPrimary.href} className="btn-primary">
              {conversionHeroContent.ctaPrimary.label}
            </Link>
            <button type="button" className="btn-secondary" onClick={onOpenVideo}>
              {conversionHeroContent.ctaSecondary.label}
            </button>
          </div>
        </div>
        <div className="rounded-3xl border border-[#14213d]/15 bg-white p-6 shadow-soft">
          <div className="mb-5 overflow-hidden rounded-2xl">
            <img
              src="/media/photos/hero-showcase.jpg"
              alt="ProClean Empire : entretien haut de gamme bureaux, automobile et aéronautique"
              className="h-56 w-full object-cover md:h-64"
              loading="eager"
            />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Indicateurs de confiance
          </p>
          <div className="mt-4 grid gap-4">
            {conversionHeroContent.stats.map((stat, index) => (
              <motion.article
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-2xl font-bold text-[#14213d]">
                  <AnimatedValue value={stat.value} suffix={stat.suffix} fallback={stat.fallback} />
                </p>
                <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
