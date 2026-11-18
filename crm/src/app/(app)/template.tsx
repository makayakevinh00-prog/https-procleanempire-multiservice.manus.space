/** Rejoué à chaque changement de page : le contenu entre en scène, bloc après bloc (styles « page-enter »). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
