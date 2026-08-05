import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Ellipse, Circle, Path, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';

// A small round Scottish Fold kitten companion — light grey coat with cream
// markings, she/female (a small bow accessory unlocks at the final growth
// stage). Grows across 6 stages and wears one of a few expressions
// depending on recent activity. Pure SVG (react-native-svg was already a
// working dependency in this project, so this adds zero new native
// surface) plus a gentle idle-bob animation via react-native-reanimated
// (also already used elsewhere, e.g. ProgressRing).
//
// Props:
//  - stage: 1-6, how grown the cat is (see companionStats.stageForLevel)
//  - mood: 'happy' | 'content' | 'sleepy' | 'new'
//  - accentColor: used only for the small bow accessory at max stage, so
//    she still picks up a bit of the app's personalization without
//    overriding her actual coat coloring
//  - size: render size in px

const COAT_GREY = '#A6ABB3'; // grey ("رصاصي") — a shade darker than the first pass
const COAT_GREY_SHADE = '#848993'; // darker grey for ear folds / tail shading
const COAT_CREAM = '#F5EAD6'; // cream markings — chest, belly, paws, tail tip
const NOSE_PINK = '#EFB0BE';

function lighten(hex, amount) {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function Face({ mood, cx, cy, scale }) {
  const eyeOffsetX = 8.5 * scale;
  const eyeY = cy - 2 * scale;
  const eyeColor = '#3A3A3A';

  if (mood === 'sleepy') {
    return (
      <G>
        <Path d={`M ${cx - eyeOffsetX - 5 * scale} ${eyeY} q ${5 * scale} ${4 * scale} ${10 * scale} 0`} stroke={eyeColor} strokeWidth={2.2 * scale} strokeLinecap="round" fill="none" />
        <Path d={`M ${cx + eyeOffsetX - 5 * scale} ${eyeY} q ${5 * scale} ${4 * scale} ${10 * scale} 0`} stroke={eyeColor} strokeWidth={2.2 * scale} strokeLinecap="round" fill="none" />
        <Path
          d={`M ${cx} ${cy + 6 * scale} q ${-3 * scale} ${3 * scale} ${-5.5 * scale} ${0.8 * scale} M ${cx} ${cy + 6 * scale} q ${3 * scale} ${3 * scale} ${5.5 * scale} ${0.8 * scale}`}
          stroke={eyeColor}
          strokeWidth={1.6 * scale}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    );
  }

  if (mood === 'happy') {
    return (
      <G>
        <Path d={`M ${cx - eyeOffsetX - 5 * scale} ${eyeY + 2 * scale} q ${5 * scale} ${-6 * scale} ${10 * scale} 0`} stroke={eyeColor} strokeWidth={2.4 * scale} strokeLinecap="round" fill="none" />
        <Path d={`M ${cx + eyeOffsetX - 5 * scale} ${eyeY + 2 * scale} q ${5 * scale} ${-6 * scale} ${10 * scale} 0`} stroke={eyeColor} strokeWidth={2.4 * scale} strokeLinecap="round" fill="none" />
        <Path
          d={`M ${cx} ${cy + 6 * scale} q ${-4.5 * scale} ${5 * scale} ${-8 * scale} ${1 * scale} M ${cx} ${cy + 6 * scale} q ${4.5 * scale} ${5 * scale} ${8 * scale} ${1 * scale}`}
          stroke={eyeColor}
          strokeWidth={1.8 * scale}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </G>
    );
  }

  // 'content' and 'new' share a calm round-eyed face
  return (
    <G>
      <Circle cx={cx - eyeOffsetX} cy={eyeY} r={3 * scale} fill={eyeColor} />
      <Circle cx={cx + eyeOffsetX} cy={eyeY} r={3 * scale} fill={eyeColor} />
      <Circle cx={cx - eyeOffsetX + 1 * scale} cy={eyeY - 1 * scale} r={0.9 * scale} fill="#fff" />
      <Circle cx={cx + eyeOffsetX + 1 * scale} cy={eyeY - 1 * scale} r={0.9 * scale} fill="#fff" />
      <Path
        d={`M ${cx} ${cy + 6 * scale} q ${-4 * scale} ${4 * scale} ${-7 * scale} ${1 * scale} M ${cx} ${cy + 6 * scale} q ${4 * scale} ${4 * scale} ${7 * scale} ${1 * scale}`}
        stroke={eyeColor}
        strokeWidth={1.6 * scale}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </G>
  );
}

export default function Companion({ stage = 1, mood = 'content', accentColor = '#FF8A00', size = 96 }) {
  const bob = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value * -4 }],
  }));

  const clampedStage = Math.max(1, Math.min(6, stage));
  const bodyScale = 0.72 + clampedStage * 0.05; // grows gradually
  const cx = 50;
  const cy = 58;
  const bodyRx = 32 * bodyScale;
  const bodyRy = 28 * bodyScale;
  const headR = 24 * bodyScale;
  const headCy = cy - bodyRy - headR * 0.35;

  const showWhiskers = clampedStage >= 2;
  const longerTail = clampedStage >= 3;
  const fluffierTail = clampedStage >= 4;
  const showSparkles = clampedStage >= 5;
  const showBow = clampedStage >= 6;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={animatedStyle}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {showSparkles && (
            <G opacity={0.8}>
              <Path d="M 12 22 l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 z" fill={lighten(COAT_CREAM, 5)} />
              <Path d="M 86 18 l 1.6 4 l 4 1.6 l -4 1.6 l -1.6 4 l -1.6 -4 l -4 -1.6 l 4 -1.6 z" fill={lighten(COAT_CREAM, 5)} />
            </G>
          )}

          {/* tail — curls out from the body, grows longer & fluffier at higher stages */}
          {longerTail ? (
            <Path
              d={
                fluffierTail
                  ? `M ${cx + bodyRx - 4} ${cy + 8} q 22 -2 24 -22 q 4 14 -8 22 q -8 6 -16 0 z`
                  : `M ${cx + bodyRx - 4} ${cy + 8} q 16 0 16 -16 q 3 10 -6 16 q -5 3 -10 0 z`
              }
              fill={COAT_GREY}
            />
          ) : (
            <Ellipse cx={cx + bodyRx + 2} cy={cy + 10} rx={7} ry={5} fill={COAT_GREY} rotation={30} origin={`${cx + bodyRx + 2}, ${cy + 10}`} />
          )}
          {longerTail && (
            <Circle cx={fluffierTail ? cx + bodyRx + 14 : cx + bodyRx + 8} cy={fluffierTail ? cy - 16 : cy - 8} r={fluffierTail ? 6 : 4} fill={COAT_CREAM} />
          )}

          {/* back paws peeking out */}
          <Ellipse cx={cx - bodyRx * 0.5} cy={cy + bodyRy - 2} rx={7 * bodyScale} ry={5 * bodyScale} fill={COAT_CREAM} />
          <Ellipse cx={cx + bodyRx * 0.5} cy={cy + bodyRy - 2} rx={7 * bodyScale} ry={5 * bodyScale} fill={COAT_CREAM} />

          {/* body */}
          <Ellipse cx={cx} cy={cy} rx={bodyRx} ry={bodyRy} fill={COAT_GREY} />
          <Ellipse cx={cx} cy={cy + bodyRy * 0.35} rx={bodyRx * 0.55} ry={bodyRy * 0.55} fill={COAT_CREAM} />

          {/* head */}
          <Circle cx={cx} cy={headCy} r={headR} fill={COAT_GREY} />
          <Ellipse cx={cx} cy={headCy + headR * 0.35} rx={headR * 0.6} ry={headR * 0.45} fill={COAT_CREAM} />

          {/* Scottish Fold ears — small and rounded, folded forward against the head (not pointy) */}
          <Path d={`M ${cx - headR * 0.75} ${headCy - headR * 0.7} q -2 -7 6 -7 q 5 1 3 6 q -3 4 -9 1 z`} fill={COAT_GREY_SHADE} />
          <Path d={`M ${cx + headR * 0.75} ${headCy - headR * 0.7} q 2 -7 -6 -7 q -5 1 -3 6 q 3 4 9 1 z`} fill={COAT_GREY_SHADE} />

          {showWhiskers && (
            <G opacity={0.65}>
              <Path d={`M ${cx - headR * 0.55} ${headCy + 4} l -14 -3`} stroke="#8B8B8B" strokeWidth={1} strokeLinecap="round" />
              <Path d={`M ${cx - headR * 0.55} ${headCy + 8} l -14 1`} stroke="#8B8B8B" strokeWidth={1} strokeLinecap="round" />
              <Path d={`M ${cx + headR * 0.55} ${headCy + 4} l 14 -3`} stroke="#8B8B8B" strokeWidth={1} strokeLinecap="round" />
              <Path d={`M ${cx + headR * 0.55} ${headCy + 8} l 14 1`} stroke="#8B8B8B" strokeWidth={1} strokeLinecap="round" />
            </G>
          )}

          {/* nose */}
          <Path d={`M ${cx - 2.4} ${headCy + 5} l 4.8 0 l -2.4 3 z`} fill={NOSE_PINK} />

          {showBow && (
            <G>
              <Path
                d={`M ${cx - headR * 0.62} ${headCy - headR * 0.55} l -6 -4 l 1 5 l -1 5 l 6 -4 z`}
                fill={accentColor}
              />
              <Path
                d={`M ${cx - headR * 0.62} ${headCy - headR * 0.55} l 6 -4 l -1 5 l 1 5 l -6 -4 z`}
                fill={accentColor}
              />
              <Circle cx={cx - headR * 0.62} cy={headCy - headR * 0.55} r={2} fill={lighten(accentColor, 40)} />
            </G>
          )}

          <Face mood={mood} cx={cx} cy={headCy} scale={bodyScale} />
        </Svg>
      </Animated.View>
    </View>
  );
}
