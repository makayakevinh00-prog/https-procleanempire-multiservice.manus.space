import Image from "next/image";
import Link from "next/link";
import { caseStudies, caseStudiesPageContent } from "@/lib/content/phase2";

function CaseStudyVisual({ title, type }: { title: string; type: "Avant" | "Apres" }) {
  return (
    <div className="flex aspect-[16/10] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 p-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
      {type} - PHOTO A INSERER
      <br />
      {title}
    </div>
  );
}

export function CaseStudyList() {
  const hasCaseStudies = caseStudies.length > 0;

  return (
    <section className="section pt-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#c9a227]">
          {caseStudiesPageContent.eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-bold text-[#14213d] md:text-5xl">
          {caseStudiesPageContent.title}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-700">
          {caseStudiesPageContent.description}
        </p>
        {!hasCaseStudies ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            {caseStudiesPageContent.placeholder}
          </div>
        ) : null}
      </div>

      <div className="mt-8 space-y-8">
        {hasCaseStudies
          ? caseStudies.map((item) => (
              <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold text-[#14213d]">{item.title}</h2>
                  <p className="rounded-full bg-[#14213d]/10 px-3 py-1 text-xs font-semibold text-[#14213d]">
                    {item.sector} · {item.location}
                  </p>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  Temps d&apos;intervention: {item.interventionTime}
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {(item.beforeImages.length > 0 ? item.beforeImages : ["placeholder-before"]).map(
                    (image, index) =>
                      image === "placeholder-before" ? (
                        <CaseStudyVisual key={index} type="Avant" title={item.title} />
                      ) : (
                        <Image
                          key={`${image}-${index}`}
                          src={image}
                          alt={`Avant intervention - ${item.title}`}
                          width={960}
                          height={600}
                          loading="lazy"
                          className="aspect-[16/10] w-full rounded-xl object-cover"
                        />
                      )
                  )}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {(item.afterImages.length > 0 ? item.afterImages : ["placeholder-after"]).map(
                    (image, index) =>
                      image === "placeholder-after" ? (
                        <CaseStudyVisual key={index} type="Apres" title={item.title} />
                      ) : (
                        <Image
                          key={`${image}-${index}`}
                          src={image}
                          alt={`Apres intervention - ${item.title}`}
                          width={960}
                          height={600}
                          loading="lazy"
                          className="aspect-[16/10] w-full rounded-xl object-cover"
                        />
                      )
                  )}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Problematique
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.problem}</p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Solution
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.solution}</p>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Resultat
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.result}</p>
                  </article>
                </div>

                {item.testimonial ? (
                  <blockquote className="mt-6 rounded-2xl border-l-4 border-[#c9a227] bg-slate-50 p-4">
                    <p className="text-sm italic text-slate-700">{item.testimonial.quote}</p>
                    <footer className="mt-2 text-xs font-semibold text-[#14213d]">
                      {item.testimonial.name} · {item.testimonial.role} · {item.testimonial.company}
                    </footer>
                  </blockquote>
                ) : null}

                {item.videoUrl ? (
                  <a
                    href={item.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex text-sm font-semibold text-[#14213d] underline"
                  >
                    Voir la video de cette realisation
                  </a>
                ) : null}
              </article>
            ))
          : null}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/devis" className="btn-primary">
          Demander un devis
        </Link>
        <Link href="/galerie" className="btn-secondary">
          Voir la galerie
        </Link>
      </div>
    </section>
  );
}
