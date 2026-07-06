import Image from "next/image";
import { premiumReviewsData } from "@/lib/content/phase1";

function Rating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1 text-[#c9a227]" aria-label={`${value} sur 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} aria-hidden>
          {index < value ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

export function ReviewsPremiumSection() {
  const hasReviews = premiumReviewsData.textReviews.length > 0;
  const hasVideoTestimonials = premiumReviewsData.videoTestimonials.length > 0;
  const hasScreenshots = premiumReviewsData.googleReviewScreenshots.length > 0;

  return (
    <section className="section pt-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-10">
        <h2 className="text-3xl font-bold text-[#14213d] md:text-4xl">
          {premiumReviewsData.sectionTitle}
        </h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-700">
          {premiumReviewsData.sectionDescription}
        </p>

        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Avis ecrits
          </h3>
          {hasReviews ? (
            <div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-3">
              {premiumReviewsData.textReviews.map((review) => (
                <article
                  key={review.id}
                  className="w-[320px] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <Rating value={review.rating} />
                  <p className="mt-4 text-sm leading-relaxed text-slate-700">{review.text}</p>
                  <p className="mt-5 text-sm font-semibold text-[#14213d]">{review.name}</p>
                  <p className="text-xs text-slate-500">
                    {review.role} · {review.company}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              {premiumReviewsData.placeholders.textReviews}
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Temoignages video
            </h3>
            {hasVideoTestimonials ? (
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                {premiumReviewsData.videoTestimonials.map((video) => (
                  <li key={video.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="font-semibold text-[#14213d]">{video.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{video.description}</p>
                    <a
                      href={video.youtubeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-xs font-semibold text-[#14213d] underline"
                    >
                      Voir la video
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                {premiumReviewsData.placeholders.videoTestimonials}
              </p>
            )}
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Captures Google Reviews
            </h3>
            {hasScreenshots ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {premiumReviewsData.googleReviewScreenshots.map((image) => (
                  <Image
                    key={image}
                    src={image}
                    alt="Capture d'ecran Google Reviews"
                    width={320}
                    height={240}
                    loading="lazy"
                    className="aspect-[4/3] w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                {premiumReviewsData.placeholders.googleReviewScreenshots}
              </p>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
