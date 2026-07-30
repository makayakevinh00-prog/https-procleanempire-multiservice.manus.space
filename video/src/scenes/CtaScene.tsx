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

const ContactLine: React.FC<{ label: string; delay: number }> = ({
  label,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();

  return (
    <div
      style={{
        ...riseIn({ frame, fps, delay, distance: 18 }),
        color: colors.white,
        fontSize: u(3.4),
        marginTop: u(1.6),
      }}
    >
      {label}
    </div>
  );
};

export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { u } = useLayout();

  const button = spring({
    frame: frame - 30,
    fps,
    config: { damping: 14, mass: 0.6 },
    durationInFrames: 40,
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: u(8),
        fontFamily,
        opacity: sceneFade({ frame, durationInFrames, fadeOut: 20 }),
      }}
    >
      <Logo
        height={14}
        style={riseIn({ frame, fps, delay: 0, distance: 20 })}
      />

      <div
        style={{
          ...riseIn({ frame, fps, delay: 12 }),
          color: colors.white,
          fontSize: u(5.6),
          fontWeight: 700,
          marginTop: u(4),
          maxWidth: u(85),
          lineHeight: 1.2,
        }}
      >
        Demandez votre devis sous 24h
      </div>

      <div
        style={{
          marginTop: u(4),
          backgroundColor: colors.accent500,
          color: colors.brand900,
          fontSize: u(3.4),
          fontWeight: 700,
          letterSpacing: u(0.12),
          padding: `${u(2)}px ${u(5)}px`,
          borderRadius: u(1.2),
          opacity: button,
          transform: `scale(${interpolate(button, [0, 1], [0.85, 1])})`,
        }}
      >
        {company.website}
      </div>

      <div style={{ marginTop: u(4) }}>
        <ContactLine label={company.phone} delay={46} />
        <ContactLine label={company.email} delay={54} />
        <ContactLine label={company.zone} delay={62} />
      </div>
    </AbsoluteFill>
  );
};
