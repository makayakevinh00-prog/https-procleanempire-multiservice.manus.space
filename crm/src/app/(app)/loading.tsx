import Image from "next/image";

/** Changement de page : le logo ProClean apparaît en fondu au centre, le temps que la page arrive (plus d'écran vide). */
export default function Loading() {
  return (
    <div className="pce-loading flex min-h-[60vh] flex-col items-center justify-center gap-4" role="status" aria-label="Chargement de la page">
      <Image src="/logo.png" alt="ProClean Empire" width={187} height={344} priority className="pce-loading-logo h-28 w-auto" />
      <span className="pce-loading-bar h-1 w-24 overflow-hidden rounded-full bg-secondary" aria-hidden />
    </div>
  );
}
