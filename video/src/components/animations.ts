import { interpolate, spring } from "remotion";

/**
 * Fade + rise used for most text entrances. `delay` is in frames.
 */
export const riseIn = ({
  frame,
  fps,
  delay = 0,
  distance = 40,
}: {
  frame: number;
  fps: number;
  delay?: number;
  distance?: number;
}) => {
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
    durationInFrames: 30,
  });

  return {
    opacity: progress,
    transform: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`,
  };
};

/**
 * Fades a scene out over its final frames so cuts never snap to black.
 */
export const sceneFade = ({
  frame,
  durationInFrames,
  fadeIn = 12,
  fadeOut = 15,
}: {
  frame: number;
  durationInFrames: number;
  fadeIn?: number;
  fadeOut?: number;
}) =>
  interpolate(
    frame,
    [0, fadeIn, durationInFrames - fadeOut, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
