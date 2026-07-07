import { partners } from "@/lib/content/phase1";

export function PartnersMarquee() {
  if (partners.length === 0) {
    return null;
  }

  const loop = [...partners, ...partners];

  return (
    <section className="border-y border-slate-200 bg-white py-8">
      <div className="mx-auto max-w-content px-6 md:px-8">
        <p className="mb-5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
          Ils nous font confiance
        </p>
        <div className="marquee-mask overflow-hidden">
          <div className="marquee-track flex w-max items-center gap-16">
            {loop.map((partner, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${partner.name}-${index}`}
                src={partner.logo}
                alt={partner.name}
                className="h-10 w-auto shrink-0 object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
