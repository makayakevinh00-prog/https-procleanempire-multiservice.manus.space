import { zoneDepartments } from "@/lib/content/zones";

export function ZonesGrid() {
  return (
    <section className="section pt-0">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {zoneDepartments.map((zone) => (
          <article key={zone.code} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#c9a227]">
              {zone.department} ({zone.code})
            </p>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {zone.cities.map((city) => (
                <li key={city}>{city}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
