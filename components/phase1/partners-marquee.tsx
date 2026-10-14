import { partners } from "@/lib/content/phase1";

/** Bannière défilante « Ils nous font confiance » (noms en texte, liste dans lib/content/phase1.ts). */
export function PartnersMarquee() {
  if (partners.length === 0) {
    return null;
  }

  // La liste est répétée pour que la boucle soit continue ; seule la première copie est lue par les lecteurs d'écran.
  const loop = [...partners, ...partners, ...partners, ...partners];

  return (
    <section className="border-y border-slate-200 bg-white py-10" aria-labelledby="partners-title">
      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        <p
          id="partners-title"
          className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
        >
          Ils nous font confiance
        </p>
        <ul className="sr-only">
          {partners.map((partner) => (
            <li key={partner.name}>{partner.name}</li>
          ))}
        </ul>
        <div className="marquee-mask overflow-hidden" aria-hidden>
          <div className="marquee-track flex w-max items-center gap-14 md:gap-20">
            {loop.map((partner, index) => (
              <span
                key={`${partner.name}-${index}`}
                className="shrink-0 whitespace-nowrap font-display text-xl font-semibold tracking-tight text-slate-500 transition-colors hover:text-ink md:text-2xl"
              >
                {partner.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
