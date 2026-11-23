export const metadata = { title: "Mandat de prélèvement — ProClean Empire", robots: { index: false } };

/** Page affichée au client après la signature (ou l'abandon) du mandat de prélèvement chez Stripe. */
export default function MandatMerci({ searchParams }: { searchParams: { annule?: string } }) {
  const cancelled = !!searchParams.annule;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f0f4fc] p-6">
      <div className="w-full max-w-md rounded-[28px] border border-[#dbe6fc] bg-white p-8 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#1e3a6e]">ProClean Empire</p>
        <h1 className="mt-4 text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-[#101828]">{cancelled ? "Mandat non signé." : "Merci, votre mandat est enregistré."}</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-[#475467]">
          {cancelled
            ? "Vous n'avez pas terminé la signature. Vous pouvez rouvrir le lien reçu, ou nous écrire si vous préférez un autre mode de règlement."
            : "Vos prochaines factures pourront être réglées par prélèvement. Vous serez prévenu avant chaque échéance, et rien n'est prélevé aujourd'hui."}
        </p>
        <p className="mt-6 text-[14px] text-[#667085]">Une question ? contact@procleanempire.com</p>
      </div>
    </main>
  );
}
