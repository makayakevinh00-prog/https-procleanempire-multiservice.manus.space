import { realisationsVideos, realisationsSectors } from "@/lib/content/phase3";
import { YoutubeVideoCard } from "@/components/ui/youtube-video-card";

export function RealisationsVideos() {
  if (realisationsVideos.length === 0) {
    return null;
  }

  return (
    <section className="section pt-0">
      <div className="rounded-[28px] border border-[#dbe6fc] bg-white p-6 md:p-10">
        <h2 className="text-2xl lp-serif text-[#101828] md:text-3xl">Extraits vidéo</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#475467]">
          Découvrez une sélection d&apos;interventions réalisées par nos équipes. De la
          préparation du chantier au contrôle qualité final, chaque prestation est réalisée avec
          rigueur afin de garantir des environnements professionnels propres, accueillants et
          conformes aux exigences de nos clients.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {realisationsVideos.map((video) => (
            <article key={video.id} className="overflow-hidden rounded-[24px] border border-[#dbe6fc] bg-[#f7f9fd]">
              <YoutubeVideoCard youtubeUrl={video.youtubeUrl ?? ""} title={video.title} aspect="aspect-[9/16]" />
              <div className="p-4">
                <p className="text-sm font-semibold text-[#101828]">{video.title}</p>
                <p className="mt-1 text-xs text-[#475467]">{video.description}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {realisationsSectors.map((sector) => (
            <div
              key={sector.label}
              className="flex items-center gap-2 rounded-xl border border-[#dbe6fc] bg-[#f7f9fd] px-4 py-3 text-sm font-medium text-[#475467]"
            >
              <span aria-hidden>{sector.emoji}</span>
              <span>{sector.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
