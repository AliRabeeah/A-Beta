import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';

// Renders the cat as a real static image per mood, with a code-driven
// breathing/bounce loop (via react-native-reanimated) — see the README in
// src/assets/companion-expressions/ for the mood -> file mapping.
// Unlike CompanionLottie (one looping animation file, mood unused), this
// swaps to a DIFFERENT static image per mood, and adds the "alive" feeling
// itself in code — a gentle breathing/bounce loop applied to whichever
// image is showing — via react-native-reanimated, the same library already
// driving the name badge float and the sky's stars/clouds elsewhere in this
// screen. That means any flat expression image works, animated or not.
//
// Each image is real artwork (background removed, mapped per mood) — see
// src/assets/companion-expressions/README.md for the mapping and how to
// swap any of them later.
const EXPRESSIONS = {
  happy: require('../assets/companion-expressions/happy.png'),
  content: require('../assets/companion-expressions/content.png'),
  sleepy: require('../assets/companion-expressions/sleepy.png'),
  new: require('../assets/companion-expressions/new.png'),
};

// Same growth curve Companion.js and CompanionLottie.js use, so switching
// implementations doesn't change how the companion's size progresses.
const STAGE_SCALE = { 1: 0.72, 2: 0.77, 3: 0.82, 4: 0.87, 5: 0.93, 6: 1.0 };

export default function Companion({ stage = 1, mood = 'content', accentColor, size = 140 }) {
  const clampedStage = Math.max(1, Math.min(6, stage));
  const scale = STAGE_SCALE[clampedStage] ?? 1;
  const animatedSize = size * scale;

  // sleepy breathes slower and barely lifts (drowsy); happy breathes
  // faster and bounces more (energetic) — the same source image, just
  // driven differently, so mood still reads even with only one art style.
  const breatheDuration = mood === 'sleepy' ? 2200 : mood === 'happy' ? 1000 : 1500;
  const liftAmount = mood === 'sleepy' ? 1.5 : mood === 'happy' ? 5 : 3;

  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: breatheDuration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: breatheDuration, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [t, breatheDuration]);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -t.value * liftAmount },
      { scale: 1 + t.value * 0.025 },
    ],
  }));

  // a soft contact shadow that shrinks slightly as the cat lifts on the
  // in-breath, and grows back as it settles — ties the character to the
  // ground instead of looking like it's floating over the now-livelier
  // scene behind it
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 - t.value * 0.08 }],
    opacity: 0.22 - t.value * 0.05,
  }));

  const source = EXPRESSIONS[mood] || EXPRESSIONS.content;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: size * 0.02,
            width: animatedSize * 0.62,
            height: animatedSize * 0.14,
            borderRadius: 999,
            backgroundColor: '#000000',
          },
          shadowStyle,
        ]}
      />
      <Animated.Image
        source={source}
        resizeMode="contain"
        style={[{ width: animatedSize, height: animatedSize }, breatheStyle]}
      />
    </View>
  );
}
