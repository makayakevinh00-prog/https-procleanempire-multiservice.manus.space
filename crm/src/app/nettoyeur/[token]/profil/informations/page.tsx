import { redirect } from "next/navigation";

/** Ancienne page « Mes informations » : chaque rubrique a maintenant sa propre page. */
export default function Old({ params }: { params: { token: string } }) {
  redirect(`/nettoyeur/${params.token}/profil`);
}
