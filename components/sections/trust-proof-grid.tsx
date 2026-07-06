import { trustProofs } from "@/lib/data";
import { FadeIn } from "@/components/ui/fade-in";

export function TrustProofGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {trustProofs.map((proof, index) => (
        <FadeIn key={proof.label} delay={index * 0.05}>
          <article className="card p-6">
            <p className="text-3xl font-bold text-slate-900">{proof.value}</p>
            <p className="mt-2 text-sm font-medium text-slate-600">{proof.label}</p>
          </article>
        </FadeIn>
      ))}
    </div>
  );
}
