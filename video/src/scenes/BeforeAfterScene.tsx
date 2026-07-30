import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fontFamily, media } from "../brand";
import { useLayout } from "../layout";
import { sceneFade } from "../components/animations";

const Tag: React.FC<{ label: string; align: "left" | "right" }> = ({
  label,
  align,
}) => {
  const { u } = useLayout();

  return (
    <div
      style={{
        position: "absolute",
        top: u(6),
        [align]: u(6),
        fontFamily,
        fontSize: u(2.6),
        letterSpacing: u(0.2),
        textTransform: "uppercase",
        color: align === "left" ? colors.brand100 : colors.brand900,
        backgroundColor:
          align === "left" ? "rgba(11, 19, 38, 0.7)" : colors.accent500,
        padding: `${u(1.2)}px ${u(2.6)}px`,
        borderRadius: u(1),
        fontWeight: 600,
      }}
    >
      {label}
    </div>
  );
};

/**
 * Reveals the "after" photo over the "before" photo with a sweeping divider.
 */
const Comparison: React.FC<{
  before: string;
  after: string;
  fadeIn: number;
}> = ({ before, after, fadeIn }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { u, width } = useLayout();

  const sweep = interpolate(
    frame,
    [12, durationInFrames - 25],
    [12, 88],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const imageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  return (
    <AbsoluteFill
      style={{
        opacity:
          fadeIn === 0
            ? 1
            : interpolate(frame, [0, fadeIn], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
      }}
    >
      <Img src={staticFile(before)} style={imageStyle} />
      <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${sweep}%)` }}>
        <Img src={staticFile(after)} style={imageStyle} />
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${sweep}%`,
          width: Math.max(3, u(0.5)),
          backgroundColor: colors.accent500,
          boxShadow: `0 0 ${u(3)}px rgba(201, 162, 39, 0.8)`,
        }}
      />
      <Tag label="Avant" align="left" />
      <Tag label="Après" align="right" />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(to top, rgba(11, 19, 38, 0.9) 0%, transparent 35%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: u(6),
          left: u(6),
          width: width - u(12),
          fontFamily,
          color: colors.white,
          fontSize: u(3.6),
          fontWeight: 600,
        }}
      >
        Un résultat mesurable, documenté avant / après.
      </div>
    </AbsoluteFill>
  );
};

/** Frames during which two consecutive comparisons are both on screen. */
const CROSSFADE = 14;

export const BeforeAfterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const count = media.beforeAfter.length;
  const step = Math.floor(durationInFrames / count);

  return (
    <AbsoluteFill
      style={{
        opacity: sceneFade({ frame, durationInFrames, fadeIn: 10, fadeOut: 12 }),
      }}
    >
      {media.beforeAfter.map((pair, index) => {
        const from = index * step;
        const isLast = index === count - 1;

        return (
          <Sequence
            key={pair.before}
            from={from}
            durationInFrames={
              isLast ? durationInFrames - from : step + CROSSFADE
            }
          >
            <Comparison
              before={pair.before}
              after={pair.after}
              fadeIn={index === 0 ? 0 : CROSSFADE}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
