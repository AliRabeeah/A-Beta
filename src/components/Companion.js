import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Ellipse, Circle, Path, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';

// A small round Scottish Fold kitten companion — light grey coat with cream
// markings, she/female (a small bow accessory unlocks at the final growth
// stage). Grows across 6 stages and wears one of a few expressions
// depending on recent activity. Pure SVG (react-native-svg was already a
// working dependency in this project, so this adds zero new native
// surface) plus a gentle idle-bob animation via react-native-reanimated
// (also already used elsewhere, e.g. ProgressRing).
//
// Rendering uses gradients + layered shading (rather than flat fills) so
// the fur, ears, and eyes read with some volume and softness instead of
// looking like flat vector shapes.
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
const COAT_GREY_LIGHT = '#C3C7CE'; // lit highlight tone for fur gradients
const COAT_CREAM = '#F5EAD6'; // cream markings — chest, belly, paws, tail tip
const COAT_CREAM_SHADE = '#E4D4B8';
const NOSE_PINK = '#EFB0BE';
const EAR_INNER_PINK = '#E9A8AE';

function lighten(hex, amount) {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function Face({ mood, cx, cy, scale }) {
  const eyeOffsetX = 8.5 * scale;
  const eyeY = cy - 2 * scale;
  const eyeColor = '#3A3A3A';
  const irisColor = '#8FAE6E'; // soft hazel-green, a common real cat eye tone

  if (mood === 'sleepy') {
    return (
      <G>
        <Path d={`M ${cx - eyeOffsetX - 5 * scale} ${eyeY} q ${5 * scale} ${4 * scale} ${10 * scale} 0`} stroke={eyeColor} strokeWidth={2.2 * scale} strokeLinecap="round" fill="none" />
        <Path d={`M ${cx + eyeOffsetX - 5 * scale} ${eyeY} q ${5 * scale} ${4 * scale} ${10 * scale} 0`} stroke={eyeColor} strokeWidth={2.2 * scale} strokeLinecap="round" fill="none" />
        {/* a couple of short lashes at the corners read as sleepy rather than just closed */}
        <Path d={`M ${cx - eyeOffsetX + 5 * scale} ${eyeY + 0.5 * scale} l ${1.5 * scale} ${1.2 * scale}`} stroke={eyeColor} strokeWidth={1 * scale} strokeLinecap="round" />
        <Path d={`M ${cx + eyeOffsetX - 5 * scale} ${eyeY + 0.5 * scale} l ${-1.5 * scale} ${1.2 * scale}`} stroke={eyeColor} strokeWidth={1 * scale} strokeLinecap="round" />
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

  // 'content' and 'new' share a calm round-eyed face — now with a colored
  // iris, a vertical cat-pupil, and a two-point catchlight instead of a
  // single flat white dot, so the eyes have some real depth.
  return (
    <G>
      <Circle cx={cx - eyeOffsetX} cy={eyeY} r={3.2 * scale} fill={irisColor} />
      <Circle cx={cx + eyeOffsetX} cy={eyeY} r={3.2 * scale} fill={irisColor} />
      <Ellipse cx={cx - eyeOffsetX} cy={eyeY} rx={1.1 * scale} ry={2.9 * scale} fill={eyeColor} />
      <Ellipse cx={cx + eyeOffsetX} cy={eyeY} rx={1.1 * scale} ry={2.9 * scale} fill={eyeColor} />
      <Circle cx={cx - eyeOffsetX + 1.1 * scale} cy={eyeY - 1.1 * scale} r={0.85 * scale} fill="#fff" opacity={0.95} />
      <Circle cx={cx + eyeOffsetX + 1.1 * scale} cy={eyeY - 1.1 * scale} r={0.85 * scale} fill="#fff" opacity={0.95} />
      <Circle cx={cx - eyeOffsetX - 0.6 * scale} cy={eyeY + 1.3 * scale} r={0.35 * scale} fill="#fff" opacity={0.6} />
      <Circle cx={cx + eyeOffsetX - 0.6 * scale} cy={eyeY + 1.3 * scale} r={0.35 * scale} fill="#fff" opacity={0.6} />
      {/* thin lid line along the top of each eye for a touch of dimension */}
      <Path d={`M ${cx - eyeOffsetX - 3.2 * scale} ${eyeY - 2.6 * scale} q ${3.2 * scale} ${-1.6 * scale} ${6.4 * scale} 0`} stroke={eyeColor} strokeWidth={0.6 * scale} strokeLinecap="round" fill="none" opacity={0.5} />
      <Path d={`M ${cx + eyeOffsetX - 3.2 * scale} ${eyeY - 2.6 * scale} q ${3.2 * scale} ${-1.6 * scale} ${6.4 * scale} 0`} stroke={eyeColor} strokeWidth={0.6 * scale} strokeLinecap="round" fill="none" opacity={0.5} />
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
          <Defs>
            {/* fur gradients: lit upper-left, shaded lower-right, so the body/head/ears/tail read as rounded volumes rather than flat silhouettes */}
            <RadialGradient id="furBody" cx="38%" cy="30%" r="75%">
              <Stop offset="0%" stopColor={COAT_GREY_LIGHT} />
              <Stop offset="55%" stopColor={COAT_GREY} />
              <Stop offset="100%" stopColor={COAT_GREY_SHADE} />
            </RadialGradient>
            <RadialGradient id="furHead" cx="35%" cy="28%" r="75%">
              <Stop offset="0%" stopColor={COAT_GREY_LIGHT} />
              <Stop offset="55%" stopColor={COAT_GREY} />
              <Stop offset="100%" stopColor={COAT_GREY_SHADE} />
            </RadialGradient>
            <RadialGradient id="creamPatch" cx="42%" cy="30%" r="75%">
              <Stop offset="0%" stopColor={lighten(COAT_CREAM, 8)} />
              <Stop offset="70%" stopColor={COAT_CREAM} />
              <Stop offset="100%" stopColor={COAT_CREAM_SHADE} />
            </RadialGradient>
            <LinearGradient id="earFold" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={lighten(COAT_GREY_SHADE, 12)} />
              <Stop offset="100%" stopColor={COAT_GREY_SHADE} />
            </LinearGradient>
            <RadialGradient id="earInner" cx="50%" cy="35%" r="70%">
              <Stop offset="0%" stopColor={lighten(EAR_INNER_PINK, 12)} />
              <Stop offset="100%" stopColor={EAR_INNER_PINK} />
            </RadialGradient>
            <RadialGradient id="noseGrad" cx="40%" cy="30%" r="75%">
              <Stop offset="0%" stopColor={lighten(NOSE_PINK, 15)} />
              <Stop offset="100%" stopColor={NOSE_PINK} />
            </RadialGradient>
          </Defs>

          {/* soft contact shadow so she looks grounded / has weight, not floating */}
          <Ellipse cx={cx} cy={cy + bodyRy - 1} rx={bodyRx * 0.85} ry={bodyRy * 0.16} fill="#000000" opacity={0.14} />

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
              fill="url(#furBody)"
            />
          ) : (
            <Ellipse cx={cx + bodyRx + 2} cy={cy + 10} rx={7} ry={5} fill="url(#furBody)" rotation={30} origin={`${cx + bodyRx + 2}, ${cy + 10}`} />
          )}
          {/* a couple of faint tail-ring strokes at higher stages, a very light touch of tabby-style banding */}
          {fluffierTail && (
            <G opacity={0.25}>
              <Path d={`M ${cx + bodyRx + 8} ${cy - 4} q 6 -2 10 -8`} stroke={COAT_GREY_SHADE} strokeWidth={2} strokeLinecap="round" fill="none" />
              <Path d={`M ${cx + bodyRx + 4} ${cy + 2} q 8 -2 14 -10`} stroke={COAT_GREY_SHADE} strokeWidth={1.6} strokeLinecap="round" fill="none" />
            </G>
          )}
          {longerTail && (
            <Circle cx={fluffierTail ? cx + bodyRx + 14 : cx + bodyRx + 8} cy={fluffierTail ? cy - 16 : cy - 8} r={fluffierTail ? 6 : 4} fill="url(#creamPatch)" />
          )}

          {/* back paws peeking out, with a soft crease so they read as paws, not blobs */}
          <Ellipse cx={cx - bodyRx * 0.5} cy={cy + bodyRy - 2} rx={7 * bodyScale} ry={5 * bodyScale} fill="url(#creamPatch)" />
          <Ellipse cx={cx + bodyRx * 0.5} cy={cy + bodyRy - 2} rx={7 * bodyScale} ry={5 * bodyScale} fill="url(#creamPatch)" />
          <Path d={`M ${cx - bodyRx * 0.5 - 2 * bodyScale} ${cy + bodyRy - 3} q 2 3 4 0`} stroke={COAT_CREAM_SHADE} strokeWidth={0.6} strokeLinecap="round" fill="none" opacity={0.7} />
          <Path d={`M ${cx + bodyRx * 0.5 - 2 * bodyScale} ${cy + bodyRy - 3} q 2 3 4 0`} stroke={COAT_CREAM_SHADE} strokeWidth={0.6} strokeLinecap="round" fill="none" opacity={0.7} />

          {/* body */}
          <Ellipse cx={cx} cy={cy} rx={bodyRx} ry={bodyRy} fill="url(#furBody)" />
          {/* subtle underside shading where the body meets the ground, for roundness */}
          <Path
            d={`M ${cx - bodyRx * 0.7} ${cy + bodyRy * 0.55} Q ${cx} ${cy + bodyRy * 0.85} ${cx + bodyRx * 0.7} ${cy + bodyRy * 0.55}`}
            stroke={COAT_GREY_SHADE}
            strokeWidth={bodyRy * 0.12}
            strokeLinecap="round"
            fill="none"
            opacity={0.22}
          />
          <Ellipse cx={cx} cy={cy + bodyRy * 0.35} rx={bodyRx * 0.55} ry={bodyRy * 0.55} fill="url(#creamPatch)" />

          {/* head */}
          <Circle cx={cx} cy={headCy} r={headR} fill="url(#furHead)" />
          <Ellipse cx={cx} cy={headCy + headR * 0.35} rx={headR * 0.6} ry={headR * 0.45} fill="url(#creamPatch)" />
          {/* soft fluffy cheek tufts — a couple of short overlapping strokes on each side, a common realistic-kitten touch */}
          <G opacity={0.5}>
            <Path d={`M ${cx - headR * 0.72} ${headCy + headR * 0.28} q -3 1 -4 3.4`} stroke="#FFFFFF" strokeWidth={0.7} strokeLinecap="round" />
            <Path d={`M ${cx - headR * 0.66} ${headCy + headR * 0.44} q -3 1 -3.6 3.2`} stroke="#FFFFFF" strokeWidth={0.7} strokeLinecap="round" />
            <Path d={`M ${cx + headR * 0.72} ${headCy + headR * 0.28} q 3 1 4 3.4`} stroke="#FFFFFF" strokeWidth={0.7} strokeLinecap="round" />
            <Path d={`M ${cx + headR * 0.66} ${headCy + headR * 0.44} q 3 1 3.6 3.2`} stroke="#FFFFFF" strokeWidth={0.7} strokeLinecap="round" />
          </G>
          {/* faint tabby-ish forehead markings for a touch of real cat texture */}
          <G opacity={0.16}>
            <Path d={`M ${cx} ${headCy - headR * 0.75} q 0 ${headR * 0.3} 0 ${headR * 0.5}`} stroke={COAT_GREY_SHADE} strokeWidth={1.4} strokeLinecap="round" />
            <Path d={`M ${cx - headR * 0.28} ${headCy - headR * 0.65} q -1 ${headR * 0.28} -1.5 ${headR * 0.42}`} stroke={COAT_GREY_SHADE} strokeWidth={1.1} strokeLinecap="round" />
            <Path d={`M ${cx + headR * 0.28} ${headCy - headR * 0.65} q 1 ${headR * 0.28} 1.5 ${headR * 0.42}`} stroke={COAT_GREY_SHADE} strokeWidth={1.1} strokeLinecap="round" />
          </G>

          {/* Scottish Fold ears — small and rounded, folded forward against the head (not pointy), now with a soft inner-ear patch */}
          <Path d={`M ${cx - headR * 0.75} ${headCy - headR * 0.7} q -2 -7 6 -7 q 5 1 3 6 q -3 4 -9 1 z`} fill="url(#earFold)" />
          <Path d={`M ${cx - headR * 0.72} ${headCy - headR * 0.68} q -1 -3.6 3 -3.9 q 2 0.5 1.3 3 q -1.6 2 -4.3 0.9 z`} fill="url(#earInner)" opacity={0.85} />
          <Path d={`M ${cx + headR * 0.75} ${headCy - headR * 0.7} q 2 -7 -6 -7 q -5 1 -3 6 q 3 4 9 1 z`} fill="url(#earFold)" />
          <Path d={`M ${cx + headR * 0.72} ${headCy - headR * 0.68} q 1 -3.6 -3 -3.9 q -2 0.5 -1.3 3 q 1.6 2 4.3 0.9 z`} fill="url(#earInner)" opacity={0.85} />

          {showWhiskers && (
            <G opacity={0.65}>
              {/* whisker pad dots at the base of each set, then the whiskers themselves */}
              <Circle cx={cx - headR * 0.55} cy={headCy + 4} r={0.5} fill="#7A7A7A" />
              <Circle cx={cx - headR * 0.55} cy={headCy + 8} r={0.5} fill="#7A7A7A" />
              <Circle cx={cx + headR * 0.55} cy={headCy + 4} r={0.5} fill="#7A7A7A" />
              <Circle cx={cx + headR * 0.55} cy={headCy + 8} r={0.5} fill="#7A7A7A" />
              <Path d={`M ${cx - headR * 0.55} ${headCy + 4} l -14 -3`} stroke="#8B8B8B" strokeWidth={1} strokeLinecap="round" />
              <Path d={`M ${cx - headR * 0.55} ${headCy + 8} l -14 1`} stroke="#8B8B8B" strokeWidth={1} strokeLinecap="round" />
              <Path d={`M ${cx + headR * 0.55} ${headCy + 4} l 14 -3`} stroke="#8B8B8B" strokeWidth={1} strokeLinecap="round" />
              <Path d={`M ${cx + headR * 0.55} ${headCy + 8} l 14 1`} stroke="#8B8B8B" strokeWidth={1} strokeLinecap="round" />
            </G>
          )}

          {/* nose with a small highlight instead of one flat triangle */}
          <Path d={`M ${cx - 2.4} ${headCy + 5} l 4.8 0 l -2.4 3 z`} fill="url(#noseGrad)" />
          <Path d={`M ${cx - 1} ${headCy + 5.6} l 0.9 0.6`} stroke="#FFFFFF" strokeWidth={0.5} strokeLinecap="round" opacity={0.6} />
          {/* a soft philtrum line beneath the nose grounds it on the muzzle */}
          <Path d={`M ${cx} ${headCy + 8} l 0 2.2`} stroke="#8B8B8B" strokeWidth={0.5} strokeLinecap="round" opacity={0.4} />

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
