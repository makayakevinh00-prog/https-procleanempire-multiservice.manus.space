import { ImmersiveHome } from "@/components/home/immersive-home";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Ménage Airbnb, nettoyage de bureaux et conciergerie d'entreprise à Pontoise",
  description:
    "ProClean Empire : ménage Airbnb pour conciergeries et propriétaires, nettoyage de bureaux et commerces, conciergerie d'entreprise et detailing auto & avion à Pontoise et en Île-de-France.",
  path: "/"
});

export default function HomePage() {
  return <ImmersiveHome />;
}
