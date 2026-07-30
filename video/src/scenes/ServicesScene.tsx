import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fontFamily, services } from "../brand";
import { useLayout } from "../layout";
import { riseIn, sceneFade } from "../components/animations";

export const ServicesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { u } = useLayout();

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        padding: u(10),
        fontFamily,
        opacity: sceneFade({ frame, durationInFrames }),
      }}
    >
      <div
        style={{
          ...riseIn({ frame, fps, delay: 2 }),
          color: colors.accent500,
          fontSize: u(2.8),
          letterSpacing: u(0.3),
          textTransform: "uppercase",
          marginBottom: u(4),
        }}
      >
        Nos secteurs d'intervention
      </div>

      {services.map((service, index) => (
        <div
          key={service}
          style={{
            ...riseIn({ frame, fps, delay: 10 + index * 7, distance: 26 }),
            display: "flex",
            alignItems: "center",
            gap: u(2.5),
            paddingTop: u(2),
            paddingBottom: u(2),
            borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          <div
            style={{
              width: u(1.4),
              height: u(1.4),
              borderRadius: "50%",
              backgroundColor: colors.accent500,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              color: colors.white,
              fontSize: u(4),
              fontWeight: 500,
            }}
          >
            {service}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
