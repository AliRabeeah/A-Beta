import React from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';

// Drop-in replacement for the hand-drawn Skia <Companion> (see Companion.js)
// — CompanionWorld.js renders whichever one is imported as an absolutely
// positioned overlay above the scene, so the two are interchangeable
// without touching anything else.
//
// `idle.json` starts out as an empty placeholder — see the README in this
// folder for where to get a free replacement and how to install it.
//
// Growth-stage scaling mirrors the curve Companion.js used (small kitten
// -> full-size cat across the 6 stages) so swapping the asset doesn't
// change the pacing of how the companion visually grows. `mood` is
// accepted for API compatibility with <Companion> but isn't wired to a
// separate animation yet — see the README for why (Metro needs a static
// require() per file, so each extra mood/stage animation is a small,
// deliberate code addition once you have the assets, not automatic).
const STAGE_SCALE = { 1: 0.72, 2: 0.77, 3: 0.82, 4: 0.87, 5: 0.93, 6: 1.0 };

export default function Companion({ stage = 1, mood = 'content', accentColor, size = 140 }) {
  const clampedStage = Math.max(1, Math.min(6, stage));
  const scale = STAGE_SCALE[clampedStage] ?? 1;
  const animatedSize = size * scale;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <LottieView
        source={require('../assets/lottie/companion/idle.json')}
        autoPlay
        loop
        style={{ width: animatedSize, height: animatedSize }}
      />
    </View>
  );
}
