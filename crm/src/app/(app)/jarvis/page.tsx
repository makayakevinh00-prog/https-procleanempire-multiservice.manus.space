import { redirect } from "next/navigation";

/** La supervision JARVIS est supprimée : les e-mails préparés se traitent dans la fiche de chaque client, avec un rappel sur l'accueil. */
export default function JarvisSupervision() {
  redirect("/");
}
