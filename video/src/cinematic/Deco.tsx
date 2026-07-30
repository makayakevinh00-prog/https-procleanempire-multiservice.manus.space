import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { gold, ink } from "./theme";

/**
 * Éventail de rayons art déco. `progress` (0 → 1) ouvre l'éventail depuis le
 * centre : c'est le motif signature du style Gatsby.
 */
export const Sunburst: React.FC<{
  progress: number;
  rays?: number;
  size: number;
  opacity?: number;
}> = ({ progress, rays = 24, size, opacity = 0.5 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-100 -100 200 200"
      style={{ opacity }}
    >
      {new Array(rays).fill(0).map((_, index) => {
        const angle = (index / rays) * 360;
        // Les rayons s'ouvrent en cascade, pas tous en même temps.
        const local = interpolate(
          progress,
          [index / rays / 2, index / rays / 2 + 0.5],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        return (
          <path
            key={index}
            d={`M 0 0 L ${-2.2} ${-100 * local} L ${2.2} ${-100 * local} Z`}
            fill={index % 2 === 0 ? gold.base : gold.deep}
            transform={`rotate(${angle})`}
          />
        );
      })}
    </svg>
  );
};

/**
 * Cadre art déco à coins chanfreinés qui se dessine progressivement.
 * `progress` 0 → 1 trace le trait.
 */
export const DecoFrame: React.FC<{
  progress: number;
  inset: number;
  strokeWidth?: number;
}> = ({ progress, inset, strokeWidth = 3 }) => {
  const cut = 46;

  return (
    <AbsoluteFill style={{ padding: inset }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon
          points={`${cut / 10},0 ${100 - cut / 10},0 100,${cut / 10} 100,${100 - cut / 10} ${100 - cut / 10},100 ${cut / 10},100 0,${100 - cut / 10} 0,${cut / 10}`}
          fill="none"
          stroke={gold.base}
          strokeWidth={strokeWidth / 10}
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - progress}
        />
      </svg>
    </AbsoluteFill>
  );
};

/** Séparateur horizontal : trait fin, losange central, trait fin. */
export const DecoDivider: React.FC<{ width: number; progress: number }> = ({
  width,
  progress,
}) => {
  const half = (width / 2) * progress;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        height: 30,
      }}
    >
      <div style={{ width: half, height: 2, backgroundColor: gold.base }} />
      <div
        style={{
          width: 12,
          height: 12,
          backgroundColor: gold.base,
          transform: `rotate(45deg) scale(${progress})`,
        }}
      />
      <div style={{ width: half, height: 2, backgroundColor: gold.base }} />
    </div>
  );
};

/**
 * Grain argentique + vignettage. C'est ce qui empêche l'image de « sentir le
 * calque » : une image numérique parfaitement propre paraît plate.
 */
export const FilmTexture: React.FC<{ grain?: number }> = ({ grain = 0.16 }) => {
  const frame = useCurrentFrame();
  // La graine change à chaque image : le grain bouge au lieu de rester figé.
  const seed = frame % 12;

  return (
    <>
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: grain,
          mixBlendMode: "overlay",
        }}
      >
        <svg width="100%" height="100%">
          <filter id={`grain-${seed}`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves={3}
              seed={seed}
            />
          </filter>
          <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
        </svg>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          backgroundImage: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.75) 100%)`,
        }}
      />
    </>
  );
};

/** Bandes noires cinéma, qui s'ouvrent au début et se referment à la fin. */
export const Letterbox: React.FC<{ height: number }> = ({ height }) => (
  <>
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height,
        backgroundColor: ink.black,
      }}
    />
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height,
        backgroundColor: ink.black,
      }}
    />
  </>
);
