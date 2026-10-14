"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Reveal } from "@/components/home/reveal";
import { PartnersMarquee } from "@/components/phase1/partners-marquee";
import { ReviewsPremiumSection } from "@/components/phase1/reviews-premium-section";
import { siteConfig } from "@/lib/site";

/* ---------- 1. Hero plein écran ---------- */
function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.15]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 120]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[560px] overflow-hidden bg-ink text-white">
      <motion.div style={{ scale }} className="absolute inset-0">
        <video
          className="h-full w-full object-cover"
          src="/media/videos/proclean-demonstration-2.mp4"
          poster="/media/photos/hero-showcase.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/75" />

      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col items-center justify-center px-5 text-center md:px-8"
      >
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-white/80"
        >
          Pontoise · Val-d&apos;Oise · Île-de-France
        </motion.p>
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="display-xl max-w-5xl"
        >
          Le propre,
          <br />
          version premium.
        </motion.h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="mt-6 max-w-2xl text-lg text-white/85 md:text-xl"
        >
          Ménage Airbnb, bureaux &amp; commerces, conciergerie d&apos;entreprise et detailing auto
          &amp; avion. Une seule équipe, un seul niveau d&apos;exigence.
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-10 flex flex-col gap-3 sm:flex-row"
        >
          <Link href={siteConfig.bookingUrl} className="btn-pill">
            Prendre RDV
          </Link>
          <Link href="#menage-airbnb" className="btn-pill-ghost text-white">
            Découvrir nos services
          </Link>
        </motion.div>
      </motion.div>

      <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center" aria-hidden>
        <motion.span
          animate={reduce ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="block h-10 w-6 rounded-full border-2 border-white/60"
        >
          <span className="mx-auto mt-2 block h-2 w-1 rounded-full bg-white/80" />
        </motion.span>
      </div>
    </section>
  );
}

/* ---------- 2. Manifeste ---------- */
function Statement() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1100px] px-5 py-28 md:px-8 md:py-40">
        <Reveal>
          <p className="font-display text-3xl font-semibold leading-tight tracking-tight text-slate-400 sm:text-4xl md:text-5xl">
            <span className="text-ink">Logements, bureaux, véhicules.</span> Chaque espace mérite
            le même soin du détail.{" "}
            <span className="text-[#1d6fe0]">C&apos;est notre métier, depuis Pontoise.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- 3. Ménage Airbnb (mis en avant) ---------- */
function AirbnbFeature() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yA = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 60, reduce ? 0 : -60]);
  const yB = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 120, reduce ? 0 : -120]);

  const points = [
    "Pour les conciergeries et les propriétaires.",
    "Le jour de ménage, c'est vous qui le fixez.",
    "Passage entre 11h et 14h, entre le départ et l'arrivée.",
    "Chambres, cuisine et salle de bain prêtes pour chaque voyageur."
  ];

  return (
    <section id="menage-airbnb" ref={ref} className="scroll-mt-16 overflow-hidden bg-mist">
      <div className="mx-auto grid max-w-[1400px] items-center gap-16 px-5 py-28 md:px-8 md:py-36 lg:grid-cols-2">
        <div>
          <Reveal>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#1d6fe0]">
              Notre spécialité
            </p>
            <h2 className="display-lg text-ink">Ménage Airbnb.</h2>
            <p className="mt-6 max-w-xl text-xl leading-relaxed text-slate-600 md:text-2xl">
              Entre deux voyageurs, un logement qui donne envie de laisser cinq étoiles.
            </p>
          </Reveal>
          <ul className="mt-10 space-y-4">
            {points.map((point, index) => (
              <Reveal key={point} delay={0.08 * index} y={20}>
                <li className="flex items-start gap-3 text-lg text-ink">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1d6fe0]" aria-hidden />
                  {point}
                </li>
              </Reveal>
            ))}
          </ul>
          <Reveal delay={0.3}>
            <div className="mt-12 flex flex-col gap-3 sm:flex-row">
              <Link href="/devis" className="btn-pill">
                Demander un devis Airbnb
              </Link>
              <Link href={siteConfig.bookingUrl} className="btn-pill-ghost text-ink">
                Prendre RDV
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="relative grid h-[560px] grid-cols-2 gap-4 md:h-[680px]">
          <motion.div style={{ y: yA }} className="relative h-[85%] overflow-hidden rounded-[28px]">
            <Image
              src="/media/photos/airbnb-salon-table-basse.jpeg"
              alt="Salon d'un logement Airbnb nettoyé et préparé pour l'arrivée des voyageurs"
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover"
            />
          </motion.div>
          <motion.div style={{ y: yB }} className="flex flex-col gap-4 pt-16">
            <div className="relative h-1/2 overflow-hidden rounded-[28px]">
              <Image
                src="/media/photos/airbnb-entree-logement.jpeg"
                alt="Entrée lumineuse d'un appartement Airbnb après le ménage"
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="relative h-1/2 overflow-hidden rounded-[28px]">
              <Image
                src="/media/photos/canape-velours-apres.jpeg"
                alt="Canapé en velours propre dans un logement de location courte durée"
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 4. Univers de services ---------- */
function ServicesTiles() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1400px] px-5 py-28 md:px-8 md:py-36">
        <Reveal>
          <h2 className="display-lg max-w-3xl text-ink">Tous vos espaces. Une seule équipe.</h2>
        </Reveal>

        <div className="mt-16 grid gap-5 lg:grid-cols-2">
          <Reveal>
            <Link
              href="/nettoyage-bureaux"
              className="group relative block h-[520px] overflow-hidden rounded-[32px] bg-ink"
            >
              <Image
                src="/media/photos/hero-showcase.jpg"
                alt="Espace de bureaux haut de gamme entretenu par ProClean Empire"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover opacity-80 transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8 text-white md:p-10">
                <h3 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
                  Bureaux &amp; commerces.
                </h3>
                <p className="mt-3 max-w-md text-lg text-white/80">
                  Bureaux, boutiques, halls d&apos;immeuble et remises en état, planifiés selon vos
                  horaires.
                </p>
                <span className="mt-5 inline-block text-base font-semibold text-[#8db8ff]">
                  En savoir plus ›
                </span>
              </div>
            </Link>
          </Reveal>

          <Reveal delay={0.1}>
            <Link
              href="/nettoyage-automobile"
              className="group relative block h-[520px] overflow-hidden rounded-[32px] bg-ink"
            >
              <Image
                src="/media/photos/nettoyage-avion-cessna.jpeg"
                alt="Nettoyage extérieur d'un avion de tourisme par ProClean Empire"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8 text-white md:p-10">
                <h3 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
                  Auto &amp; avion.
                </h3>
                <p className="mt-3 max-w-md text-lg text-white/80">
                  Detailing intérieur et extérieur, de la citadine au cockpit.
                </p>
                <span className="mt-5 inline-block text-base font-semibold text-[#8db8ff]">
                  En savoir plus ›
                </span>
              </div>
            </Link>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div
            id="conciergerie-entreprise"
            className="mt-5 scroll-mt-24 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0b1f4d] via-[#123a8a] to-[#1d6fe0] p-8 text-white md:p-14"
          >
            <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
              <div>
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                  Sur mesure
                </p>
                <h3 className="display-lg">Conciergerie d&apos;entreprise.</h3>
                <p className="mt-5 max-w-xl text-lg text-white/80 md:text-xl">
                  Vos bureaux et commerces toujours prêts à recevoir : on s&apos;occupe des détails,
                  vous vous occupez de vos clients.
                </p>
              </div>
              <ul className="grid grid-cols-2 gap-3 text-base font-medium">
                {[
                  "Décoration des fêtes",
                  "Consommables & réassort",
                  "Plantes",
                  "Accueil & petits services"
                ].map((item) => (
                  <li key={item} className="rounded-2xl bg-white/10 px-4 py-5 backdrop-blur">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/contact"
              className="mt-10 inline-flex rounded-full bg-white px-6 py-3 font-semibold text-[#0b1f4d] transition hover:bg-white/90"
            >
              Parler de votre projet
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- 5. Galerie auto & avion (fond sombre) ---------- */
function DetailingStrip() {
  const shots = [
    { src: "/media/photos/cockpit-avion-detailing.jpeg", alt: "Detailing du cockpit d'un avion" },
    { src: "/media/photos/interieur-auto-apres.jpeg", alt: "Intérieur de voiture après detailing" },
    { src: "/media/photos/sieges-cuir-avion.jpeg", alt: "Sièges cuir d'avion nettoyés" },
    { src: "/media/photos/interieur-mercedes-apres.jpeg", alt: "Intérieur Mercedes après nettoyage" }
  ];
  return (
    <section className="bg-ink text-white">
      <div className="mx-auto max-w-[1400px] px-5 py-28 md:px-8 md:py-36">
        <Reveal>
          <h2 className="display-lg max-w-3xl">
            Le détail fait <span className="text-[#8db8ff]">toute la différence.</span>
          </h2>
        </Reveal>
        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
          {shots.map((shot, index) => (
            <Reveal key={shot.src} delay={0.08 * index}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-3xl">
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover transition duration-700 hover:scale-105"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 6. Appel final ---------- */
function FinalCta() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1100px] px-5 py-28 text-center md:px-8 md:py-40">
        <Reveal>
          <h2 className="display-xl text-ink">Parlons de vos espaces.</h2>
          <p className="mx-auto mt-6 max-w-xl text-xl text-slate-600">
            Devis rapide, intervention à Pontoise, dans le Val-d&apos;Oise et partout en
            Île-de-France.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={siteConfig.bookingUrl} className="btn-pill">
              Prendre RDV
            </Link>
            <a href={siteConfig.phoneHref} className="btn-pill-ghost text-ink">
              Appeler le {siteConfig.phone}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function ImmersiveHome() {
  return (
    <>
      <Hero />
      <Statement />
      <AirbnbFeature />
      <ServicesTiles />
      <DetailingStrip />
      <PartnersMarquee />
      <ReviewsPremiumSection />
      <FinalCta />
    </>
  );
}
