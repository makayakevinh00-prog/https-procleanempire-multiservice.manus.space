import React from "react";
import { Composition, Still } from "remotion";
import { PROMO_DURATION, ProCleanPromo } from "./ProCleanPromo";
import { SocialCard } from "./scenes/SocialCard";
import { TIKTOK_DURATION, TikTokEdit } from "./tiktok/TikTokEdit";

const FPS = 30;

/**
 * `PromoLandscape` is the website / YouTube cut, `PromoVertical` the same film
 * re-laid-out for Shorts, Reels and TikTok, and `SocialCard` a single frame for
 * thumbnails and Open Graph images.
 */
export const MyComposition: React.FC = () => {
  return (
    <>
      <Composition
        id="PromoLandscape"
        component={ProCleanPromo}
        durationInFrames={PROMO_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="PromoVertical"
        component={ProCleanPromo}
        durationInFrames={PROMO_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="TikTok"
        component={TikTokEdit}
        durationInFrames={TIKTOK_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Still id="SocialCard" component={SocialCard} width={1200} height={630} />
    </>
  );
};
