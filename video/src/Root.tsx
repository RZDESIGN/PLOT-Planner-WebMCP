import React from 'react';
import { Composition } from 'remotion';
import { PlotDemo } from './Video';
import timing from './timing.json';

export const Root: React.FC = () => (
  <Composition
    id="PlotDemo"
    component={PlotDemo}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={timing.reduce((sum, scene) => sum + scene.frames, 0)}
  />
);
