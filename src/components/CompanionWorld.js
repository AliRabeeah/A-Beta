import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Ellipse, Path, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay, Easing } from 'react-native-reanimated';
import Companion from './Companion';
import { getSkyState, celestialPosition } from '../utils/companionWorldTime';

const VB_W = 320;
const BASE_VB_H = 200;
const REFRESH_MS = 5 * 60 * 1000; // recheck the clock every 5 minutes — a garden, not a stopwatch

function Twinkle({ cx, cy, r, delay, children }) {
  const opacity = useSharedValue(0.25);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 1500 }), withTiming(0.25, { duration: 1500 })), -1, true)
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ position: 'absolute', left: cx - r, top: cy - r }, style]}>{children}</Animated.View>;
}

function Cloud({ startX, y, scale, duration }) {
  const x = useSharedValue(startX);
  useEffect(() => {
    x.value = withRepeat(withTiming(startX + 60, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - startX }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: startX, top: y }, style]}>
      <Svg width={60 * scale} height={26 * scale} viewBox="0 0 60 26">
        <Ellipse cx="18" cy="16" rx="16" ry="10" fill="#FFFFFF" opacity={0.85} />
        <Ellipse cx="34" cy="10" rx="14" ry="9" fill="#FFFFFF" opacity={0.85} />
        <Ellipse cx="46" cy="16" rx="13" ry="8" fill="#FFFFFF" opacity={0.85} />
      </Svg>
    </Animated.View>
  );
}

function Flower({ x, y, color, scale = 1 }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Path d="M 0 0 l 0 6" stroke="#5C8A4E" strokeWidth={1.4} strokeLinecap="round" />
      {[0, 72, 144, 216, 288].map((deg) => (
        <Ellipse key={deg} cx={0} cy={-4} rx={2.1} ry={3.2} fill={color} transform={`rotate(${deg})`} />
      ))}
      <Circle cx={0} cy={0} r={1.6} fill="#FFE9A8" />
    </G>
  );
}

function FireflyOrButterfly({ night, x, y, color, delay }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (t.value - 0.5) * 26 },
      { translateY: Math.sin(t.value * Math.PI * 2) * -10 },
    ],
    opacity: night ? 0.5 + t.value * 0.5 : 1,
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y }, style]}>
      {night ? (
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFE49A' }} />
      ) : (
        <Svg width={10} height={8} viewBox="0 0 10 8">
          <Path d="M 5 4 q -5 -6 -5 0 q 5 4 5 0 z" fill={color} opacity={0.9} />
          <Path d="M 5 4 q 5 -6 5 0 q -5 4 -5 0 z" fill={color} opacity={0.9} />
        </Svg>
      )}
    </Animated.View>
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
  // When we're filling an arbitrary tall rect (fullscreen) rather than a
  // fixed-aspect card, stretch the viewBox's vertical extent to match so
  // the hill/ground still sits near the real bottom of the screen instead
  // of floating mid-air with empty space below it. Every VB_H reference
  // below now means "this scene's actual height", not the fixed 200.
  const VB_H = (VB_W * h) / w;
  const night = sky.period === 'night';
  const pos = celestialPosition(sky.progress);
  const sunX = pos.x * VB_W;
  const sunY = pos.y * VB_H * 0.62; // keep the arc within the sky band, above the hill

  const groundColor = night ? '#33415C' : sky.period === 'day' ? '#7CC576' : '#8FB56B';
  const groundShadeColor = night ? '#293450' : sky.period === 'day' ? '#68AE5E' : '#79A159';

  const stars = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        cx: ((i * 37 + 13) % (VB_W - 10)) + 5,
        cy: ((i * 53 + 7) % (VB_H * 0.55)) + 6,
        r: 1 + (i % 3) * 0.5,
        delay: (i % 5) * 300,
      })),
    []
  );

  const clouds = useMemo(
    () => [
      { startX: VB_W * 0.08, y: VB_H * 0.12, scale: 0.9, duration: 14000 },
      { startX: VB_W * 0.55, y: VB_H * 0.06, scale: 0.7, duration: 18000 },
    ],
    []
  );

  const flowerColors = ['#F08FB0', '#FFD166', '#F0866E', '#B48EE0'];
  const flowerSpots = useMemo(
    () => [
      { x: VB_W * 0.18, y: VB_H * 0.86 },
      { x: VB_W * 0.28, y: VB_H * 0.9 },
      { x: VB_W * 0.72, y: VB_H * 0.87 },
      { x: VB_W * 0.82, y: VB_H * 0.91 },
      { x: VB_W * 0.62, y: VB_H * 0.93 },
      { x: VB_W * 0.38, y: VB_H * 0.94 },
    ],
    []
  );
  const visibleFlowerCount = Math.min(flowerSpots.length, stage); // more blooms as she grows

  const showBush = stage >= 2;
  const showTree = stage >= 3;
  const bigTree = stage >= 5;
  const showPond = stage >= 4;
  const showFlutter = stage >= 4;
  const flutterCount = stage >= 6 ? 3 : stage >= 5 ? 2 : 1;

  return (
    <View style={{ width: w, height: h, borderRadius, overflow: 'hidden' }}>
      {/* sky */}
      <Svg width={w} height={h} viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={sky.colors.top} />
            <Stop offset="100%" stopColor={sky.colors.bottom} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#sky)" />

        {/* glow + sun/moon */}
        <Circle cx={sunX} cy={sunY} r={22} fill={sky.colors.glow} opacity={0.35} />
        <Circle cx={sunX} cy={sunY} r={12} fill={sky.colors.sunColor} />
        {night && <Circle cx={sunX + 4.5} cy={sunY - 2} r={10} fill={sky.colors.top} />}

        {/* hill / ground */}
        <Path
          d={`M 0 ${VB_H * 0.82} Q ${VB_W * 0.25} ${VB_H * 0.72} ${VB_W * 0.5} ${VB_H * 0.8} T ${VB_W} ${VB_H * 0.78} L ${VB_W} ${VB_H} L 0 ${VB_H} Z`}
          fill={groundColor}
        />
        <Path
          d={`M 0 ${VB_H * 0.9} Q ${VB_W * 0.3} ${VB_H * 0.84} ${VB_W * 0.6} ${VB_H * 0.9} T ${VB_W} ${VB_H * 0.88} L ${VB_W} ${VB_H} L 0 ${VB_H} Z`}
          fill={groundShadeColor}
        />

        {showPond && (
          <G>
            <Ellipse cx={VB_W * 0.5} cy={VB_H * 0.93} rx={26} ry={7} fill={night ? '#26385E' : '#8FD6E8'} opacity={0.9} />
            <Ellipse cx={VB_W * 0.5} cy={VB_H * 0.93} rx={26} ry={7} fill="none" stroke={night ? '#3C5580' : '#6FBFD4'} strokeWidth={1} />
          </G>
        )}

        {showBush && <Ellipse cx={VB_W * 0.12} cy={VB_H * 0.82} rx={14} ry={10} fill={night ? '#2E5A3C' : '#4E9457'} />}

        {showTree && (
          <G>
            <Path d={`M ${VB_W * 0.88} ${VB_H * 0.88} l 0 ${bigTree ? -22 : -14}`} stroke="#7A5A3A" strokeWidth={bigTree ? 4 : 3} strokeLinecap="round" />
            <Circle cx={VB_W * 0.88} cy={VB_H * 0.88 - (bigTree ? 26 : 16)} r={bigTree ? 16 : 11} fill={night ? '#2E5A3C' : '#4E9457'} />
            {bigTree && !night && (
              <>
                <Circle cx={VB_W * 0.88 - 5} cy={VB_H * 0.88 - 20} r={3} fill="#FFE49A" opacity={0.9} />
                <Circle cx={VB_W * 0.88 + 6} cy={VB_H * 0.88 - 30} r={3} fill="#FFE49A" opacity={0.9} />
              </>
            )}
          </G>
        )}

        {flowerSpots.slice(0, visibleFlowerCount).map((spot, i) => (
          <Flower key={i} x={spot.x} y={spot.y} color={flowerColors[i % flowerColors.length]} />
        ))}
      </Svg>

      {/* animated overlay layers (clouds/stars/fireflies use Animated.View, so they sit above the static Svg) */}
      {night
        ? stars.map((s, i) => (
            <Twinkle key={i} cx={(s.cx / VB_W) * w} cy={(s.cy / VB_H) * h} r={s.r} delay={s.delay}>
              <View style={{ width: s.r * 2, height: s.r * 2, borderRadius: s.r, backgroundColor: '#FFFFFF' }} />
            </Twinkle>
          ))
        : clouds.map((c, i) => <Cloud key={i} startX={(c.startX / VB_W) * w} y={(c.y / VB_H) * h} scale={c.scale} duration={c.duration} />)}

      {showFlutter &&
        Array.from({ length: flutterCount }).map((_, i) => (
          <FireflyOrButterfly
            key={i}
            night={night}
            x={w * (0.3 + i * 0.18)}
            y={h * (0.62 + (i % 2) * 0.08)}
            color={flowerColors[i % flowerColors.length]}
            delay={i * 700}
          />
        ))}

      {/* the cat, standing on the ground */}
      <View style={{ position: 'absolute', bottom: h * catBottomOffset, left: 0, right: 0, alignItems: 'center' }}>
        <Companion stage={stage} mood={mood} accentColor={accentColor} size={Math.min(180, w * catSizeRatio)} />
      </View>
    </View>
  );
}
