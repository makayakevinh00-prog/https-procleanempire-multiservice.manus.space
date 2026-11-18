import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { Reveal } from "@/components/home/reveal";
import { QuoteForm } from "@/components/forms/quote-form";
import { PartnersMarquee } from "@/components/phase1/partners-marquee";
import { ChecklistCard, PlanningCard } from "@/components/landing/visuals";
import { siteConfig } from "@/lib/site";

const EYEBROW = "text-sm font-semibold uppercase tracking-wider text-[#1559bd]";
const H2 =
  "font-display text-3xl font-semibold tracking-tight text-ink [text-wrap:balance] sm:text-4xl md:text-5xl";

function Tick() {
  return (
    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1d6fe0]/10 text-[#1559bd]">
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

function Offer({
  eyebrow,
  title,
  text,
  points,
  href,
  linkLabel,
  visual,
  flip,
}: {
  eyebrow: string;
  title: string;
  text: string;
  points: string[];
  href: string;
  linkLabel: string;
  visual: ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
      <Reveal className={flip ? "lg:order-2" : ""}>
        <p className={EYEBROW}>{eyebrow}</p>
        <h3 className={`mt-3 ${H2}`}>{title}</h3>
        <p className="mt-4 text-lg leading-relaxed text-slate-700">{text}</p>
        <ul className="mt-6 space-y-3">
          {points.map((point) => (
            <li
              key={point}
              className="flex items-start gap-3 text-base leading-relaxed text-slate-800"
            >
              <Tick />
              {point}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <a href="#devis" className="btn-pill min-h-12">
            Demander mon devis
          </a>
          <Link
            href={href}
            className="inline-flex min-h-11 items-center font-semibold text-[#1559bd] underline-offset-4 hover:underline"
          >
            {linkLabel} ›
          </Link>
        </div>
      </Reveal>
      <Reveal delay={0.12}>{visual}</Reveal>
    </div>
  );
}

const steps = [
  {
    title: "Vous décrivez le lieu",
    text: "Type de logement ou de locaux, surface, fréquence : deux minutes avec le formulaire.",
  },
  {
    title: "Nous confirmons le prix",
    text: "Un devis clair sous 24 h, avant toute intervention.",
  },
  {
    title: "Nous intervenons",
    text: "Aux dates et aux horaires convenus, avec un contrôle du résultat avant de partir.",
  },
];

const others = [
  { label: "Remise en état", href: "/remise-en-etat" },
  { label: "Après chantier", href: "/apres-chantier" },
  { label: "Vitrerie", href: "/nettoyage-vitrerie" },
  { label: "Restaurants", href: "/nettoyage-restaurants" },
  { label: "Hôtels", href: "/nettoyage-hotels" },
  { label: "Conciergerie d'entreprise", href: "/conciergerie-entreprise" },
];

const zones = [
  { label: "Pontoise", href: "/nettoyage-pontoise" },
  { label: "Cergy", href: "/nettoyage-cergy" },
  { label: "Paris", href: "/nettoyage-paris" },
  { label: "Paris 16e", href: "/entreprise-de-nettoyage-paris-16" },
  { label: "Saint-Ouen", href: "/nettoyage-saint-ouen" },
  {
    label: "Seine-Saint-Denis",
    href: "/entreprise-de-nettoyage-seine-saint-denis",
  },
];

const faq = [
  {
    q: "Intervenez-vous le week-end et les jours fériés ?",
    a: "Oui. Pour un logement Airbnb, le ménage suit vos réservations, quel que soit le jour. Pour des locaux, nous calons les passages tôt le matin, en soirée ou le week-end.",
  },
  {
    q: "Fournissez-vous les produits et le matériel ?",
    a: "Oui, nous venons avec nos produits et notre matériel professionnels.",
  },
  {
    q: "Comment se passe la remise des clés ?",
    a: "Boîte à clés, digicode ou remise en main propre : nous nous adaptons à votre organisation.",
  },
  { q: "Sous quel délai répondez-vous ?", a: siteConfig.promise },
];

/** Page d'atterrissage clients : ménage Airbnb, bureaux et commerces, puis devis. */
export function ClientLanding() {
  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[#0b1326] text-white">
        <Image
          src="/media/photos/hero-showcase.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover opacity-25"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,#0b1326_35%,rgba(11,19,38,0.75)_70%,rgba(11,19,38,0.55))]"
        />
        <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-6 pb-20 pt-14 md:px-8 md:pb-28 md:pt-24 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <a
              href={siteConfig.googleReviewsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-medium text-slate-100 transition-colors duration-200 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 text-amber-300"
                fill="currentColor"
                aria-hidden
              >
                <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1 1.2-6.6L2.5 9.5l6.6-.9L12 2.5z" />
              </svg>
              {siteConfig.googleRating.value}/5 sur Google ·{" "}
              {siteConfig.googleRating.count} avis
            </a>
            <h1 className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.03] tracking-tight [text-wrap:balance] sm:text-6xl lg:text-7xl">
              Un lieu impeccable,{" "}
              <span className="text-[#8db8ff]">sans y penser.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-200 sm:text-xl">
              Ménage Airbnb, nettoyage de bureaux et de commerces dans le
              Val-d&apos;Oise et à Paris. Un interlocuteur unique, un devis sous
              24 h.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#devis" className="btn-pill min-h-14 px-8 text-lg">
                Demander mon devis
              </a>
              <a
                href={siteConfig.phoneHref}
                className="btn-pill-ghost min-h-14 px-8"
              >
                Appeler le {siteConfig.phone}
              </a>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-200">
              {[
                "Devis sous 24 h",
                "Demandes reçues 7j/7",
                "Produits et matériel fournis",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <ChecklistCard />
        </div>
      </section>

      <PartnersMarquee />

      {/* OFFRES */}
      <section
        className="section space-y-24 md:space-y-32"
        aria-label="Nos prestations"
      >
        <Offer
          eyebrow="Ménage Airbnb"
          title="Un logement prêt pour chaque voyageur."
          text="Pour les propriétaires et les conciergeries : nous préparons le logement entre un départ et une arrivée, avec la même exigence à chaque passage."
          points={[
            "Le jour, c'est vous qui le fixez : votre calendrier de réservations fait foi.",
            "Passage entre 11h et 14h, entre deux voyageurs.",
            "Linge de lit et serviettes en option.",
            "Vous êtes prévenu au moindre imprévu dans le logement.",
          ]}
          href="/menage-airbnb"
          linkLabel="Tout sur le ménage Airbnb"
          visual={<ChecklistCard tone="light" />}
        />
        <Offer
          flip
          eyebrow="Bureaux et commerces"
          title="Vos locaux propres avant l'arrivée des équipes."
          text="Entretien régulier ou passage ponctuel : nous intervenons en dehors de vos heures d'ouverture pour ne déranger ni vos équipes ni vos clients."
          points={[
            "Fréquence à la carte : quotidien, plusieurs fois par semaine, hebdomadaire ou ponctuel.",
            "Tôt le matin, en soirée ou le week-end.",
            "Sanitaires, sols, surfaces, et vitrerie si vous le souhaitez.",
            "Un seul interlocuteur pour tous vos sites.",
          ]}
          href="/nettoyage-bureaux"
          linkLabel="Tout sur le nettoyage de bureaux"
          visual={<PlanningCard />}
        />
        <Reveal className="rounded-3xl bg-mist p-6 sm:p-10">
          <p className={EYEBROW}>Et aussi</p>
          <ul className="mt-5 flex flex-wrap gap-3">
            {others.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-base font-semibold text-ink transition-colors duration-200 hover:border-[#1d6fe0] hover:text-[#1559bd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fe0]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* ÉTAPES */}
      <section className="bg-[#0b1326] text-white" aria-labelledby="lp-etapes">
        <div className="section">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#8db8ff]">
              Comment ça marche
            </p>
            <h2
              id="lp-etapes"
              className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight [text-wrap:balance] sm:text-4xl md:text-5xl"
            >
              Trois étapes, et vous n&apos;y pensez plus.
            </h2>
          </Reveal>
          <ol className="relative mt-12 grid gap-8 lg:grid-cols-3 lg:gap-6">
            <span
              aria-hidden
              className="absolute left-6 top-6 h-[calc(100%-3rem)] w-px bg-white/15 lg:left-[16.6%] lg:h-px lg:w-2/3"
            />
            {steps.map((step, index) => (
              <Reveal
                as="li"
                key={step.title}
                delay={index * 0.1}
                y={24}
                className="relative flex gap-5 lg:block lg:text-center"
              >
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1d6fe0] font-display text-lg font-semibold tabular-nums ring-8 ring-[#0b1326] lg:mx-auto">
                  {index + 1}
                </span>
                <div className="lg:mt-6">
                  <h3 className="font-display text-xl font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-slate-300">
                    {step.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* AVIS + ZONES */}
      <section
        className="section grid gap-6 lg:grid-cols-2"
        aria-label="Avis et zones d'intervention"
      >
        <Reveal className="flex flex-col justify-between rounded-3xl border border-slate-200 p-8 sm:p-10">
          <div>
            <p className={EYEBROW}>Avis clients</p>
            <p className="mt-4 font-display text-7xl font-semibold tracking-tight text-ink">
              {siteConfig.googleRating.value}
              <span className="text-3xl text-slate-500">/5</span>
            </p>
            <div
              className="mt-3 flex gap-1 text-amber-400"
              role="img"
              aria-label={`Note de ${siteConfig.googleRating.value} sur 5`}
            >
              {[0, 1, 2, 3, 4].map((star) => (
                <svg
                  key={star}
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1 1.2-6.6L2.5 9.5l6.6-.9L12 2.5z" />
                </svg>
              ))}
            </div>
            <p className="mt-4 text-lg text-slate-700">
              Sur {siteConfig.googleRating.count} avis Google.
            </p>
          </div>
          <a
            href={siteConfig.googleReviewsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex min-h-11 items-center font-semibold text-[#1559bd] underline-offset-4 hover:underline"
          >
            Lire les avis sur Google ›
          </a>
        </Reveal>
        <Reveal delay={0.1} className="rounded-3xl bg-mist p-8 sm:p-10">
          <p className={EYEBROW}>Où nous intervenons</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink [text-wrap:balance]">
            Depuis Pontoise, dans le Val-d&apos;Oise et à Paris.
          </h2>
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {zones.map((zone) => (
              <li key={zone.href}>
                <Link
                  href={zone.href}
                  className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-base font-semibold text-ink shadow-sm transition-colors duration-200 hover:text-[#1559bd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fe0]"
                >
                  {zone.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/zones-intervention"
            className="mt-6 inline-flex min-h-11 items-center font-semibold text-[#1559bd] underline-offset-4 hover:underline"
          >
            Voir toutes les zones ›
          </Link>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="bg-mist" aria-labelledby="lp-faq">
        <div className="section max-w-3xl">
          <h2 id="lp-faq" className={H2}>
            Questions fréquentes
          </h2>
          <div className="mt-8 divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white">
            {faq.map((item) => (
              <details key={item.q} className="group px-6">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </summary>
                <p className="pb-5 text-base leading-relaxed text-slate-700">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* DEVIS */}
      <section id="devis" className="scroll-mt-16" aria-labelledby="lp-devis">
        <div className="mx-auto max-w-[1000px] px-5 py-20 md:px-8 md:py-28">
          <Reveal>
            <p className={EYEBROW}>Devis gratuit</p>
            <h2 id="lp-devis" className={`mt-3 ${H2}`}>
              Parlons de vos espaces.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-700">
              Quelques informations suffisent. {siteConfig.promise}
            </p>
          </Reveal>
          <div className="mt-10">
            <QuoteForm />
          </div>
        </div>
      </section>
    </div>
  );
}
