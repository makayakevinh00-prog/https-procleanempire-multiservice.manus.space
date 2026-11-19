import Image from "next/image";
import Link from "next/link";
import { teamPageContent } from "@/lib/content/phase2";
import { YoutubeVideoCard } from "@/components/ui/youtube-video-card";

export function TeamPremiumSection() {
  return (
    <section className="section pt-0">
      <div className="rounded-[28px] border border-[#dbe6fc] bg-white p-6 md:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#1d6fe0]">
          {teamPageContent.eyebrow}
        </p>
        <h1 className="mt-3 text-4xl lp-serif text-[#101828] md:text-5xl">{teamPageContent.title}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[#475467]">
          {teamPageContent.description}
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[24px] border border-[#dbe6fc] bg-[#f7f9fd] p-5">
            <h2 className="text-xl lp-serif text-[#101828]">{teamPageContent.founderBlock.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#475467]">
              {teamPageContent.founderBlock.text}
            </p>
            <div className="mt-4 mx-auto w-full max-w-[280px] overflow-hidden rounded-xl">
              <Image
                src={teamPageContent.founderBlock.photo}
                alt="Kevinh Makaya Mateve, fondateur de ProClean Empire"
                width={900}
                height={1600}
                sizes="(min-width: 768px) 33vw, 100vw"
                className="aspect-[3/4] w-full object-cover object-[50%_12%]"
              />
            </div>
          </article>
          <article className="rounded-[24px] border border-[#dbe6fc] bg-[#f7f9fd] p-5">
            <h2 className="text-xl lp-serif text-[#101828]">{teamPageContent.teamsBlock.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#475467]">
              {teamPageContent.teamsBlock.text}
            </p>
            <div className="mt-4 mx-auto w-full max-w-[280px] overflow-hidden rounded-xl">
              <YoutubeVideoCard
                youtubeUrl={teamPageContent.teamsBlock.youtubeUrl}
                title="Équipe terrain ProClean Empire"
                aspect="aspect-[9/16]"
              />
            </div>
          </article>
          <article className="rounded-[24px] border border-[#dbe6fc] bg-[#f7f9fd] p-5">
            <h2 className="text-xl lp-serif text-[#101828]">{teamPageContent.valuesBlock.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#475467]">
              {teamPageContent.valuesBlock.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <span className="text-[#1d6fe0]" aria-hidden>
                    ✓
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-[24px] border border-[#dbe6fc] bg-[#f7f9fd] p-5">
            <h2 className="text-xl lp-serif text-[#101828]">{teamPageContent.toolsBlock.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#475467]">{teamPageContent.toolsBlock.text}</p>
            <div className="mt-4 overflow-hidden rounded-xl">
              <Image
                src={teamPageContent.toolsBlock.photo}
                alt="Traitement d'un tapis avec le matériel professionnel ProClean Empire"
                width={1200}
                height={1600}
                sizes="(min-width: 768px) 33vw, 100vw"
                className="aspect-video w-full object-cover"
              />
            </div>
          </article>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/devis" className="btn-primary">
            Demander un devis
          </Link>
          <Link href="/contact" className="btn-secondary">
            Organiser une visite
          </Link>
        </div>
      </div>
    </section>
  );
}
