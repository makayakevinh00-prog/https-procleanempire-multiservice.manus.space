"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";

/** Photo plein cadre qui glisse légèrement au défilement (immobile si le système demande moins de mouvement). */
export function ParallaxPhoto({ src, alt, priority, sizes, zoom, className = "" }: { src: string; alt: string; priority?: boolean; sizes: string; zoom?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);
  return (
    <div ref={ref} className={`relative overflow-hidden bg-[#0b1326] ${className}`}>
      <motion.div style={reduce ? undefined : { y }} className="absolute inset-x-0 -inset-y-[7%]">
        <motion.div className="absolute inset-0" initial={zoom && !reduce ? { scale: 1.12 } : false} animate={{ scale: 1 }} transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}>
          <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover" />
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Phrase en très grand : chaque mot s'éclaire à mesure que la page défile. */
export function Statement({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className="max-w-6xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-6xl xl:text-7xl">
      {words.map((word, index) => (
        <StatementWord key={`${word}-${index}`} progress={scrollYProgress} from={index / words.length} to={(index + 1) / words.length} still={Boolean(reduce)}>
          {word}
        </StatementWord>
      ))}
    </p>
  );
}

function StatementWord({ children, progress, from, to, still }: { children: string; progress: MotionValue<number>; from: number; to: number; still: boolean }) {
  const opacity = useTransform(progress, [from, to], [0.18, 1]);
  return (
    <motion.span style={still ? undefined : { opacity }} className="mr-[0.25em] inline-block">
      {children}
    </motion.span>
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
    const controls = animate(0, to, { duration: 1.2, ease: [0.16, 1, 0.3, 1], onUpdate: setValue });
    return () => controls.stop();
  }, [inView, reduce, to]);
  return (
    <span ref={ref} className="tabular-nums">
      {value.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}
