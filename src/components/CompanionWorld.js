import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle, Ellipse, Path, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay, Easing } from 'react-native-reanimated';
import Companion from './Companion';
import { getSkyState, celestialPosition } from '../utils/companionWorldTime';

const VB_W = 320;
const BASE_VB_H = 200;
const REFRESH_MS = 5 * 60 * 1000; // recheck the clock every 5 minutes — a garden, not a stopwatch

// Lightens (positive amount) or darkens (negative amount) a hex color by a
// flat per-channel offset — used to build gradient stops (highlight/shadow)
// from the single base colors companionWorldTime hands us.
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

function Cloud({ startX, y, scale, duration, id }) {
  const x = useSharedValue(startX);
  useEffect(() => {
    x.value = withRepeat(withTiming(startX + 60, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - startX }] }));
  const gradId = `cloudShade-${id}`;
  return (
    <Animated.View style={[{ position: 'absolute', left: startX, top: y }, style]}>
      <Svg width={64 * scale} height={30 * scale} viewBox="0 0 64 30">
        <Defs>
          {/* soft top-lit / bottom-shaded gradient so clouds read as puffy volume, not flat blobs */}
          <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.98} />
            <Stop offset="65%" stopColor="#FFFFFF" stopOpacity={0.9} />
            <Stop offset="100%" stopColor="#DCE6F0" stopOpacity={0.8} />
          </LinearGradient>
        </Defs>
        {/* underlying soft haze so edges don't look cut out */}
        <Ellipse cx="30" cy="18" rx="28" ry="9" fill="#FFFFFF" opacity={0.18} />
        <Ellipse cx="16" cy="17" rx="14" ry="8.5" fill={`url(#${gradId})`} />
        <Ellipse cx="27" cy="12" rx="12" ry="9" fill={`url(#${gradId})`} />
        <Ellipse cx="39" cy="15" rx="13" ry="8" fill={`url(#${gradId})`} />
        <Ellipse cx="50" cy="18" rx="10" ry="6.5" fill={`url(#${gradId})`} />
        {/* underside shading for depth */}
        <Ellipse cx="30" cy="22" rx="22" ry="4.5" fill="#C7D6E4" opacity={0.35} />
      </Svg>
    </Animated.View>
  );
}

function Flower({ x, y, color, scale = 1, lean = 0 }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale}) rotate(${lean})`}>
      {/* soft contact shadow so the flower feels grounded rather than pasted on */}
      <Ellipse cx={0} cy={6.4} rx={2.6} ry={0.8} fill="#000000" opacity={0.12} />
      {/* slightly curved stem instead of a straight line, plus a small leaf */}
      <Path d="M 0 0 Q -0.8 3.5 0 6.2" stroke="#4C7A3E" strokeWidth={1.2} strokeLinecap="round" fill="none" />
      <Path d="M -0.3 3.2 Q -3.2 3 -3.6 1.4 Q -1 0.6 -0.1 2.6 Z" fill="#5C8A4E" />
      {[0, 72, 144, 216, 288].map((deg) => (
        <Ellipse
          key={deg}
          cx={0}
          cy={-4}
          rx={2.1}
          ry={3.2}
          fill={color}
          opacity={0.95}
          transform={`rotate(${deg})`}
        />
      ))}
      {/* darker inner ring under the highlight for a touch of petal shading */}
      <Circle cx={0} cy={0} r={2.2} fill={color} opacity={0.35} />
      <Circle cx={0} cy={0} r={1.5} fill="#FFE9A8" />
      <Circle cx={-0.4} cy={-0.4} r={0.5} fill="#FFF6DE" />
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
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          {/* soft halo behind the glowing body so it reads as light, not a flat dot */}
          <View
            style={{
              position: 'absolute',
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: '#FFE49A',
              opacity: 0.28,
            }}
          />
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF3C4' }} />
        </View>
      ) : (
        <Svg width={11} height={9} viewBox="0 0 11 9">
          {/* wings with a subtle vein line and a slightly darker trailing edge for depth */}
          <Path d="M 5.5 4.5 q -5.2 -6.4 -5.2 0.2 q 5.2 4.2 5.2 -0.2 z" fill={color} opacity={0.92} />
          <Path d="M 5.5 4.5 q 5.2 -6.4 5.2 0.2 q -5.2 4.2 -5.2 -0.2 z" fill={color} opacity={0.92} />
          <Path d="M 5.5 4.5 q -3.2 -3 -3.6 0.4" stroke="#00000030" strokeWidth={0.35} fill="none" />
          <Path d="M 5.5 4.5 q 3.2 -3 3.6 0.4" stroke="#00000030" strokeWidth={0.35} fill="none" />
          <Path d="M 5.5 1.6 Q 5.5 4.5 5.5 8" stroke="#4A3A2E" strokeWidth={0.7} strokeLinecap="round" />
        </Svg>
      )}
    </Animated.View>
  );
}

// A small tuft of grass — scattered across the hill so the ground has texture
// instead of reading as one flat green shape.
function GrassTuft({ x, y, color, scale = 1 }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Path d="M 0 0 Q -2.4 -4.5 -1 -7.5" stroke={color} strokeWidth={0.8} strokeLinecap="round" fill="none" opacity={0.85} />
      <Path d="M 0 0 Q 0.2 -5.5 0.3 -8.5" stroke={color} strokeWidth={0.9} strokeLinecap="round" fill="none" opacity={0.9} />
      <Path d="M 0 0 Q 2.6 -4 1.4 -7" stroke={color} strokeWidth={0.8} strokeLinecap="round" fill="none" opacity={0.85} />
    </G>
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

  // scattered grass tufts give the hill actual texture instead of a flat
  // green fill — deterministic pseudo-random placement so it doesn't
  // reshuffle on every re-render
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

  return (
    <View style={{ width: w, height: h, borderRadius, overflow: 'hidden' }}>
      {/* sky */}
      <Svg width={w} height={h} viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={sky.colors.top} />
            <Stop offset="55%" stopColor={sky.colors.top} stopOpacity={0.55} />
            <Stop offset="100%" stopColor={sky.colors.bottom} />
          </LinearGradient>
          {/* radial haze around the sun/moon instead of a flat translucent disc */}
          <RadialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={sky.colors.glow} stopOpacity={0.55} />
            <Stop offset="60%" stopColor={sky.colors.glow} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={sky.colors.glow} stopOpacity={0} />
          </RadialGradient>
          {/* sun/moon disc gets its own subtle shading so it isn't a flat coin */}
          <RadialGradient id="sunBody" cx="38%" cy="35%" r="65%">
            <Stop offset="0%" stopColor={lightenHex(sky.colors.sunColor, 30)} />
            <Stop offset="70%" stopColor={sky.colors.sunColor} />
            <Stop offset="100%" stopColor={lightenHex(sky.colors.sunColor, -25)} />
          </RadialGradient>
          {/* ground: brighter crest fading to a richer, shadowed low grass tone */}
          <LinearGradient id="ground" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={lightenHex(groundColor, 14)} />
            <Stop offset="45%" stopColor={groundColor} />
            <Stop offset="100%" stopColor={groundShadeColor} />
          </LinearGradient>
          <LinearGradient id="groundShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={groundShadeColor} />
            <Stop offset="100%" stopColor={lightenHex(groundShadeColor, -12)} />
          </LinearGradient>
          {/* pond: light rim, deep center, so water reads as a surface with depth */}
          <RadialGradient id="pond" cx="50%" cy="35%" r="65%">
            <Stop offset="0%" stopColor={night ? '#3E5A86' : '#BFEFF5'} />
            <Stop offset="55%" stopColor={night ? '#26385E' : '#8FD6E8'} />
            <Stop offset="100%" stopColor={night ? '#1C2C4C' : '#5BB6CE'} />
          </RadialGradient>
          {/* foliage clusters: light top, shaded underside, on both bush and tree */}
          <RadialGradient id="foliage" cx="38%" cy="30%" r="70%">
            <Stop offset="0%" stopColor={lightenHex(night ? '#2E5A3C' : '#5CAE64', 22)} />
            <Stop offset="55%" stopColor={night ? '#2E5A3C' : '#4E9457'} />
            <Stop offset="100%" stopColor={night ? '#1E3E28' : '#377240'} />
          </RadialGradient>
          <LinearGradient id="trunk" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#8D6B45" />
            <Stop offset="55%" stopColor="#7A5A3A" />
            <Stop offset="100%" stopColor="#5E4227" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#sky)" />

        {/* subtle horizon-band color (warm near sunrise/sunset, cool blue at night) so the sky isn't one flat gradient top to bottom */}
        <Rect x={0} y={VB_H * 0.55} width={VB_W} height={VB_H * 0.3} fill={sky.colors.bottom} opacity={0.25} />

        {/* glow + sun/moon */}
        <Circle cx={sunX} cy={sunY} r={30} fill="url(#sunGlow)" />
        <Circle cx={sunX} cy={sunY} r={12} fill="url(#sunBody)" />
        {night && <Circle cx={sunX + 4.5} cy={sunY - 2} r={10} fill={sky.colors.top} />}
        {/* crescent terminator gives the moon a touch of roundness */}
        {night && <Circle cx={sunX - 1.5} cy={sunY - 1} r={11.2} fill="none" stroke="#00000018" strokeWidth={0.6} />}

        {/* hill / ground — gradient-filled with a texture layer underneath */}
        <Path
          d={`M 0 ${VB_H * 0.82} Q ${VB_W * 0.25} ${VB_H * 0.72} ${VB_W * 0.5} ${VB_H * 0.8} T ${VB_W} ${VB_H * 0.78} L ${VB_W} ${VB_H} L 0 ${VB_H} Z`}
          fill="url(#ground)"
        />
        <Path
          d={`M 0 ${VB_H * 0.9} Q ${VB_W * 0.3} ${VB_H * 0.84} ${VB_W * 0.6} ${VB_H * 0.9} T ${VB_W} ${VB_H * 0.88} L ${VB_W} ${VB_H} L 0 ${VB_H} Z`}
          fill="url(#groundShade)"
        />
        {/* thin darker seam right along the hill crest for a bit of contour shading */}
        <Path
          d={`M 0 ${VB_H * 0.82} Q ${VB_W * 0.25} ${VB_H * 0.72} ${VB_W * 0.5} ${VB_H * 0.8} T ${VB_W} ${VB_H * 0.78}`}
          fill="none"
          stroke={groundShadeColor}
          strokeWidth={1}
          opacity={0.35}
        />

        {showPond && (
          <G>
            {/* soft shadow the pond casts into the grass around it */}
            <Ellipse cx={VB_W * 0.5} cy={VB_H * 0.945} rx={30} ry={8.5} fill="#000000" opacity={0.08} />
            <Ellipse cx={VB_W * 0.5} cy={VB_H * 0.93} rx={26} ry={7} fill="url(#pond)" />
            <Ellipse cx={VB_W * 0.5} cy={VB_H * 0.93} rx={26} ry={7} fill="none" stroke={night ? '#3C5580' : '#6FBFD4'} strokeWidth={1} />
            {/* ripple rings + a highlight streak so the surface looks liquid, not a flat oval */}
            <Ellipse cx={VB_W * 0.44} cy={VB_H * 0.925} rx={7} ry={2} fill="none" stroke={night ? '#5A7CB0' : '#FFFFFF'} strokeWidth={0.7} opacity={0.5} />
            <Ellipse cx={VB_W * 0.58} cy={VB_H * 0.935} rx={5} ry={1.4} fill="none" stroke={night ? '#5A7CB0' : '#FFFFFF'} strokeWidth={0.6} opacity={0.4} />
            {!night && <Ellipse cx={VB_W * 0.46} cy={VB_H * 0.918} rx={9} ry={1.6} fill="#FFFFFF" opacity={0.35} />}
            {/* a couple of lily pads for extra naturalism */}
            <Ellipse cx={VB_W * 0.61} cy={VB_H * 0.935} rx={3.4} ry={1.6} fill={night ? '#274A34' : '#3E8A4C'} opacity={0.9} />
            <Ellipse cx={VB_W * 0.4} cy={VB_H * 0.94} rx={2.6} ry={1.2} fill={night ? '#274A34' : '#3E8A4C'} opacity={0.85} />
          </G>
        )}

        {showBush && (
          <G>
            <Ellipse cx={VB_W * 0.12} cy={VB_H * 0.845} rx={15} ry={5} fill="#000000" opacity={0.1} />
            <Ellipse cx={VB_W * 0.12} cy={VB_H * 0.82} rx={14} ry={10} fill="url(#foliage)" />
            <Circle cx={VB_W * 0.12 - 6} cy={VB_H * 0.82 - 4} r={6} fill="url(#foliage)" opacity={0.9} />
            <Circle cx={VB_W * 0.12 + 7} cy={VB_H * 0.82 - 2} r={6.5} fill="url(#foliage)" opacity={0.9} />
            {!night && <Circle cx={VB_W * 0.12 - 4} cy={VB_H * 0.82 - 7} r={1.6} fill="#FFFFFF" opacity={0.25} />}
          </G>
        )}

        {showTree && (
          <G>
            {/* ground shadow anchors the tree to the hill */}
            <Ellipse cx={VB_W * 0.88} cy={VB_H * 0.885} rx={bigTree ? 15 : 9} ry={3.4} fill="#000000" opacity={0.12} />
            {/* trunk with a touch of bark texture instead of a flat stroke */}
            <Path
              d={`M ${VB_W * 0.88} ${VB_H * 0.88} l 0 ${bigTree ? -22 : -14}`}
              stroke="url(#trunk)"
              strokeWidth={bigTree ? 4.2 : 3.2}
              strokeLinecap="round"
            />
            <Path
              d={`M ${VB_W * 0.88 - 0.6} ${VB_H * 0.88 - 3} l 0 ${bigTree ? -14 : -8}`}
              stroke="#5E4227"
              strokeWidth={0.6}
              strokeLinecap="round"
              opacity={0.5}
            />
            {/* layered, overlapping foliage clusters read as a real canopy rather than one circle */}
            <G>
              <Circle cx={VB_W * 0.88} cy={VB_H * 0.88 - (bigTree ? 26 : 16)} r={bigTree ? 16 : 11} fill="url(#foliage)" />
              <Circle
                cx={VB_W * 0.88 - (bigTree ? 9 : 6)}
                cy={VB_H * 0.88 - (bigTree ? 20 : 12)}
                r={bigTree ? 10 : 6.5}
                fill="url(#foliage)"
                opacity={0.95}
              />
              <Circle
                cx={VB_W * 0.88 + (bigTree ? 10 : 6.5)}
                cy={VB_H * 0.88 - (bigTree ? 22 : 13)}
                r={bigTree ? 9.5 : 6}
                fill="url(#foliage)"
                opacity={0.95}
              />
              {bigTree && <Circle cx={VB_W * 0.88 + 2} cy={VB_H * 0.88 - 36} r={9} fill="url(#foliage)" opacity={0.95} />}
              {/* sunlit highlight on the canopy's top-left */}
              {!night && (
                <Circle
                  cx={VB_W * 0.88 - (bigTree ? 6 : 4)}
                  cy={VB_H * 0.88 - (bigTree ? 32 : 20)}
                  r={bigTree ? 4.5 : 3}
                  fill="#FFFFFF"
                  opacity={0.18}
                />
              )}
            </G>
            {bigTree && !night && (
              <>
                <Circle cx={VB_W * 0.88 - 5} cy={VB_H * 0.88 - 20} r={3} fill="#FFE49A" opacity={0.9} />
                <Circle cx={VB_W * 0.88 + 6} cy={VB_H * 0.88 - 30} r={3} fill="#FFE49A" opacity={0.9} />
              </>
            )}
          </G>
        )}

        {grassTufts
          .filter((g) => !(showPond && g.y > VB_H * 0.88 && Math.abs(g.x - VB_W * 0.5) < 30))
          .map((g, i) => (
            <GrassTuft key={i} x={g.x} y={g.y} color={i % 3 === 0 ? groundShadeColor : groundColor} scale={g.scale} />
          ))}

        {flowerSpots.slice(0, visibleFlowerCount).map((spot, i) => (
          <Flower key={i} x={spot.x} y={spot.y} color={flowerColors[i % flowerColors.length]} lean={(i % 2 === 0 ? 1 : -1) * (4 + (i % 3) * 3)} />
        ))}
      </Svg>

      {/* animated overlay layers (clouds/stars/fireflies use Animated.View, so they sit above the static Svg) */}
      {night
        ? stars.map((s, i) => (
            <Twinkle key={i} cx={(s.cx / VB_W) * w} cy={(s.cy / VB_H) * h} r={s.r} delay={s.delay}>
              <View style={{ width: s.r * 2, height: s.r * 2, borderRadius: s.r, backgroundColor: '#FFFFFF' }} />
            </Twinkle>
          ))
        : clouds.map((c, i) => <Cloud key={i} id={i} startX={(c.startX / VB_W) * w} y={(c.y / VB_H) * h} scale={c.scale} duration={c.duration} />)}

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
