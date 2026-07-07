import { realisationsVideos, realisationsSectors } from "@/lib/content/phase3";
import { YoutubeVideoCard } from "@/components/ui/youtube-video-card";

export function RealisationsVideos() {
  if (realisationsVideos.length === 0) {
    return null;
  }

  return (
    <section className="section pt-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-10">
        <h2 className="text-2xl font-bold text-[#14213d] md:text-3xl">Extraits vidéo</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700">
          Découvrez une sélection d&apos;interventions réalisées par nos équipes. De la
          préparation du chantier au contrôle qualité final, chaque prestation est réalisée avec
          rigueur afin de garantir des environnements professionnels propres, accueillants et
          conformes aux exigences de nos clients.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {realisationsVideos.map((video) => (
            <article key={video.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <YoutubeVideoCard youtubeUrl={video.youtubeUrl ?? ""} title={video.title} aspect="aspect-[9/16]" />
              <div className="p-4">
                <p className="text-sm font-semibold text-[#14213d]">{video.title}</p>
                <p className="mt-1 text-xs text-slate-600">{video.description}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {realisationsSectors.map((sector) => (
            <div
              key={sector.label}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
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
