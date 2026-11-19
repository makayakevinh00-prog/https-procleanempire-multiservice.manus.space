const sectors = [
  "Entreprises",
  "Bureaux",
  "Copropriétés",
  "Commerces",
  "Hôtels",
  "Restaurants",
  "Cabinets médicaux",
  "Espaces industriels",
  "Entrepôts",
  "Collectivités"
];

export function SectorsSection() {
  return (
    <section className="section pt-0">
      <div className="card p-6 md:p-8">
        <h2 className="text-xl lp-serif text-[#101828]">Nos secteurs d&apos;intervention</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#475467]">
          Une organisation capable de s&apos;adapter aux exigences de chaque environnement
          professionnel, avec un cahier des charges et une fréquence d&apos;intervention propres à
          chaque secteur.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {sectors.map((sector) => (
            <div
              key={sector}
              className="rounded-xl border border-[#dbe6fc] bg-[#f7f9fd] px-4 py-3 text-center text-sm font-medium text-[#475467]"
            >
              {sector}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
