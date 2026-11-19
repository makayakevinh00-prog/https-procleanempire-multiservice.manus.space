"use client";

import Image from "next/image";
import { ReactNode, useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Fin trait de progression de lecture, sous l'en-tête. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return <motion.div aria-hidden style={{ scaleX }} className="fixed inset-x-0 top-16 z-40 h-[2px] origin-left bg-[#1d6fe0]" />;
}

/** Ligne de titre qui monte depuis un cache, au chargement. */
export function LineRise({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={`block overflow-hidden pb-[0.12em] ${className}`}>
      <motion.span className="block" initial={reduce ? false : { y: "110%" }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: EASE, delay }}>
        {children}
      </motion.span>
    </span>
  );
}

/** Apparition simple en fondu, au chargement. */
export function FadeIn({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}

/**
 * Photo plein cadre : elle se dévoile par un rideau, puis glisse légèrement au défilement.
 * Immobile et visible d'emblée si le système demande moins de mouvement.
 */
export function ParallaxPhoto({
  src,
  alt,
  priority,
  sizes,
  zoom,
  curtain,
  className = "",
  imageClassName = ""
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes: string;
  zoom?: boolean;
  /** Dévoile la photo de bas en haut quand elle entre à l'écran. */
  curtain?: boolean;
  className?: string;
  imageClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);
  const hidden = curtain && !reduce && !inView;
  return (
    <div ref={ref} className={`relative overflow-hidden bg-[#1e3a6e] ${className}`}>
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ clipPath: hidden ? "inset(100% 0% 0% 0%)" : "inset(0% 0% 0% 0%)" }}
        transition={{ duration: 1.3, ease: EASE }}
      >
        <motion.div style={reduce ? undefined : { y }} className="absolute inset-x-0 -inset-y-[7%]">
          <motion.div
            className="absolute inset-0"
            initial={false}
            animate={{ scale: (zoom || curtain) && !reduce && !inView ? 1.14 : 1 }}
            transition={{ duration: 2.2, ease: EASE }}
          >
            <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className={`object-cover ${imageClassName}`} />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Phrase en très grand : chaque mot s'éclaire à mesure que la page défile. */
export function Statement({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((word, index) => (
        <StatementWord key={`${word}-${index}`} progress={scrollYProgress} from={index / words.length} to={(index + 1) / words.length} still={Boolean(reduce)}>
          {word}
        </StatementWord>
      ))}
    </p>
  );
}

function StatementWord({ children, progress, from, to, still }: { children: string; progress: MotionValue<number>; from: number; to: number; still: boolean }) {
  const opacity = useTransform(progress, [from, to], [0.16, 1]);
  return (
    <motion.span style={still ? undefined : { opacity }} className="mr-[0.24em] inline-block">
      {children}
    </motion.span>
  );
}

/** Frise verticale : le trait se remplit à mesure que l'on avance dans la liste. */
export function TimelineRail({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.75", "end 0.6"] });
  return (
    <ol ref={ref} className={`relative ${className}`}>
      <span aria-hidden className="absolute bottom-0 left-0 top-0 w-px bg-slate-300" />
      <motion.span aria-hidden style={reduce ? undefined : { scaleY: scrollYProgress }} className="absolute bottom-0 left-0 top-0 w-px origin-top bg-[#1e3a6e]" />
      {children}
    </ol>
  );
}

/** Bande de mots géants qui glisse latéralement avec le défilement. */
export function ScrollBand({ children, reverse }: { children: ReactNode; reverse?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], reverse ? ["-22%", "0%"] : ["0%", "-22%"]);
  return (
    <div ref={ref} aria-hidden className="overflow-hidden">
      <motion.div style={reduce ? undefined : { x }} className="flex w-max whitespace-nowrap">
        {children}
      </motion.div>
    </div>
  );
}

export type GalleryPhoto = { src: string; alt: string; label: string };

/**
 * Galerie : sur grand écran, la page se fige et les photos défilent à l'horizontale
 * avec la molette. Sur mobile, au clavier ou en mouvement réduit : défilement natif.
 */
export function HorizontalGallery({ photos, intro }: { photos: GalleryPhoto[]; intro: ReactNode }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const reduce = useReducedMotion();
  const [distance, setDistance] = useState(0);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px) and (min-height: 640px)");
    const measure = () => {
      const active = media.matches && !reduce;
      setPinned(active);
      if (active && trackRef.current) {
        setDistance(Math.max(0, trackRef.current.scrollWidth - window.innerWidth));
      }
    };
    measure();
    media.addEventListener("change", measure);
    window.addEventListener("resize", measure);
    return () => {
      media.removeEventListener("change", measure);
      window.removeEventListener("resize", measure);
    };
  }, [reduce]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  const bar = useTransform(scrollYProgress, [0, 1], [0.08, 1]);

  const items = photos.map((photo, index) => (
    <li key={photo.src} className={pinned ? "w-[38vw] min-w-[460px] shrink-0" : "w-[84vw] shrink-0 snap-start sm:w-[520px]"}>
      <figure className={pinned && index % 2 === 1 ? "translate-y-10" : ""}>
        <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-[#dbe6fc]">
          <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1024px) 38vw, (min-width: 640px) 520px, 84vw" className="object-cover" />
        </div>
        <figcaption className="mt-4 flex items-baseline gap-3 text-base text-[#101828]">
          <span className="text-sm tabular-nums text-[#667085]">{String(index + 1).padStart(2, "0")}</span>
          {photo.label}
        </figcaption>
      </figure>
    </li>
  ));

  useEffect(() => {
    if (pinned && trackRef.current) {
      setDistance(Math.max(0, trackRef.current.scrollWidth - window.innerWidth));
    }
  }, [pinned]);

  return (
    <div ref={sectionRef} style={pinned ? { height: `calc(100svh + ${distance}px)` } : undefined}>
      {pinned ? (
        <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden">
          <motion.ul ref={trackRef} style={{ x }} aria-label="Photos de nos prestations" className="flex w-max items-center gap-6 pl-12 pr-[12vw]">
            <li className="w-[34vw] min-w-[420px] shrink-0 pr-10">{intro}</li>
            {items}
          </motion.ul>
          <div aria-hidden className="absolute bottom-8 left-12 right-12 h-px bg-[#1e3a6e]/20">
            <motion.div style={{ scaleX: bar }} className="h-px origin-left bg-[#1e3a6e]" />
          </div>
        </div>
      ) : (
        <div className="py-20 md:py-28">
          <div className="px-6 md:px-12">{intro}</div>
          <ul
            tabIndex={0}
            aria-label="Photos de nos prestations, à faire défiler"
            className="mt-12 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-6 px-6 pb-6 [scrollbar-width:thin] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1e3a6e] md:gap-4 md:scroll-px-12 md:px-12"
          >
            {items}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Chiffre qui défile jusqu'à sa valeur quand il entre à l'écran. */
export function CountUp({ to, decimals = 0, suffix = "" }: { to: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? to : 0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setValue(to);
      return;
    }
    const controls = animate(0, to, { duration: 1.2, ease: EASE, onUpdate: setValue });
    return () => controls.stop();
  }, [inView, reduce, to]);
  return (
    <span ref={ref} className="tabular-nums">
      {value.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}
