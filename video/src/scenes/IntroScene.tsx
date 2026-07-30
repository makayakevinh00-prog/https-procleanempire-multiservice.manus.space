import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, company, fontFamily } from "../brand";
import { useLayout } from "../layout";
import { riseIn, sceneFade } from "../components/animations";
import { Logo } from "../components/Logo";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { u } = useLayout();

  const logo = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 35,
  });
  const ruleWidth = interpolate(frame, [20, 50], [0, u(34)], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        opacity: sceneFade({ frame, durationInFrames }),
        padding: u(8),
        textAlign: "center",
      }}
    >
      <Logo
        height={26}
        style={{
          opacity: logo,
          transform: `scale(${interpolate(logo, [0, 1], [0.88, 1])})`,
        }}
      />
      <div
        style={{
          width: ruleWidth,
          height: Math.max(2, u(0.5)),
          backgroundColor: colors.accent500,
          marginTop: u(4),
          marginBottom: u(4),
        }}
      />
      <div
        style={{
          ...riseIn({ frame, fps, delay: 30 }),
          color: colors.brand100,
          fontSize: u(3.4),
          letterSpacing: u(0.25),
          textTransform: "uppercase",
          maxWidth: u(78),
          lineHeight: 1.5,
        }}
      >
        {company.tagline}
      </div>
    </AbsoluteFill>
  );
};
