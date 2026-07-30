import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { FilmTexture } from "./Deco";
import { ColdOpen, TitleCard } from "./scenes/Opening";
import { Manifesto, Proof, Services } from "./scenes/Statements";
import { Finale, Showcase } from "./scenes/Closing";
import { beat } from "./theme";
import { ink } from "./theme";

/**
 * Découpage en temps musicaux plutôt qu'en secondes : toutes les coupes tombent
 * sur un temps, donc l'image reste synchronisée si vous posez une musique au
 * même tempo (voir `BPM` dans theme.ts).
 */
export const cinematicBeats = {
  coldOpen: 6,
  title: 8,
  manifesto: 15,
  proof: 12,
  showcase: 12,
  services: 8,
  finale: 10,
};

export const CINEMATIC_DURATION = Object.values(cinematicBeats).reduce(
  (total, beats) => total + beat(beats),
  0,
);

export const Cinematic: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: ink.black }}>
      <Series>
        <Series.Sequence durationInFrames={beat(cinematicBeats.coldOpen)}>
          <ColdOpen />
        </Series.Sequence>
        <Series.Sequence durationInFrames={beat(cinematicBeats.title)}>
          <TitleCard />
        </Series.Sequence>
        <Series.Sequence durationInFrames={beat(cinematicBeats.manifesto)}>
          <Manifesto />
        </Series.Sequence>
        <Series.Sequence durationInFrames={beat(cinematicBeats.proof)}>
          <Proof />
        </Series.Sequence>
        <Series.Sequence durationInFrames={beat(cinematicBeats.showcase)}>
          <Showcase />
        </Series.Sequence>
        <Series.Sequence durationInFrames={beat(cinematicBeats.services)}>
          <Services />
        </Series.Sequence>
        <Series.Sequence durationInFrames={beat(cinematicBeats.finale)}>
          <Finale />
        </Series.Sequence>
      </Series>

      {/* Grain et vignettage par-dessus tout le film, pour l'unifier. */}
      <FilmTexture />
    </AbsoluteFill>
  );
};
