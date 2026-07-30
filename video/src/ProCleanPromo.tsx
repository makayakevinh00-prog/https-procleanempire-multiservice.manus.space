import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { Backdrop } from "./components/Backdrop";
import { IntroScene } from "./scenes/IntroScene";
import { PromiseScene } from "./scenes/PromiseScene";
import { StatsScene } from "./scenes/StatsScene";
import { ShowcaseScene } from "./scenes/ShowcaseScene";
import { BeforeAfterScene } from "./scenes/BeforeAfterScene";
import { ServicesScene } from "./scenes/ServicesScene";
import { CtaScene } from "./scenes/CtaScene";

/** Scene lengths in frames at 30fps. The sum drives `PROMO_DURATION`. */
export const sceneDurations = {
  intro: 90,
  promise: 135,
  stats: 150,
  showcase: 180,
  beforeAfter: 150,
  services: 135,
  cta: 150,
};

export const PROMO_DURATION = Object.values(sceneDurations).reduce(
  (total, duration) => total + duration,
  0,
);

export const ProCleanPromo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Backdrop>
        <Series>
          <Series.Sequence durationInFrames={sceneDurations.intro}>
            <IntroScene />
          </Series.Sequence>
          <Series.Sequence durationInFrames={sceneDurations.promise}>
            <PromiseScene />
          </Series.Sequence>
          <Series.Sequence durationInFrames={sceneDurations.stats}>
            <StatsScene />
          </Series.Sequence>
          <Series.Sequence durationInFrames={sceneDurations.showcase}>
            <ShowcaseScene />
          </Series.Sequence>
          <Series.Sequence durationInFrames={sceneDurations.beforeAfter}>
            <BeforeAfterScene />
          </Series.Sequence>
          <Series.Sequence durationInFrames={sceneDurations.services}>
            <ServicesScene />
          </Series.Sequence>
          <Series.Sequence durationInFrames={sceneDurations.cta}>
            <CtaScene />
          </Series.Sequence>
        </Series>
      </Backdrop>
    </AbsoluteFill>
  );
};
