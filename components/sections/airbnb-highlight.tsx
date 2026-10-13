import Link from "next/link";

export function AirbnbHighlight() {
  return (
    <section className="section">
      <div className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1.2fr,1fr] md:items-center md:p-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#c9a227]">
            Locations courte durée
          </p>
          <h2 className="mt-2 text-3xl font-bold leading-tight text-[#14213d] md:text-4xl">
            Ménage Airbnb pour conciergeries et propriétaires
          </h2>
          <p className="mt-4 text-slate-600">
            Ménage entre deux voyageurs, linge, consommables et contrôle avant arrivée à Paris, Saint-Ouen,
            Pontoise, Cergy et en Île-de-France. 7 jours sur 7, à partir de 35 € le studio.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/menage-airbnb" className="btn-primary">
              Découvrir l&apos;offre Airbnb
            </Link>
            <Link href="/devis" className="btn-secondary">
              Devis conciergerie
            </Link>
          </div>
        </div>
        <img
          src="/media/photos/airbnb-salon-table-basse.jpeg"
          alt="Logement Airbnb préparé par ProClean Empire"
          loading="lazy"
          className="h-72 w-full rounded-2xl object-cover"
        />
      </div>
    </section>
  );
}
