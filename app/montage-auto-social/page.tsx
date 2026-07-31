import { SocialVideoStudio } from "@/components/pages/social-video-studio";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Montage vidéo automatique optimisé réseaux sociaux",
  description:
    "Créez automatiquement des vidéos optimisées TikTok, Reels et Shorts à partir de vos rushs: hook, rythme, sous-titres, sons tendance et points de rétention.",
  path: "/montage-auto-social"
});

export default function MontageAutoSocialPage() {
  return <SocialVideoStudio />;
}
