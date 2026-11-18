import { redirect } from "next/navigation";

/** L'ancienne adresse de la landing renvoie vers l'accueil, qui la remplace. */
export default function OffrePage() {
  redirect("/");
}
