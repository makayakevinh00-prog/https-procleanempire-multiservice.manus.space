import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fontFamily, headline } from "../brand";
import { useLayout } from "../layout";
import { riseIn, sceneFade } from "../components/animations";

export const PromiseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { u, isPortrait } = useLayout();

  const underline = interpolate(frame, [25, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        padding: isPortrait ? u(9) : u(12),
        fontFamily,
        opacity: sceneFade({ frame, durationInFrames }),
      }}
    >
      <div
        style={{
          ...riseIn({ frame, fps, delay: 4 }),
          color: colors.accent500,
          fontSize: u(2.8),
          letterSpacing: u(0.3),
          textTransform: "uppercase",
          marginBottom: u(3),
        }}
      >
        Notre promesse
      </div>

      <h1
        style={{
          ...riseIn({ frame, fps, delay: 12 }),
          color: colors.white,
          fontSize: isPortrait ? u(7) : u(6.4),
          lineHeight: 1.15,
          fontWeight: 700,
          margin: 0,
          maxWidth: u(88),
        }}
      >
        {headline.title}
      </h1>

      <div
        style={{
          width: `${underline * 26}%`,
          height: Math.max(3, u(0.6)),
          backgroundColor: colors.accent500,
          marginTop: u(4),
          marginBottom: u(4),
        }}
      />

      <p
        style={{
          ...riseIn({ frame, fps, delay: 34 }),
          color: colors.brand100,
          fontSize: u(3.2),
          lineHeight: 1.55,
          margin: 0,
          maxWidth: u(80),
        }}
      >
        {headline.subtitle}
      </p>
    </AbsoluteFill>
  );
};
