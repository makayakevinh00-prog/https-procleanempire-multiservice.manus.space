"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * Récit de défilement 3D : un grand titre, un objet 3D réaliste qui change à chaque étape
 * (le visuel flotte, tourne légèrement et se transforme en défilant), des étiquettes flottantes.
 * Visuels générés pour ProClean Empire ; composition inspirée des « scroll stories » produit.
 */
type Stage = { bg: string; n: string; title: string[]; text: string; cta?: { label: string; href: string }; src: string; alt: string; chips: string[] };

const STAGES: Stage[] = [
  {
    bg: "#dfd3c1", n: "",
    title: ["Le propre,", "version premium."],
    text: "Bureaux, commerces, ménage Airbnb : une équipe dédiée, des produits professionnels, un résultat que l'on voit.",
    src: "/media/3d/spray.webp", alt: "Flacon spray ProClean en pleine pulvérisation", chips: ["Produits pro", "Sans résidu"]
  },
  {
    bg: "#e5dac8", n: "1.",
    title: ["Chaque détail", "compte."],
    text: "Surfaces, sols, vitres : un passage méthodique, contrôlé point par point avant notre départ.",
    cta: { label: "Nos prestations", href: "/services" },
    src: "/media/3d/cloth.webp", alt: "Microfibre glissant sur une surface brillante", chips: ["Check-list", "Contrôle qualité"]
  },
  {
    bg: "#ead6bb", n: "2.",
    title: ["Prêt pour", "le prochain voyageur."],
    text: "Linge frais, lits faits, logement impeccable entre deux séjours, à l'heure que vous fixez.",
    cta: { label: "Ménage Airbnb", href: "/menage-airbnb" },
    src: "/media/3d/linen.webp", alt: "Linge blanc plié noué d'un ruban bleu nuit", chips: ["Linge fourni", "11 h – 14 h"]
  },
  {
    bg: "#ece2d1", n: "3.",
    title: ["Cinq étoiles,", "sans y penser."],
    text: "Vitres éclatantes, finitions soignées : vos clients et vos voyageurs le remarquent, et vous le disent.",
    cta: { label: "Demander un devis", href: "/devis" },
    src: "/media/3d/glass.webp", alt: "Vitre éclatante surmontée de cinq étoiles", chips: ["Devis sous 24 h", "Sans engagement"]
  }
];

export function Scroll3DStory() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.6 });
  useMotionValueEvent(scrollYProgress, "change", (v) => setIdx(Math.min(STAGES.length - 1, Math.floor(v * STAGES.length))));

  // Dérive continue de l'objet pendant tout le défilement (profondeur, rotation douce).
  const rot = useTransform(p, [0, 1], reduce ? [0, 0] : [-6, 10]);
  const driftY = useTransform(p, [0, 1], reduce ? [0, 0] : [40, -40]);
  const stage = STAGES[idx];

  return (
    <div ref={ref} style={{ height: `${STAGES.length * 100}vh` }} className="relative">
      <motion.div className="sticky top-0 h-[100svh] overflow-hidden" initial={false} animate={{ backgroundColor: stage.bg }} transition={{ duration: 0.8 }}>
        {/* progression */}
        <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 pt-24 md:px-12 md:pt-28">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#14213d]/50">ProClean Empire</span>
          <div className="flex gap-2" aria-hidden>
            {STAGES.map((_, i) => (
              <motion.span key={i} className="block h-[3px] rounded-full bg-[#14213d]" animate={{ width: i === idx ? 28 : 8, opacity: i === idx ? 1 : 0.2 }} transition={{ duration: 0.4 }} />
            ))}
          </div>
        </div>

        {/* titre (derrière l'objet) */}
        <div className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-end px-6 pb-28 sm:justify-center sm:pb-0 md:px-12">
          <AnimatePresence mode="wait">
            <motion.div key={idx} initial={reduce ? false : { opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -24 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="max-w-[680px]">
              {stage.n && <p className="mb-3 font-[ui-serif,'New_York','Iowan_Old_Style',Georgia,serif] text-3xl text-[#14213d]/70">{stage.n}</p>}
              <h2 className="font-[ui-serif,'New_York','Iowan_Old_Style',Georgia,serif] text-[clamp(2.6rem,8vw,6.2rem)] font-medium uppercase leading-[0.95] tracking-tight text-[#14213d]">
                {stage.title.map((l) => <span key={l} className="block">{l}</span>)}
              </h2>
              <p className="mt-6 max-w-md text-[17px] leading-relaxed text-[#14213d]/70">{stage.text}</p>
              {stage.cta && (
                <Link href={stage.cta.href} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#14213d] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#1d2f55]">
                  {stage.cta.label} <span aria-hidden>→</span>
                </Link>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* objet 3D (devant le titre) */}
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute left-1/2 top-[12%] h-[35vh] w-[35vh] -translate-x-1/2 sm:left-auto sm:right-[2%] sm:top-[8%] sm:h-[78vh] sm:w-[78vh] sm:translate-x-0 lg:right-[6%]">
            <motion.div style={{ y: driftY, rotate: rot }} className="absolute inset-0">
              <AnimatePresence mode="popLayout">
                <motion.div key={idx} className="absolute inset-0" initial={reduce ? false : { opacity: 0, scale: 0.82, rotate: -8, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }} exit={reduce ? undefined : { opacity: 0, scale: 1.12, rotate: 6, filter: "blur(10px)" }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                  <Image src={stage.src} alt={stage.alt} fill sizes="(min-width: 640px) 78vh, 35vh" priority={idx === 0} className="object-contain" style={{ WebkitMaskImage: "radial-gradient(closest-side, #000 74%, transparent 100%)", maskImage: "radial-gradient(closest-side, #000 74%, transparent 100%)" }} />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* étiquettes flottantes */}
          <AnimatePresence mode="wait">
            <motion.div key={idx} className="hidden sm:block" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
              {stage.chips.map((c, i) => (
                <motion.span key={c} initial={reduce ? false : { opacity: 0, y: 14, rotate: i ? 7 : -9 }} animate={{ opacity: 1, y: 0, rotate: i ? 6 : -8 }} transition={{ delay: 0.35 + i * 0.15, type: "spring", stiffness: 160, damping: 16 }}
                  className="absolute rounded-md bg-white/95 px-3.5 py-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#14213d] shadow-[0_8px_24px_-8px_rgba(20,33,61,0.35)]"
                  style={{ right: i ? "6%" : "31%", top: i ? "64%" : "24%" }}>{c}</motion.span>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
