import React, { useMemo } from 'react';
import { View } from 'react-native';
import {
  Canvas,
  Group,
  Circle,
  Oval,
  Path,
  RadialGradient,
  LinearGradient,
  BlurMask,
  vec,
  useValue,
  useLoop,
  useComputedValue,
} from '@shopify/react-native-skia';

// A small round Scottish Fold kitten companion — light grey coat with cream
// markings, she/female (a small bow accessory unlocks at the final growth
// stage). Grows across 6 stages and wears one of a few expressions
// depending on recent activity.
//
// Rewritten on React Native Skia (was react-native-svg). Skia gives us a
// real GPU-backed canvas instead of a vector-DOM, which is what makes the
// "more realistic / soft" pass below possible: blurred halo silhouettes
// behind the crisp fur shapes (so edges feather instead of looking like a
// vector cutout), a properly layered gradient iris, soft blush, and fine
// fur-strand strokes. The coordinate system is still a 0-100 design space
// (same numbers as the old SVG viewBox) — a single outer Group scales that
// space to `size` px, so all the shape math below reads the same way it
// used to.
//
// Props (unchanged from the SVG version, so CompanionWorld/CompanionScreen
// need no changes):
//  - stage: 1-6, how grown the cat is (see companionStats.stageForLevel)
//  - mood: 'happy' | 'content' | 'sleepy' | 'new'
//  - accentColor: used only for the small bow accessory at max stage
//  - size: render size in px

const COAT_GREY = '#A6ABB3';
const COAT_GREY_SHADE = '#848993';
const COAT_GREY_LIGHT = '#C3C7CE';
const COAT_CREAM = '#F5EAD6';
const COAT_CREAM_SHADE = '#E4D4B8';
const NOSE_PINK = '#EFB0BE';
const EAR_INNER_PINK = '#E9A8AE';
const BLUSH_PINK = '#F0A6B3';
const IRIS_OUTER = '#5C7A3E'; // deeper hazel-green rim for a real iris ring
const IRIS_INNER = '#B7CE84'; // sunlit hazel-green center
const EYE_LINE = '#3A3A3A';

function lighten(hex, amount) {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Bounding-box helper: Skia's <Oval> (like <RoundedRect>) takes a top-left
// rect, not a center+radii pair like SVG's <Ellipse> — this keeps the call
// sites below looking like the old cx/cy/rx/ry code.
function ellipseRect(cx, cy, rx, ry) {
  return { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 };
}

// A soft, slightly-larger blurred duplicate placed behind a crisp shape so
// the silhouette's edge feathers into the scene instead of reading as a
// hard vector cutout — the single biggest "looks more real" lever available
// without new artwork. Reused for the body, head, and ears.
function FurHalo({ cx, cy, rx, ry, color, blur = 3.2, growth = 1.06 }) {
  const r = ellipseRect(cx, cy, rx * growth, ry * growth);
  return (
    <Oval {...r} color={color} opacity={0.55}>
      <BlurMask blur={blur} style="normal" />
    </Oval>
  );
}

function Eye({ cx, cy, scale, mood }) {
  const r = 4.1 * scale; // bigger than before — closer to real kitten proportions
  if (mood === 'sleepy') {
    return (
      <Group>
        <Path
          path={`M ${cx - r} ${cy} q ${r} ${3.6 * scale} ${r * 2} 0`}
          color={EYE_LINE}
          style="stroke"
          strokeWidth={2.2 * scale}
          strokeCap="round"
        />
        <Path
          path={`M ${cx - r + 4.5 * scale} ${cy + 0.4 * scale} l ${1.4 * scale} ${1.1 * scale}`}
          color={EYE_LINE}
          style="stroke"
          strokeWidth={1 * scale}
          strokeCap="round"
        />
      </Group>
    );
  }

  const pupilW = mood === 'happy' ? 0.85 * scale : 1.1 * scale;
  return (
    <Group>
      {/* soft lower-lid shadow first, underneath the eye, for real socket depth */}
      <Oval {...ellipseRect(cx, cy + 3.4 * scale, r * 0.92, 1.6 * scale)} color="#00000018">
        <BlurMask blur={1.4} style="normal" />
      </Oval>
      <Circle cx={cx} cy={cy} r={r} color={IRIS_OUTER}>
        <RadialGradient c={vec(cx - r * 0.25, cy - r * 0.3)} r={r * 1.3} colors={[IRIS_INNER, IRIS_OUTER]} />
      </Circle>
      <Oval {...ellipseRect(cx, cy, pupilW, r * 0.92)} color={EYE_LINE} />
      {/* two catchlights instead of one flat dot — reads as a wet, lit eye */}
      <Circle cx={cx + r * 0.32} cy={cy - r * 0.35} r={r * 0.28} color="#FFFFFF" opacity={0.95} />
      <Circle cx={cx - r * 0.28} cy={cy + r * 0.3} r={r * 0.12} color="#FFFFFF" opacity={0.55} />
      {/* upper lid crease */}
      <Path
        path={`M ${cx - r * 0.85} ${cy - r * 0.75} q ${r * 0.85} ${mood === 'happy' ? -r * 1.7 : -r * 0.5} ${r * 1.7} 0`}
        color={EYE_LINE}
        style="stroke"
        strokeWidth={mood === 'happy' ? 2.3 * scale : 0.6 * scale}
        strokeCap="round"
        opacity={mood === 'happy' ? 1 : 0.45}
      />
    </Group>
  );
}

export default function Companion({ stage = 1, mood = 'content', accentColor = '#FF8A00', size = 96 }) {
  // Skia's own animation value — a yoyo-ing 0→1→0 loop that drives the idle
  // bob, computed on the UI thread. Translation stays in real px (not the
  // 0-100 design space) so the amplitude looks the same at any `size`,
  // matching how the old Animated.View-wrapped-around-the-Svg version bobbed.
  const loop = useLoop({ duration: 1400 });
  const bobTransform = useComputedValue(() => [{ translateY: -4 * loop.current }], [loop]);

  const clampedStage = Math.max(1, Math.min(6, stage));
  const bodyScale = 0.72 + clampedStage * 0.05;
  const cx = 50;
  const cy = 58;
  const bodyRx = 32 * bodyScale;
  const bodyRy = 28 * bodyScale;
  const headR = 26 * bodyScale; // a touch bigger than the old 24 — rounder, more kitten-proportioned head
  const headCy = cy - bodyRy - headR * 0.32;

  const showWhiskers = clampedStage >= 2;
  const longerTail = clampedStage >= 3;
  const fluffierTail = clampedStage >= 4;
  const showSparkles = clampedStage >= 5;
  const showBow = clampedStage >= 6;

  // A few deterministic short fur-strand strokes across the head/body — a
  // cheap, static texture pass (no per-frame cost) that breaks up the flat
  // gradient fill and reads as actual fur rather than a smooth vector blob.
  const furStrokes = useMemo(() => {
    const strokes = [];
    const seedPoints = [
      [-0.5, -0.15], [-0.3, -0.3], [0.1, -0.35], [0.4, -0.2], [0.55, 0.05],
      [-0.55, 0.15], [0.5, 0.35], [-0.1, 0.45], [0.25, 0.4],
    ];
    seedPoints.forEach(([ox, oy], i) => {
      const px = cx + ox * bodyRx * 1.4;
      const py = cy + oy * bodyRy * 1.3;
      const len = 3 + (i % 3);
      const angle = Math.atan2(oy, ox) + 0.3;
      strokes.push({
        d: `M ${px} ${py} l ${Math.cos(angle) * len} ${Math.sin(angle) * len}`,
        opacity: 0.12 + (i % 3) * 0.03,
      });
    });
    return strokes;
  }, [cx, cy, bodyRx, bodyRy]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Canvas style={{ width: size, height: size }}>
        <Group transform={bobTransform}>
          <Group transform={[{ scale: size / 100 }]}>
            {/* soft blurred contact shadow so she reads as grounded, not pasted on */}
            <Oval {...ellipseRect(cx, cy + bodyRy - 1, bodyRx * 0.85, bodyRy * 0.16)} color="#000000" opacity={0.16}>
              <BlurMask blur={2.2} style="normal" />
            </Oval>

            {showSparkles && (
              <Group opacity={0.8}>
                <Path path="M 12 22 l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 z" color={lighten(COAT_CREAM, 5)} />
                <Path path="M 86 18 l 1.6 4 l 4 1.6 l -4 1.6 l -1.6 4 l -1.6 -4 l -4 -1.6 l 4 -1.6 z" color={lighten(COAT_CREAM, 5)} />
              </Group>
            )}

            {/* tail */}
            {longerTail ? (
              <Path
                path={
                  fluffierTail
                    ? `M ${cx + bodyRx - 4} ${cy + 8} q 22 -2 24 -22 q 4 14 -8 22 q -8 6 -16 0 z`
                    : `M ${cx + bodyRx - 4} ${cy + 8} q 16 0 16 -16 q 3 10 -6 16 q -5 3 -10 0 z`
                }
                color={COAT_GREY}
              >
                <LinearGradient start={vec(cx, cy - 10)} end={vec(cx + bodyRx + 20, cy + 20)} colors={[COAT_GREY_LIGHT, COAT_GREY, COAT_GREY_SHADE]} />
              </Path>
            ) : (
              <Oval {...ellipseRect(cx + bodyRx + 2, cy + 10, 7, 5)} color={COAT_GREY} />
            )}
            {fluffierTail && (
              <Group opacity={0.25}>
                <Path path={`M ${cx + bodyRx + 8} ${cy - 4} q 6 -2 10 -8`} color={COAT_GREY_SHADE} style="stroke" strokeWidth={2} strokeCap="round" />
                <Path path={`M ${cx + bodyRx + 4} ${cy + 2} q 8 -2 14 -10`} color={COAT_GREY_SHADE} style="stroke" strokeWidth={1.6} strokeCap="round" />
              </Group>
            )}
            {longerTail && (
              <Circle cx={fluffierTail ? cx + bodyRx + 14 : cx + bodyRx + 8} cy={fluffierTail ? cy - 16 : cy - 8} r={fluffierTail ? 6 : 4} color={COAT_CREAM}>
                <RadialGradient c={vec(fluffierTail ? cx + bodyRx + 12 : cx + bodyRx + 6, fluffierTail ? cy - 18 : cy - 10)} r={8} colors={[lighten(COAT_CREAM, 8), COAT_CREAM_SHADE]} />
              </Circle>
            )}

            {/* back paws */}
            <Oval {...ellipseRect(cx - bodyRx * 0.5, cy + bodyRy - 2, 7 * bodyScale, 5 * bodyScale)} color={COAT_CREAM} />
            <Oval {...ellipseRect(cx + bodyRx * 0.5, cy + bodyRy - 2, 7 * bodyScale, 5 * bodyScale)} color={COAT_CREAM} />
            <Path path={`M ${cx - bodyRx * 0.5 - 2 * bodyScale} ${cy + bodyRy - 3} q 2 3 4 0`} color={COAT_CREAM_SHADE} style="stroke" strokeWidth={0.6} strokeCap="round" opacity={0.7} />
            <Path path={`M ${cx + bodyRx * 0.5 - 2 * bodyScale} ${cy + bodyRy - 3} q 2 3 4 0`} color={COAT_CREAM_SHADE} style="stroke" strokeWidth={0.6} strokeCap="round" opacity={0.7} />

            {/* body — soft blurred halo first, then the crisp gradient shape on top */}
            <FurHalo cx={cx} cy={cy} rx={bodyRx} ry={bodyRy} color={COAT_GREY} />
            <Oval {...ellipseRect(cx, cy, bodyRx, bodyRy)} color={COAT_GREY}>
              <RadialGradient c={vec(cx - bodyRx * 0.24, cy - bodyRy * 0.4)} r={bodyRx * 1.1} colors={[COAT_GREY_LIGHT, COAT_GREY, COAT_GREY_SHADE]} />
            </Oval>
            <Path
              path={`M ${cx - bodyRx * 0.7} ${cy + bodyRy * 0.55} Q ${cx} ${cy + bodyRy * 0.85} ${cx + bodyRx * 0.7} ${cy + bodyRy * 0.55}`}
              color={COAT_GREY_SHADE}
              style="stroke"
              strokeWidth={bodyRy * 0.12}
              strokeCap="round"
              opacity={0.22}
            />
            <Oval {...ellipseRect(cx, cy + bodyRy * 0.35, bodyRx * 0.55, bodyRy * 0.55)} color={COAT_CREAM}>
              <RadialGradient c={vec(cx - bodyRx * 0.1, cy + bodyRy * 0.1)} r={bodyRx * 0.6} colors={[lighten(COAT_CREAM, 8), COAT_CREAM_SHADE]} />
            </Oval>

            {/* head — same halo-then-crisp treatment, biggest single readability win */}
            <FurHalo cx={cx} cy={headCy} rx={headR} ry={headR} color={COAT_GREY} blur={3.6} growth={1.08} />
            <Circle cx={cx} cy={headCy} r={headR} color={COAT_GREY}>
              <RadialGradient c={vec(cx - headR * 0.22, headCy - headR * 0.35)} r={headR * 1.15} colors={[COAT_GREY_LIGHT, COAT_GREY, COAT_GREY_SHADE]} />
            </Circle>
            <Oval {...ellipseRect(cx, headCy + headR * 0.35, headR * 0.6, headR * 0.45)} color={COAT_CREAM}>
              <RadialGradient c={vec(cx - headR * 0.1, headCy + headR * 0.2)} r={headR * 0.7} colors={[lighten(COAT_CREAM, 8), COAT_CREAM_SHADE]} />
            </Oval>

            {/* soft pink blush — the single fastest "cute" signal on a kitten face */}
            <Oval {...ellipseRect(cx - headR * 0.62, headCy + headR * 0.42, headR * 0.22, headR * 0.13)} color={BLUSH_PINK} opacity={0.4}>
              <BlurMask blur={2.4} style="normal" />
            </Oval>
            <Oval {...ellipseRect(cx + headR * 0.62, headCy + headR * 0.42, headR * 0.22, headR * 0.13)} color={BLUSH_PINK} opacity={0.4}>
              <BlurMask blur={2.4} style="normal" />
            </Oval>

            {/* cheek tufts */}
            <Group opacity={0.5}>
              <Path path={`M ${cx - headR * 0.72} ${headCy + headR * 0.28} q -3 1 -4 3.4`} color="#FFFFFF" style="stroke" strokeWidth={0.7} strokeCap="round" />
              <Path path={`M ${cx - headR * 0.66} ${headCy + headR * 0.44} q -3 1 -3.6 3.2`} color="#FFFFFF" style="stroke" strokeWidth={0.7} strokeCap="round" />
              <Path path={`M ${cx + headR * 0.72} ${headCy + headR * 0.28} q 3 1 4 3.4`} color="#FFFFFF" style="stroke" strokeWidth={0.7} strokeCap="round" />
              <Path path={`M ${cx + headR * 0.66} ${headCy + headR * 0.44} q 3 1 3.6 3.2`} color="#FFFFFF" style="stroke" strokeWidth={0.7} strokeCap="round" />
            </Group>

            {/* faint tabby-ish forehead markings */}
            <Group opacity={0.16}>
              <Path path={`M ${cx} ${headCy - headR * 0.75} q 0 ${headR * 0.3} 0 ${headR * 0.5}`} color={COAT_GREY_SHADE} style="stroke" strokeWidth={1.4} strokeCap="round" />
              <Path path={`M ${cx - headR * 0.28} ${headCy - headR * 0.65} q -1 ${headR * 0.28} -1.5 ${headR * 0.42}`} color={COAT_GREY_SHADE} style="stroke" strokeWidth={1.1} strokeCap="round" />
              <Path path={`M ${cx + headR * 0.28} ${headCy - headR * 0.65} q 1 ${headR * 0.28} 1.5 ${headR * 0.42}`} color={COAT_GREY_SHADE} style="stroke" strokeWidth={1.1} strokeCap="round" />
            </Group>

            {/* fine fur-strand texture over the body — static, deterministic */}
            <Group>
              {furStrokes.map((s, i) => (
                <Path key={i} path={s.d} color={COAT_GREY_SHADE} style="stroke" strokeWidth={0.5} strokeCap="round" opacity={s.opacity} />
              ))}
            </Group>

            {/* Scottish Fold ears — folded forward, rounded, not pointy */}
            <Path path={`M ${cx - headR * 0.75} ${headCy - headR * 0.7} q -2 -7 6 -7 q 5 1 3 6 q -3 4 -9 1 z`} color={COAT_GREY_SHADE}>
              <LinearGradient start={vec(cx - headR * 0.85, headCy - headR * 0.8)} end={vec(cx - headR * 0.6, headCy - headR * 0.62)} colors={[lighten(COAT_GREY_SHADE, 12), COAT_GREY_SHADE]} />
            </Path>
            <Path path={`M ${cx - headR * 0.72} ${headCy - headR * 0.68} q -1 -3.6 3 -3.9 q 2 0.5 1.3 3 q -1.6 2 -4.3 0.9 z`} color={EAR_INNER_PINK} opacity={0.85}>
              <RadialGradient c={vec(cx - headR * 0.72, headCy - headR * 0.72)} r={4} colors={[lighten(EAR_INNER_PINK, 12), EAR_INNER_PINK]} />
            </Path>
            <Path path={`M ${cx + headR * 0.75} ${headCy - headR * 0.7} q 2 -7 -6 -7 q -5 1 -3 6 q 3 4 9 1 z`} color={COAT_GREY_SHADE}>
              <LinearGradient start={vec(cx + headR * 0.85, headCy - headR * 0.8)} end={vec(cx + headR * 0.6, headCy - headR * 0.62)} colors={[lighten(COAT_GREY_SHADE, 12), COAT_GREY_SHADE]} />
            </Path>
            <Path path={`M ${cx + headR * 0.72} ${headCy - headR * 0.68} q 1 -3.6 -3 -3.9 q -2 0.5 -1.3 3 q 1.6 2 4.3 0.9 z`} color={EAR_INNER_PINK} opacity={0.85}>
              <RadialGradient c={vec(cx + headR * 0.72, headCy - headR * 0.72)} r={4} colors={[lighten(EAR_INNER_PINK, 12), EAR_INNER_PINK]} />
            </Path>

            {showWhiskers && (
              <Group opacity={0.65}>
                <Circle cx={cx - headR * 0.55} cy={headCy + 4} r={0.5} color="#7A7A7A" />
                <Circle cx={cx - headR * 0.55} cy={headCy + 8} r={0.5} color="#7A7A7A" />
                <Circle cx={cx + headR * 0.55} cy={headCy + 4} r={0.5} color="#7A7A7A" />
                <Circle cx={cx + headR * 0.55} cy={headCy + 8} r={0.5} color="#7A7A7A" />
                <Path path={`M ${cx - headR * 0.55} ${headCy + 4} l -14 -3`} color="#8B8B8B" style="stroke" strokeWidth={1} strokeCap="round" />
                <Path path={`M ${cx - headR * 0.55} ${headCy + 8} l -14 1`} color="#8B8B8B" style="stroke" strokeWidth={1} strokeCap="round" />
                <Path path={`M ${cx + headR * 0.55} ${headCy + 4} l 14 -3`} color="#8B8B8B" style="stroke" strokeWidth={1} strokeCap="round" />
                <Path path={`M ${cx + headR * 0.55} ${headCy + 8} l 14 1`} color="#8B8B8B" style="stroke" strokeWidth={1} strokeCap="round" />
              </Group>
            )}

            {/* small heart-leaning nose instead of a flat triangle — softer, more realistic */}
            <Path path={`M ${cx - 2.6} ${headCy + 5} q -0.6 -1.6 1.3 -1.6 q 1.3 0 1.3 1.2 q 0 -1.2 1.3 -1.2 q 1.9 0 1.3 1.6 q -0.6 1.6 -2.6 3.2 q -2 -1.6 -2.6 -3.2 z`} color={NOSE_PINK}>
              <RadialGradient c={vec(cx - 1, headCy + 4.4)} r={4} colors={[lighten(NOSE_PINK, 15), NOSE_PINK]} />
            </Path>
            <Circle cx={cx - 1} cy={headCy + 5.4} r={0.5} color="#FFFFFF" opacity={0.6} />
            <Path path={`M ${cx} ${headCy + 8} l 0 2.2`} color="#8B8B8B" style="stroke" strokeWidth={0.5} strokeCap="round" opacity={0.4} />

            {showBow && (
              <Group>
                <Path path={`M ${cx - headR * 0.62} ${headCy - headR * 0.55} l -6 -4 l 1 5 l -1 5 l 6 -4 z`} color={accentColor} />
                <Path path={`M ${cx - headR * 0.62} ${headCy - headR * 0.55} l 6 -4 l -1 5 l 1 5 l -6 -4 z`} color={accentColor} />
                <Circle cx={cx - headR * 0.62} cy={headCy - headR * 0.55} r={2} color={lighten(accentColor, 40)} />
              </Group>
            )}

            <Eye cx={cx - 8.5 * bodyScale} cy={headCy - 2 * bodyScale} scale={bodyScale} mood={mood} />
            <Eye cx={cx + 8.5 * bodyScale} cy={headCy - 2 * bodyScale} scale={bodyScale} mood={mood} />

            {/* mouth — kept as a simple shared shape rather than duplicated per-mood inside Eye */}
            <Path
              path={
                mood === 'sleepy'
                  ? `M ${cx} ${headCy + 6 * bodyScale} q ${-3 * bodyScale} ${3 * bodyScale} ${-5.5 * bodyScale} ${0.8 * bodyScale} M ${cx} ${headCy + 6 * bodyScale} q ${3 * bodyScale} ${3 * bodyScale} ${5.5 * bodyScale} ${0.8 * bodyScale}`
                  : mood === 'happy'
                  ? `M ${cx} ${headCy + 6 * bodyScale} q ${-4.5 * bodyScale} ${5 * bodyScale} ${-8 * bodyScale} ${1 * bodyScale} M ${cx} ${headCy + 6 * bodyScale} q ${4.5 * bodyScale} ${5 * bodyScale} ${8 * bodyScale} ${1 * bodyScale}`
                  : `M ${cx} ${headCy + 6 * bodyScale} q ${-4 * bodyScale} ${4 * bodyScale} ${-7 * bodyScale} ${1 * bodyScale} M ${cx} ${headCy + 6 * bodyScale} q ${4 * bodyScale} ${4 * bodyScale} ${7 * bodyScale} ${1 * bodyScale}`
              }
              color={EYE_LINE}
              style="stroke"
              strokeWidth={1.6 * bodyScale}
              strokeCap="round"
              strokeJoin="round"
            />
          </Group>
        </Group>
      </Canvas>
    </View>
  );
}
