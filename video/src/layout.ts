import { useVideoConfig } from "remotion";

/**
 * The compositions are rendered both in 16:9 and in 9:16. Sizing everything
 * from the shorter edge keeps typography and spacing balanced in both formats
 * without duplicating the scenes.
 */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 100;

  return {
    width,
    height,
    unit,
    isPortrait: height > width,
    /** Size in "unit" multiples, returned as a pixel value. */
    u: (multiplier: number) => unit * multiplier,
  };
};
