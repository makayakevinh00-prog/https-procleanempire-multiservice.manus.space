import { methodSteps } from "@/lib/data";

export function MethodTimeline() {
  return (
    <div className="mt-12 space-y-6">
      {methodSteps.map((item) => (
        <article
          key={item.step}
          className="card grid gap-4 p-6 md:grid-cols-[80px,1fr] md:items-start"
        >
          <p className="text-2xl font-bold text-brand-700">{item.step}</p>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
