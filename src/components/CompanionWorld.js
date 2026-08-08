import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  Canvas,
  Group,
  Circle,
  Oval,
  Rect,
  Path,
  RadialGradient,
  LinearGradient,
  BlurMask,
  vec,
} from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import Companion from './CompanionExpressions';
import { getSkyState, celestialPosition } from '../utils/companionWorldTime';

const VB_W = 320;
const BASE_VB_H = 200;
const REFRESH_MS = 5 * 60 * 1000; // recheck the clock every 5 minutes — a garden, not a stopwatch

// Rewritten on React Native Skia (was react-native-svg + Animated.View
// overlays). Everything — sky, ground, clouds, stars, fireflies — now
// lives in one Canvas instead of an SVG layer plus a stack of separate
// Animated.Views on top of it, which is both the correct way to do this in
// Skia and what lets the cloud/star/firefly motion share the same GPU
// surface as the painted scene instead of compositing separate layers.

function lightenHex(hex, amount) {
  if (!hex || hex[0] !== '#') return hex;
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function ellipseRect(cx, cy, rx, ry) {
  return { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 };
}

function Star({ cx, cy, r, delay }) {
  // a slow 0->1->0 shimmer, phase-shifted per star via `delay` so they don't
  // all twinkle in lockstep
  const loop = useSharedValue(0);
  useEffect(() => {
    loop.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1, false);
  }, [loop]);
  const opacity = useDerivedValue(() => {
    const t = (loop.value + delay) % 1;
    const wave = t < 0.5 ? t * 2 : (1 - t) * 2;
    return 0.25 + wave * 0.75;
  });
  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={cy} r={r} color="#FFFFFF" />
      <Circle cx={cx} cy={cy} r={r * 2.2} color="#FFFFFF" opacity={0.25}>
        <BlurMask blur={r} style="normal" />
      </Circle>
    </Group>
  );
}

function Cloud({ x, y, scale, duration, seed }) {
  const loop = useSharedValue(0);
  useEffect(() => {
    loop.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
  }, [loop, duration]);
  const transform = useDerivedValue(() => [{ translateX: (loop.value - 0.5) * 60 }, { scale }]);
  return (
    <Group transform={[{ translateX: x, translateY: y }]}>
      <Group transform={transform}>
        <Oval {...ellipseRect(30, 18, 28, 9)} color="#FFFFFF" opacity={0.18}>
          <BlurMask blur={4} style="normal" />
        </Oval>
        <Group>
          <Oval {...ellipseRect(16, 17, 14, 8.5)} color="#FFFFFF">
            <LinearGradient start={vec(16, 8.5)} end={vec(16, 25.5)} colors={['#FFFFFF', '#DCE6F0']} />
          </Oval>
          <Oval {...ellipseRect(27, 12, 12, 9)} color="#FFFFFF">
            <LinearGradient start={vec(27, 3)} end={vec(27, 21)} colors={['#FFFFFF', '#DCE6F0']} />
          </Oval>
          <Oval {...ellipseRect(39, 15, 13, 8)} color="#FFFFFF">
            <LinearGradient start={vec(39, 7)} end={vec(39, 23)} colors={['#FFFFFF', '#DCE6F0']} />
          </Oval>
          <Oval {...ellipseRect(50, 18, 10, 6.5)} color="#FFFFFF">
            <LinearGradient start={vec(50, 11.5)} end={vec(50, 24.5)} colors={['#FFFFFF', '#DCE6F0']} />
          </Oval>
        </Group>
        <Oval {...ellipseRect(30, 22, 22, 4.5)} color="#C7D6E4" opacity={0.35} />
      </Group>
    </Group>
  );
}

function Flower({ x, y, color, scale = 1, lean = 0, phase = 0 }) {
  // gentle wind sway layered on top of the static per-flower lean, pivoting
  // at the stem base so it reads as bending in a breeze rather than
  // spinning in place
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2800 + (phase % 4) * 260, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, phase]);
  const sway = useDerivedValue(() => [{ rotate: (t.value - 0.5) * 0.12 }]);
  return (
    <Group transform={[{ translateX: x, translateY: y }, { rotate: (lean * Math.PI) / 180 }, { scale }]}>
      <Group transform={sway} origin={vec(0, 6.2)}>
        <Oval {...ellipseRect(0, 6.4, 2.6, 0.8)} color="#000000" opacity={0.12} />
        <Path path="M 0 0 Q -0.8 3.5 0 6.2" color="#4C7A3E" style="stroke" strokeWidth={1.2} strokeCap="round" />
        <Path path="M -0.3 3.2 Q -3.2 3 -3.6 1.4 Q -1 0.6 -0.1 2.6 Z" color="#5C8A4E" />
        {[0, 72, 144, 216, 288].map((deg) => (
          <Group key={deg} transform={[{ rotate: (deg * Math.PI) / 180 }]}>
            <Oval {...ellipseRect(0, -4, 2.1, 3.2)} color={color} opacity={0.95} />
          </Group>
        ))}
        <Circle cx={0} cy={0} r={2.2} color={color} opacity={0.35} />
        <Circle cx={0} cy={0} r={1.5} color="#FFE9A8" />
        <Circle cx={-0.4} cy={-0.4} r={0.5} color="#FFF6DE" />
      </Group>
    </Group>
  );
}

function GrassTuft({ x, y, color, scale = 1, phase = 0 }) {
  // small wind wobble, phase-shifted per tuft (via the index passed in as
  // `phase`) so a whole row of grass doesn't sway in perfect unison
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2400 + (phase % 6) * 200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, phase]);
  const sway = useDerivedValue(() => [{ rotate: (t.value - 0.5) * 0.16 }]);
  return (
    <Group transform={[{ translateX: x, translateY: y }, { scale }]}>
      <Group transform={sway}>
        <Path path="M 0 0 Q -2.4 -4.5 -1 -7.5" color={color} style="stroke" strokeWidth={0.8} strokeCap="round" opacity={0.85} />
        <Path path="M 0 0 Q 0.2 -5.5 0.3 -8.5" color={color} style="stroke" strokeWidth={0.9} strokeCap="round" opacity={0.9} />
        <Path path="M 0 0 Q 2.6 -4 1.4 -7" color={color} style="stroke" strokeWidth={0.8} strokeCap="round" opacity={0.85} />
      </Group>
    </Group>
  );
}

// A soft particle drifting slowly across a small patch of sky — falling
// petals by day, faint floating dust/motes by night. Purely ambient (not
// gated by growth stage), so the scene has some motion even at stage 1.
function DriftParticle({ x, y, size, color, duration, delay, travelX = 16, travelY = 38, blur = 0 }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
  }, [t, duration]);
  const transform = useDerivedValue(() => {
    const tt = (t.value + delay) % 1;
    return [
      { translateX: (tt - 0.5) * travelX },
      { translateY: tt * travelY - travelY / 2 },
      { rotate: tt * Math.PI * 1.4 },
    ];
  });
  const opacity = useDerivedValue(() => {
    const tt = (t.value + delay) % 1;
    const fade = tt < 0.15 ? tt / 0.15 : tt > 0.85 ? (1 - tt) / 0.15 : 1;
    return Math.max(0, Math.min(1, fade)) * 0.75;
  });
  return (
    <Group transform={[{ translateX: x, translateY: y }]}>
      <Group transform={transform} opacity={opacity}>
        <Oval {...ellipseRect(0, 0, size, size * 0.62)} color={color}>
          {blur > 0 && <BlurMask blur={blur} style="normal" />}
        </Oval>
      </Group>
    </Group>
  );
}

// Two thin wing strokes that flap while the whole bird glides left-to-right
// across the sky — day only, unconditional (not stage-gated) for a bit of
// unmistakable, always-visible motion.
function Bird({ y, duration, delay, scale = 1, color = '#4A4A5E' }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
  }, [t, duration]);
  const flightTransform = useDerivedValue(() => {
    const tt = (t.value + delay) % 1;
    return [
      { translateX: -24 + tt * (VB_W + 48) },
      { translateY: Math.sin(tt * Math.PI * 8) * 3 },
      { scale },
    ];
  });
  const flightOpacity = useDerivedValue(() => {
    const tt = (t.value + delay) % 1;
    const fade = tt < 0.06 ? tt / 0.06 : tt > 0.94 ? (1 - tt) / 0.06 : 1;
    return Math.max(0, Math.min(1, fade));
  });
  const leftWing = useDerivedValue(() => [{ rotate: Math.sin(((t.value + delay) % 1) * Math.PI * 18) * 0.6 }]);
  const rightWing = useDerivedValue(() => [{ rotate: -Math.sin(((t.value + delay) % 1) * Math.PI * 18) * 0.6 }]);
  return (
    <Group transform={[{ translateY: y }]}>
      <Group transform={flightTransform} opacity={flightOpacity}>
        <Group transform={leftWing} origin={vec(0, 0)}>
          <Path path="M 0 0 Q -4 -3 -7.5 -0.3" color={color} style="stroke" strokeWidth={1.1} strokeCap="round" />
        </Group>
        <Group transform={rightWing} origin={vec(0, 0)}>
          <Path path="M 0 0 Q 4 -3 7.5 -0.3" color={color} style="stroke" strokeWidth={1.1} strokeCap="round" />
        </Group>
      </Group>
    </Group>
  );
}

// A slow expanding, fading ring on the pond's surface, standing in for a
// gentle ripple — a couple of these staggered by `delay` keeps the water
// from looking static.
function PondRipple({ cx, cy, rx, ry, color, delay = 0, duration = 3600 }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.quad) }), -1, false);
  }, [t]);
  const rippleTransform = useDerivedValue(() => {
    const tt = (t.value + delay) % 1;
    return [{ scale: 0.25 + tt * 0.85 }];
  });
  const rippleOpacity = useDerivedValue(() => {
    const tt = (t.value + delay) % 1;
    return Math.max(0, 0.32 * (1 - tt));
  });
  return (
    <Group transform={[{ translateX: cx, translateY: cy }]}>
      <Group transform={rippleTransform} opacity={rippleOpacity}>
        <Oval {...ellipseRect(0, 0, rx, ry)} color={color} style="stroke" strokeWidth={0.9} />
      </Group>
    </Group>
  );
}

function FireflyOrButterfly({ night, x, y, color, delay, duration = 4200 }) {
  const loop = useSharedValue(0);
  useEffect(() => {
    loop.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
  }, [loop, duration]);
  const transform = useDerivedValue(() => {
    const t = (loop.value + delay) % 1;
    return [
      { translateX: (t - 0.5) * 26 },
      { translateY: Math.sin(t * Math.PI * 2) * -10 },
    ];
  });
  const opacity = useDerivedValue(() => {
    const t = (loop.value + delay) % 1;
    return night ? 0.5 + t * 0.5 : 1;
  });

  return (
    <Group transform={[{ translateX: x, translateY: y }]}>
      <Group transform={transform} opacity={opacity}>
        {night ? (
          <Group>
            <Circle cx={0} cy={0} r={7} color="#FFE49A" opacity={0.28}>
              <BlurMask blur={4} style="normal" />
            </Circle>
            <Circle cx={0} cy={0} r={2} color="#FFF3C4" />
          </Group>
        ) : (
          <Group>
            <Path path="M 0 0 q -5.2 -6.4 -5.2 0.2 q 5.2 4.2 5.2 -0.2 z" color={color} opacity={0.92} />
            <Path path="M 0 0 q 5.2 -6.4 5.2 0.2 q -5.2 4.2 -5.2 -0.2 z" color={color} opacity={0.92} />
            <Path path="M 0 -2.9 Q 0 0 0 3.5" color="#4A3A2E" style="stroke" strokeWidth={0.7} strokeCap="round" />
          </Group>
        )}
      </Group>
    </Group>
  );
}

export default function CompanionWorld({ stage = 1, mood = 'content', accentColor = '#FF8A00', width, height, borderRadius = 20, catBottomOffset = 0.06, catSizeRatio = 0.4 }) {
  const [sky, setSky] = useState(() => getSkyState());

  useEffect(() => {
    const id = setInterval(() => setSky(getSkyState()), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const w = width;
  const h = height ?? (w * BASE_VB_H) / VB_W;
  const VB_H = (VB_W * h) / w;
  const night = sky.period === 'night';
  const pos = celestialPosition(sky.progress);
  const sunX = pos.x * VB_W;
  const sunY = pos.y * VB_H * 0.62;

  const groundColor = night ? '#33415C' : sky.period === 'day' ? '#7CC576' : '#8FB56B';
  const groundShadeColor = night ? '#293450' : sky.period === 'day' ? '#68AE5E' : '#79A159';

  // slow breathing glow around the sun/moon so it doesn't sit dead-still
  const glowPulse = useSharedValue(0);
  useEffect(() => {
    glowPulse.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [glowPulse]);
  const glowR = useDerivedValue(() => 28 + glowPulse.value * 6);
  const glowOpacity = useDerivedValue(() => 0.34 + glowPulse.value * 0.14);

  const stars = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        cx: ((i * 37 + 13) % (VB_W - 10)) + 5,
        cy: ((i * 53 + 7) % (VB_H * 0.55)) + 6,
        r: 1 + (i % 3) * 0.5,
        delay: (i % 5) / 5,
      })),
    [VB_H]
  );

  const clouds = useMemo(
    () => [
      { x: VB_W * 0.1, y: VB_H * 0.22, scale: 0.9, duration: 14000 },
      { x: VB_W * 0.58, y: VB_H * 0.15, scale: 0.7, duration: 18000 },
    ],
    [VB_H]
  );

  // day-only birds gliding across the sky, and small ambient drift
  // particles (petals drifting near the garden by day, soft dust higher in
  // the sky by night) — both unconditional on growth stage so the scene
  // has some life even at stage 1
  const birds = useMemo(
    () => [
      { y: VB_H * 0.3, duration: 9000, delay: 0, scale: 0.8 },
      { y: VB_H * 0.4, duration: 12000, delay: 0.45, scale: 0.6 },
    ],
    [VB_H]
  );
  // Day petals hover low, near the flowerbed/grass line, not up in the open
  // sky — otherwise they read as stray flowers floating near the clouds
  // instead of petals drifting through the garden. Night dust stays higher
  // up, among the stars, which is where it's meant to read as ambient glow.
  const driftParticles = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        x: (i * 53 + 20) % VB_W,
        dayY: VB_H * (0.66 + ((i * 11) % 16) / 100), // ~0.66-0.82, just above/at the grass line
        nightY: VB_H * (0.08 + ((i * 17) % 30) / 100), // ~0.08-0.38, upper sky among the stars
        size: 1.6 + (i % 3) * 0.5,
        duration: 6000 + (i % 4) * 1400,
        delay: (i % 6) / 6,
      })),
    [VB_H]
  );

  const flowerColors = ['#F08FB0', '#FFD166', '#F0866E', '#B48EE0'];
  const flowerSpots = useMemo(
    () => [
      { x: VB_W * 0.16, y: VB_H * 0.87 },
      { x: VB_W * 0.26, y: VB_H * 0.91 },
      { x: VB_W * 0.74, y: VB_H * 0.88 },
      { x: VB_W * 0.84, y: VB_H * 0.92 },
      { x: VB_W * 0.63, y: VB_H * 0.94 },
      { x: VB_W * 0.37, y: VB_H * 0.95 },
    ],
    [VB_H]
  );
  const visibleFlowerCount = Math.min(flowerSpots.length, stage);

  const grassTufts = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        x: (i * 41.7) % VB_W,
        y: VB_H * (0.8 + ((i * 13) % 17) / 100),
        scale: 0.7 + ((i * 7) % 5) / 8,
      })),
    [VB_H]
  );

  const showBush = stage >= 2;
  const showTree = stage >= 3;
  const bigTree = stage >= 5;
  const showPond = stage >= 4;
  const showFlutter = stage >= 4;
  const flutterCount = stage >= 6 ? 3 : stage >= 5 ? 2 : 1;

  const sx = w / VB_W; // design-space -> screen-space scale, so every layer (Canvas shapes and the Companion overlay) shares one source of truth

  return (
    <View style={{ width: w, height: h, borderRadius, overflow: 'hidden' }}>
      <Canvas style={{ width: w, height: h }}>
        <Group transform={[{ scale: sx }]}>
          {/* sky */}
          <Rect x={0} y={0} width={VB_W} height={VB_H} color={sky.colors.top}>
            <LinearGradient start={vec(0, 0)} end={vec(0, VB_H)} colors={[sky.colors.top, sky.colors.top, sky.colors.bottom]} positions={[0, 0.55, 1]} />
          </Rect>
          <Rect x={0} y={VB_H * 0.55} width={VB_W} height={VB_H * 0.3} color={sky.colors.bottom} opacity={0.25} />

          {/* glow + sun/moon */}
          <Circle cx={sunX} cy={sunY} r={glowR} color={sky.colors.glow} opacity={glowOpacity}>
            <BlurMask blur={10} style="normal" />
          </Circle>
          <Circle cx={sunX} cy={sunY} r={12} color={sky.colors.sunColor}>
            <RadialGradient c={vec(sunX - 12 * 0.24, sunY - 12 * 0.3)} r={12 * 1.2} colors={[lightenHex(sky.colors.sunColor, 30), sky.colors.sunColor, lightenHex(sky.colors.sunColor, -25)]} />
          </Circle>
          {night && <Circle cx={sunX + 4.5} cy={sunY - 2} r={10} color={sky.colors.top} />}
          {night && (
            <Circle cx={sunX - 1.5} cy={sunY - 1} r={11.2} color="transparent" style="stroke" strokeWidth={0.6}>
              {/* rendered as a plain stroke ring — kept as a separate Circle so it never fills */}
            </Circle>
          )}

          {/* hill / ground */}
          <Path
            path={`M 0 ${VB_H * 0.82} Q ${VB_W * 0.25} ${VB_H * 0.72} ${VB_W * 0.5} ${VB_H * 0.8} T ${VB_W} ${VB_H * 0.78} L ${VB_W} ${VB_H} L 0 ${VB_H} Z`}
            color={groundColor}
          >
            <LinearGradient start={vec(0, VB_H * 0.72)} end={vec(0, VB_H)} colors={[lightenHex(groundColor, 14), groundColor, groundShadeColor]} positions={[0, 0.45, 1]} />
          </Path>
          <Path
            path={`M 0 ${VB_H * 0.9} Q ${VB_W * 0.3} ${VB_H * 0.84} ${VB_W * 0.6} ${VB_H * 0.9} T ${VB_W} ${VB_H * 0.88} L ${VB_W} ${VB_H} L 0 ${VB_H} Z`}
            color={groundShadeColor}
          >
            <LinearGradient start={vec(0, VB_H * 0.84)} end={vec(0, VB_H)} colors={[groundShadeColor, lightenHex(groundShadeColor, -12)]} />
          </Path>
          <Path
            path={`M 0 ${VB_H * 0.82} Q ${VB_W * 0.25} ${VB_H * 0.72} ${VB_W * 0.5} ${VB_H * 0.8} T ${VB_W} ${VB_H * 0.78}`}
            color={groundShadeColor}
            style="stroke"
            strokeWidth={1}
            opacity={0.35}
          />

          {showPond && (
            <Group>
              <Oval {...ellipseRect(VB_W * 0.5, VB_H * 0.945, 30, 8.5)} color="#000000" opacity={0.08} />
              <Oval {...ellipseRect(VB_W * 0.5, VB_H * 0.93, 26, 7)} color={night ? '#26385E' : '#8FD6E8'}>
                <RadialGradient c={vec(VB_W * 0.5, VB_H * 0.93 - 2)} r={26} colors={night ? ['#3E5A86', '#26385E', '#1C2C4C'] : ['#BFEFF5', '#8FD6E8', '#5BB6CE']} />
              </Oval>
              <Oval {...ellipseRect(VB_W * 0.5, VB_H * 0.93, 26, 7)} color="transparent" style="stroke" strokeWidth={1} />
              <PondRipple cx={VB_W * 0.46} cy={VB_H * 0.93} rx={6} ry={1.8} color={night ? '#7FA6D6' : '#FFFFFF'} delay={0} />
              <PondRipple cx={VB_W * 0.56} cy={VB_H * 0.928} rx={5} ry={1.5} color={night ? '#7FA6D6' : '#FFFFFF'} delay={0.5} duration={4200} />
              <Oval {...ellipseRect(VB_W * 0.44, VB_H * 0.925, 7, 2)} color={night ? '#5A7CB0' : '#FFFFFF'} style="stroke" strokeWidth={0.7} opacity={0.5} />
              <Oval {...ellipseRect(VB_W * 0.58, VB_H * 0.935, 5, 1.4)} color={night ? '#5A7CB0' : '#FFFFFF'} style="stroke" strokeWidth={0.6} opacity={0.4} />
              {!night && <Oval {...ellipseRect(VB_W * 0.46, VB_H * 0.918, 9, 1.6)} color="#FFFFFF" opacity={0.35} />}
              <Oval {...ellipseRect(VB_W * 0.61, VB_H * 0.935, 3.4, 1.6)} color={night ? '#274A34' : '#3E8A4C'} opacity={0.9} />
              <Oval {...ellipseRect(VB_W * 0.4, VB_H * 0.94, 2.6, 1.2)} color={night ? '#274A34' : '#3E8A4C'} opacity={0.85} />
            </Group>
          )}

          {showBush && (
            <Group>
              <Oval {...ellipseRect(VB_W * 0.12, VB_H * 0.845, 15, 5)} color="#000000" opacity={0.1} />
              <Oval {...ellipseRect(VB_W * 0.12, VB_H * 0.82, 14, 10)} color={night ? '#2E5A3C' : '#4E9457'}>
                <RadialGradient c={vec(VB_W * 0.12 - 3, VB_H * 0.82 - 4)} r={16} colors={night ? ['#3E7250', '#2E5A3C', '#1E3E28'] : ['#71C679', '#4E9457', '#377240']} />
              </Oval>
              <Circle cx={VB_W * 0.12 - 6} cy={VB_H * 0.82 - 4} r={6} color={night ? '#2E5A3C' : '#4E9457'} opacity={0.9} />
              <Circle cx={VB_W * 0.12 + 7} cy={VB_H * 0.82 - 2} r={6.5} color={night ? '#2E5A3C' : '#4E9457'} opacity={0.9} />
              {!night && <Circle cx={VB_W * 0.12 - 4} cy={VB_H * 0.82 - 7} r={1.6} color="#FFFFFF" opacity={0.25} />}
            </Group>
          )}

          {showTree && (
            <Group>
              <Oval {...ellipseRect(VB_W * 0.88, VB_H * 0.885, bigTree ? 15 : 9, 3.4)} color="#000000" opacity={0.12} />
              <Path
                path={`M ${VB_W * 0.88} ${VB_H * 0.88} l 0 ${bigTree ? -22 : -14}`}
                color="#7A5A3A"
                style="stroke"
                strokeWidth={bigTree ? 4.2 : 3.2}
                strokeCap="round"
              />
              <Path
                path={`M ${VB_W * 0.88 - 0.6} ${VB_H * 0.88 - 3} l 0 ${bigTree ? -14 : -8}`}
                color="#5E4227"
                style="stroke"
                strokeWidth={0.6}
                strokeCap="round"
                opacity={0.5}
              />
              <Group>
                <Circle cx={VB_W * 0.88} cy={VB_H * 0.88 - (bigTree ? 26 : 16)} r={bigTree ? 16 : 11} color={night ? '#2E5A3C' : '#4E9457'}>
                  <RadialGradient c={vec(VB_W * 0.88 - (bigTree ? 6 : 4), VB_H * 0.88 - (bigTree ? 26 : 16) - 4)} r={bigTree ? 20 : 14} colors={night ? ['#3E7250', '#2E5A3C', '#1E3E28'] : ['#71C679', '#4E9457', '#377240']} />
                </Circle>
                <Circle cx={VB_W * 0.88 - (bigTree ? 9 : 6)} cy={VB_H * 0.88 - (bigTree ? 20 : 12)} r={bigTree ? 10 : 6.5} color={night ? '#2E5A3C' : '#4E9457'} opacity={0.95} />
                <Circle cx={VB_W * 0.88 + (bigTree ? 10 : 6.5)} cy={VB_H * 0.88 - (bigTree ? 22 : 13)} r={bigTree ? 9.5 : 6} color={night ? '#2E5A3C' : '#4E9457'} opacity={0.95} />
                {bigTree && <Circle cx={VB_W * 0.88 + 2} cy={VB_H * 0.88 - 36} r={9} color={night ? '#2E5A3C' : '#4E9457'} opacity={0.95} />}
                {!night && (
                  <Circle cx={VB_W * 0.88 - (bigTree ? 6 : 4)} cy={VB_H * 0.88 - (bigTree ? 32 : 20)} r={bigTree ? 4.5 : 3} color="#FFFFFF" opacity={0.18} />
                )}
              </Group>
              {bigTree && !night && (
                <Group>
                  <Circle cx={VB_W * 0.88 - 5} cy={VB_H * 0.88 - 20} r={3} color="#FFE49A" opacity={0.9} />
                  <Circle cx={VB_W * 0.88 + 6} cy={VB_H * 0.88 - 30} r={3} color="#FFE49A" opacity={0.9} />
                </Group>
              )}
            </Group>
          )}

          {grassTufts
            .filter((g) => !(showPond && g.y > VB_H * 0.88 && Math.abs(g.x - VB_W * 0.5) < 30))
            .map((g, i) => (
              <GrassTuft key={i} x={g.x} y={g.y} color={i % 3 === 0 ? groundShadeColor : groundColor} scale={g.scale} phase={i} />
            ))}

          {flowerSpots.slice(0, visibleFlowerCount).map((spot, i) => (
            <Flower key={i} x={spot.x} y={spot.y} color={flowerColors[i % flowerColors.length]} lean={(i % 2 === 0 ? 1 : -1) * (4 + (i % 3) * 3)} phase={i} />
          ))}

          {night
            ? stars.map((s, i) => <Star key={i} cx={s.cx} cy={s.cy} r={s.r} delay={s.delay} />)
            : clouds.map((c, i) => <Cloud key={i} x={c.x} y={c.y} scale={c.scale} duration={c.duration} seed={i} />)}

          {!night && birds.map((b, i) => <Bird key={i} y={b.y} duration={b.duration} delay={b.delay} scale={b.scale} />)}

          {driftParticles.map((p, i) => (
            <DriftParticle
              key={i}
              x={p.x}
              y={night ? p.nightY : p.dayY}
              size={p.size}
              duration={p.duration}
              delay={p.delay}
              color={night ? '#FFF3C4' : flowerColors[i % flowerColors.length]}
              blur={night ? 1.5 : 0}
              travelX={night ? 16 : 14}
              travelY={night ? 20 : 16}
            />
          ))}

          {showFlutter &&
            Array.from({ length: flutterCount }).map((_, i) => (
              <FireflyOrButterfly
                key={i}
                night={night}
                x={VB_W * (0.3 + i * 0.18)}
                y={VB_H * (0.62 + (i % 2) * 0.08)}
                color={flowerColors[i % flowerColors.length]}
                delay={i * 0.17}
              />
            ))}
        </Group>
      </Canvas>

      {/* the cat, standing on the ground — a separate overlay View (not part
          of the Skia Canvas above) so the character implementation can be
          swapped freely; currently CompanionExpressions.js (static image
          per mood + code-driven breathing), see its file header and
          src/assets/companion-expressions/README.md */}
      <View style={{ position: 'absolute', bottom: h * catBottomOffset, left: 0, right: 0, alignItems: 'center' }}>
        <Companion stage={stage} mood={mood} accentColor={accentColor} size={Math.min(180, w * catSizeRatio)} />
      </View>
    </View>
  );
}
