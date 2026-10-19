import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { Reveal } from "@/components/home/reveal";
import { QuoteForm } from "@/components/forms/quote-form";
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
};

/** Gabarit commun des pages services (style immersif, fin de page = devis contextualisé). */
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
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-white">
        <Image src={props.image.src} alt={props.image.alt} fill priority sizes="100vw" className="object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
        <div className="relative mx-auto max-w-[1200px] px-5 py-28 md:px-8 md:py-40">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/75">{props.eyebrow}</p>
          <h1 className="display-xl max-w-4xl">{props.title}</h1>
          <p className="mt-6 max-w-2xl text-lg text-white/85 md:text-xl">{props.lead}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a href="#devis" className="btn-pill">
              {props.ctaLabel}
            </a>
            <a href={siteConfig.bookingUrl} className="btn-pill-ghost text-white">
              Prendre RDV
            </a>
          </div>
          <p className="mt-5 text-sm text-white/70">Sans engagement · Pontoise, Val-d&apos;Oise et Île-de-France</p>
        </div>
      </section>

      {/* Points clés */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] gap-6 px-5 py-20 md:grid-cols-3 md:px-8 md:py-28">
          {props.intro.map((item, index) => (
            <Reveal key={item.title} delay={0.06 * index} y={20}>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">{item.title}</h2>
              <p className="mt-3 text-slate-600">{item.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Contenu détaillé */}
      {props.blocks.map((block, blockIndex) => (
        <section key={block.heading} className={blockIndex % 2 === 0 ? "bg-mist" : "bg-white"}>
          <div className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 md:py-28">
            <Reveal>
              <h2 className="display-lg max-w-3xl text-ink">{block.heading}</h2>
            </Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {block.items.map((item, index) => (
                <Reveal key={item.title} delay={0.05 * index} y={20}>
                  <article className="h-full rounded-[24px] bg-white p-6 shadow-soft">
                    <h3 className="font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ))}

      {props.aside}

      {/* Comment ça se passe */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 md:py-28">
          <Reveal>
            <h2 className="display-lg">Comment ça se passe ?</h2>
          </Reveal>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {props.steps.map((step, index) => (
              <Reveal as="li" className="rounded-[24px] bg-white/5 p-7" key={step.title} delay={0.08 * index} y={20}>
                  <span className="font-display text-5xl font-semibold text-[#8db8ff]">{index + 1}</span>
                  <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-white/70">{step.text}</p>
                </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[900px] px-5 py-20 md:px-8 md:py-28">
          <Reveal>
            <h2 className="display-lg text-ink">Questions fréquentes</h2>
          </Reveal>
          <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
            {faq.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-ink">
                  {item.question}
                  <span aria-hidden className="text-2xl text-[#1d6fe0] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Devis contextualisé */}
      <section id="devis" className="scroll-mt-16 bg-mist">
        <div className="mx-auto max-w-[1000px] px-5 py-20 md:px-8 md:py-28">
          <Reveal>
            <h2 className="display-lg text-ink">{props.ctaLabel}</h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">
              {siteConfig.promise} Vous préférez en parler ?{" "}
              <a href={siteConfig.bookingUrl} className="font-semibold text-[#1d6fe0]">
                Réservez un appel de 20 min
              </a>{" "}
              ou appelez le{" "}
              <a href={siteConfig.phoneHref} className="font-semibold text-[#1d6fe0]">
                {siteConfig.phone}
              </a>
              .
            </p>
          </Reveal>
          <div className="mt-10">
            <QuoteForm defaultService={props.serviceId} />
          </div>
          <p className="mt-6 text-center text-sm text-slate-600">
            <Link href="/contact" className="underline">
              Autre besoin ? Toutes les façons de nous contacter
            </Link>
          </p>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(props.schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  );
}
