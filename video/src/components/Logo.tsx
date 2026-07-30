import React from "react";
import { Img, staticFile } from "remotion";
import { colors, media } from "../brand";
import { useLayout } from "../layout";

/**
 * The brand logo is a dark navy mark on transparency, so it disappears on the
 * dark backdrop. Seating it on a light panel keeps the original brand colours
 * instead of recolouring the mark.
 */
export const Logo: React.FC<{
  /** Height of the mark itself, in layout units. */
  height: number;
  style?: React.CSSProperties;
}> = ({ height, style }) => {
  const { u } = useLayout();

  return (
    <div
      style={{
        backgroundColor: colors.white,
        borderRadius: u(1.6),
        padding: `${u(2.4)}px ${u(4)}px`,
        border: `${Math.max(1, u(0.2))}px solid ${colors.accent500}`,
        boxShadow: `0 ${u(2)}px ${u(6)}px rgba(0, 0, 0, 0.35)`,
        display: "inline-flex",
        ...style,
      }}
    >
      <Img
        src={staticFile(media.logo)}
        style={{
          height: u(height),
          width: "auto",
          objectFit: "contain",
        }}
      />
    </div>
  );
};
