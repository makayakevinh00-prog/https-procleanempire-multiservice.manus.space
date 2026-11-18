/** Retour visuel immédiat à chaque changement de page : la structure s'affiche tout de suite, les données arrivent ensuite. */
export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-label="Chargement de la page">
      <div className="pce-skeleton h-10 w-72 rounded-xl" />
      <div className="pce-skeleton h-4 w-96 max-w-full rounded-lg" />
      <div className="grid gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="pce-skeleton h-24 rounded-2xl" />)}</div>
      <div className="pce-skeleton h-72 rounded-2xl" />
    </div>
  );
}
