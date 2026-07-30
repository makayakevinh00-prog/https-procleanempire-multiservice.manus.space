import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, commitments, fontFamily, stats } from "../brand";
import { useLayout } from "../layout";
import { riseIn, sceneFade } from "../components/animations";

export const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { u, isPortrait } = useLayout();

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: u(8),
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
          marginBottom: u(6),
        }}
      >
        Ce que vous pouvez attendre
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: isPortrait ? "column" : "row",
          gap: u(4),
          width: "100%",
          justifyContent: "center",
        }}
      >
        {stats.map((stat, index) => (
          <div
            key={stat.value}
            style={{
              ...riseIn({ frame, fps, delay: 12 + index * 8 }),
              flex: 1,
              maxWidth: isPortrait ? "100%" : u(30),
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: `1px solid rgba(201, 162, 39, 0.35)`,
              borderRadius: u(2),
              padding: u(4),
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: colors.accent500,
                fontSize: u(8),
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                color: colors.brand100,
                fontSize: u(2.5),
                marginTop: u(1.5),
                lineHeight: 1.4,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: u(2.5),
          marginTop: u(6),
        }}
      >
        {commitments.map((item, index) => (
          <div
            key={item}
            style={{
              ...riseIn({ frame, fps, delay: 40 + index * 6, distance: 20 }),
              color: colors.white,
              fontSize: u(2.3),
              border: `1px solid rgba(255, 255, 255, 0.2)`,
              borderRadius: u(5),
              padding: `${u(1.2)}px ${u(3)}px`,
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
