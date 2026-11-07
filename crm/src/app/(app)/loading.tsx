/** Retour visuel immédiat à chaque changement de page : la structure s'affiche tout de suite, les données arrivent ensuite. */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Chargement de la page">
      <div className="h-8 w-64 rounded-lg bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-200" />)}</div>
      <div className="h-64 rounded-2xl bg-slate-200" />
    </div>
  );
}
