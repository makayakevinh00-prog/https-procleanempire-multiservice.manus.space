import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors } from "../brand";
import { useLayout } from "../layout";

/**
 * Deep navy background with a slowly drifting gold glow, shared by every scene
 * so the cuts read as one continuous film.
 */
export const Backdrop: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const frame = useCurrentFrame();
  const { u, width } = useLayout();
  const drift = interpolate(frame, [0, 300], [0, u(12)]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.brand900,
        backgroundImage: `radial-gradient(circle at 20% 15%, ${colors.brand500} 0%, transparent 55%), radial-gradient(circle at 85% 90%, ${colors.brand700} 0%, transparent 60%)`,
      }}
    >
      <AbsoluteFill
        style={{
          left: drift,
          backgroundImage: `radial-gradient(circle at 75% 20%, rgba(201, 162, 39, 0.22) 0%, transparent 45%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(115deg, transparent 45%, rgba(201, 162, 39, 0.08) 50%, transparent 55%)`,
          backgroundSize: `${width * 2}px 100%`,
          backgroundPositionX: interpolate(frame, [0, 300], [-width, width]),
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
