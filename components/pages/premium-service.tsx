import "@/components/landing/landing.css";
import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { Reveal } from "@/components/home/reveal";
import { QuoteForm } from "@/components/forms/quote-form";
import { FadeIn, ParallaxPhoto, ScrollProgress } from "@/components/landing/motion";
import { Cta, FOCUS, H2, LABEL, LINK, NAVY, PAPER, SOFT } from "@/components/landing/ui";
import { siteConfig } from "@/lib/site";

export type PremiumServiceProps = {
  eyebrow: string;
  title: string;
  lead: string;
  image: { src: string; alt: string };
  serviceId: string;
  ctaLabel: string;
  intro: { title: string; text: string }[];
  blocks: { heading: string; items: { title: string; text: string }[] }[];
  steps: { title: string; text: string }[];
  faq: { question: string; answer: string }[];
  schema: Record<string, unknown>;
  aside?: ReactNode;
  /** Photos de réalisations, affichées en grille après les points clés. */
  photos?: { src: string; alt: string }[];
};

/** Gabarit commun des pages services : même direction éditoriale que l'accueil, fin de page = devis contextualisé. */
export function PremiumService(props: PremiumServiceProps) {
  const faq = [...props.faq, { question: "Sous quel délai répondez-vous ?", answer: siteConfig.promise }];
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer }
    }))
  };

  return (
    <div className="bg-white text-ink">
      <ScrollProgress />

      {/* Ouverture */}
      <section className={`lp-grain ${NAVY} overflow-hidden text-[#101828]`}>
        <div className="mx-auto grid max-w-[1680px] grid-cols-[minmax(0,1fr)] lg:min-h-[calc(100svh-4rem)] lg:grid-cols-12">
          <div className="flex flex-col justify-between gap-12 px-6 pb-10 pt-10 md:px-12 lg:col-span-7 lg:pb-12 lg:pt-12">
            <FadeIn className={`${LABEL} text-[#667085]`}>{props.eyebrow}</FadeIn>
            <FadeIn delay={0.15}>
              <h1 className="lp-serif text-[2.6rem] leading-[1.02] [text-wrap:balance] sm:text-6xl xl:text-[4.75rem]">{props.title}</h1>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-[#475467] sm:text-xl">{props.lead}</p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                <Cta href="#devis">{props.ctaLabel}</Cta>
                <Link href={siteConfig.bookingUrl} className={`${LINK} self-start text-[#101828] focus-visible:outline-[#1e3a6e] sm:self-auto`}>
                  Prendre rendez-vous
                </Link>
              </div>
            </FadeIn>
            <FadeIn delay={0.5} className="border-t border-[#101828]/15 pt-6 text-sm text-[#475467]">
              Sans engagement · Pontoise, Val-d&apos;Oise et Île-de-France
            </FadeIn>
          </div>
          <div className="relative lg:col-span-5 lg:col-start-8">
            <ParallaxPhoto src={props.image.src} alt={props.image.alt} priority curtain sizes="(min-width: 1024px) 42vw, 100vw" className="aspect-[3/2] w-full lg:aspect-auto lg:h-full" />
          </div>
        </div>
      </section>

      {/* Points clés */}
      <section className={PAPER}>
        <div className="mx-auto grid max-w-[1680px] gap-10 px-6 py-20 md:grid-cols-3 md:gap-0 md:px-12 md:py-28">
          {props.intro.map((item, index) => (
            <Reveal key={item.title} delay={0.08 * index} y={20} className="border-t border-ink/80 pt-6 md:border-l md:border-t-0 md:border-ink/20 md:px-10 md:pt-0 md:first:border-l-0 md:first:pl-0">
              <span className="lp-serif block text-3xl text-slate-500" aria-hidden>
                <em>{String(index + 1).padStart(2, "0")}</em>
              </span>
              <h2 className="lp-serif mt-5 text-3xl leading-tight text-ink sm:text-4xl">{item.title}</h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-700">{item.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {props.photos?.length ? (
        <section className="bg-white">
          <div className="mx-auto max-w-[1680px] px-6 pt-20 md:px-12 md:pt-28">
            <p className={`${LABEL} text-slate-600`}>En images</p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {props.photos.map((photo, index) => (
                <Reveal as="li" key={photo.src} y={20} delay={0.05 * (index % 3)}>
                  <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-[#dbe6fc]">
                    <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 100vw" className="object-cover" />
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Contenu détaillé */}
      {props.blocks.map((block, blockIndex) => (
        <section key={block.heading} className={blockIndex % 2 === 0 ? "bg-white" : PAPER}>
          <div className="mx-auto grid max-w-[1680px] gap-12 px-6 py-24 md:px-12 md:py-36 lg:grid-cols-12 lg:gap-10">
            <Reveal className="lg:col-span-5">
              <div className="lg:sticky lg:top-32">
                <p className={`${LABEL} text-slate-600`}>
                  <span className="lp-serif text-2xl normal-case tracking-normal">
                    <em>N° {String(blockIndex + 1).padStart(2, "0")}</em>
                  </span>
                </p>
                <h2 className={`${H2} mt-6`}>{block.heading}</h2>
              </div>
            </Reveal>
            <ul className="lg:col-span-6 lg:col-start-7">
              {block.items.map((item) => (
                <Reveal as="li" key={item.title} y={20} className="border-t border-ink/25 py-7">
                  <h3 className="text-2xl font-semibold tracking-tight text-ink">{item.title}</h3>
                  <p className="mt-2 text-lg leading-relaxed text-slate-700">{item.text}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      ))}

      {props.aside}

      {/* Comment ça se passe */}
      <section className={`lp-grain ${NAVY} text-[#101828]`}>
        <div className="mx-auto max-w-[1680px] px-6 py-24 md:px-12 md:py-36">
          <Reveal>
            <h2 className={H2}>
              Comment <em>ça se passe ?</em>
            </h2>
          </Reveal>
          <ol className="mt-16 grid gap-12 lg:mt-24 lg:grid-cols-3 lg:gap-0">
            {props.steps.map((step, index) => (
              <Reveal as="li" key={step.title} delay={0.1 * index} y={24} className="border-t border-[#101828]/15 pt-6 lg:border-l lg:border-t-0 lg:border-[#101828]/15 lg:px-10 lg:pt-0 lg:first:border-l-0 lg:first:pl-0">
                <span className="lp-serif block text-8xl text-[#1d6fe0] xl:text-9xl" aria-hidden>
                  <em>{index + 1}</em>
                </span>
                <h3 className="mt-8 text-2xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-3 text-lg leading-relaxed text-[#475467]">{step.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Questions */}
      <section>
        <div className="mx-auto grid max-w-[1680px] gap-12 px-6 py-24 md:px-12 md:py-36 lg:grid-cols-12 lg:gap-10">
          <h2 className={`${H2} lg:col-span-5`}>
            Questions <em>fréquentes</em>
          </h2>
          <div className="border-b border-ink/25 lg:col-span-6 lg:col-start-7">
            {faq.map((item) => (
              <details key={item.question} className="group border-t border-ink/25">
                <summary className={`flex min-h-20 cursor-pointer list-none items-center justify-between gap-6 py-6 text-xl font-semibold tracking-tight text-ink sm:text-2xl [&::-webkit-details-marker]:hidden ${FOCUS} focus-visible:outline-[#1d6fe0]`}>
                  {item.question}
                  <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-ink transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </summary>
                <p className="max-w-2xl pb-8 text-lg leading-relaxed text-slate-700">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Devis contextualisé */}
      <section id="devis" className="scroll-mt-16">
        <div className={`lp-grain ${SOFT} text-[#101828]`}>
          <div className="mx-auto max-w-[1680px] px-6 py-24 md:px-12 md:py-36">
            <Reveal>
              <p className={`${LABEL} text-[#667085]`}>Devis gratuit</p>
              <h2 className="lp-serif mt-8 max-w-5xl text-[2.9rem] leading-[0.98] [text-wrap:balance] sm:text-7xl xl:text-8xl">{props.ctaLabel}</h2>
              <p className="mt-10 max-w-2xl text-lg leading-relaxed text-[#475467] sm:text-xl">
                {siteConfig.promise} Vous préférez en parler ?{" "}
                <a href={siteConfig.bookingUrl} className="font-semibold text-[#101828] underline underline-offset-4">
                  Réservez un échange de 20 min
                </a>
                .
              </p>
            </Reveal>
          </div>
        </div>
        <div className="mx-auto max-w-[1000px] px-5 py-16 md:px-8 md:py-24">
          <QuoteForm defaultService={props.serviceId} />
          <p className="mt-8 text-center text-sm text-slate-600">
            <Link href="/contact" className="underline underline-offset-4">
              Autre besoin ? Toutes les façons de nous contacter
            </Link>
          </p>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(props.schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </div>
  );
}
