import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking, AccessibilityInfo, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import RateAppModal from '../components/RateAppModal';

// ---------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------
// The design spec calls for Fraunces (headings/quote) + Manrope (body/UI),
// but no font binaries are bundled in this environment — see
// assets/fonts/README.md for how to drop the real files in later. Until
// then this falls back to a safe system serif for headings and the
// platform default for everything else; the screen is fully designed and
// functional either way, this is purely a typeface swap when ready.
const HEADING_FONT = 'Fraunces-Regular';
const BODY_FONT = 'Manrope-Regular';
// The quote is italic by design — Android doesn't synthetically slant a
// custom font the way iOS does when you set fontStyle:'italic' on it, so
// this points at the actual italic weight file instead, which renders
// correctly on both platforms. fontStyle:'italic' stays on quoteBody too,
// as a harmless no-op on Android and the correct behavior on iOS if this
// ever runs there.
const QUOTE_FONT = 'Fraunces-Italic';

// Step 3 from assets/fonts/README.md: once the 4 .ttf files exist in
// assets/fonts/, uncomment the 4 lines inside this object (below) — that
// makes expo-font actually load and register them. Then do step 4: change
// the two constants above to 'Fraunces-Regular' and 'Manrope-Regular'.
// Left as an empty object for now so the app builds fine without the
// files present — an empty useFonts() call is a harmless no-op.
function useAboutFonts() {
  return useFonts({
    'Fraunces-Regular': require('../../assets/fonts/Fraunces-Regular.ttf'),
    'Fraunces-Italic': require('../../assets/fonts/Fraunces-Italic.ttf'),
    'Manrope-Regular': require('../../assets/fonts/Manrope-Regular.ttf'),
    'Manrope-SemiBold': require('../../assets/fonts/Manrope-SemiBold.ttf'),
  });
}

// ---------------------------------------------------------------------
// Palette — an editorial palette specific to this screen (richer/warmer
// than the app's general theme tokens), per the agreed spec. Only `mode`
// (dark/light) comes from the shared theme; the actual colors here are
// deliberately their own thing.
// ---------------------------------------------------------------------
const ACCENT = '#F2703B';
const PALETTE = {
  dark: {
    bgFrom: '#0B0B0D',
    bgTo: '#000000',
    card: '#17171B',
    cardBorder: '#232326',
    text: '#F3F1EC',
    textSecondary: '#9B9AA3',
  },
  light: {
    bgFrom: '#FBF9F6',
    bgTo: '#FBF9F6',
    card: '#FFFFFF',
    cardBorder: '#ECE7DF',
    text: '#1C1A17',
    textSecondary: '#726F68',
  },
};

// TODO: same — small clickable icons beside the developer name. Fill in
// the real profile URLs; an icon with an empty url is simply not shown.
const SOCIAL_LINKS = [
  { icon: 'globe-outline', url: '' },
  { icon: 'logo-github', url: '' },
  { icon: 'mail-outline', url: '' },
].filter((l) => l.url);

function openSafely(url) {
  Linking.openURL(url).catch(() => {});
}

/** Fades + rises in on mount, with an optional stagger delay. Skips the
 * motion entirely (just appears) when the system's reduce-motion setting
 * is on. */
function FadeInUp({ delay = 0, reduceMotion, style, children }) {
  const t = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    t.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, [t, delay, reduceMotion]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 10 }],
  }));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

/** A quiet, static glow behind the icon plus a soft drop shadow under it —
 * replaces an earlier version with rotating rings that read as too busy.
 * No animation at all now, so there's nothing to reduce-motion around. */
/**
 * Computes {x, y, angleDeg} for a point walking clockwise around the
 * perimeter of a rounded square (centered on 0,0), at fraction `t` of the
 * way around. `angleDeg` is the direction of travel at that point, so a
 * line segment can be rotated to stay tangent to the path.
 *
 * The perimeter is 4 straight edges + 4 quarter-circle corners, walked in
 * order: top edge -> top-right corner -> right edge -> bottom-right
 * corner -> bottom edge -> bottom-left corner -> left edge -> top-left
 * corner -> (loops back to top edge).
 */
function pointOnRoundedSquare(t, size, radius) {
  'worklet';
  const half = size / 2;
  const straight = size - 2 * radius;
  const arc = (Math.PI * radius) / 2;
  const total = 4 * straight + 4 * arc;
  let d = ((t % 1) + 1) % 1; // normalize into [0, 1)
  d *= total;

  // corner arc centers, one per corner
  const cTR = { x: half - radius, y: -half + radius };
  const cBR = { x: half - radius, y: half - radius };
  const cBL = { x: -half + radius, y: half - radius };
  const cTL = { x: -half + radius, y: -half + radius };

  const segments = [
    { len: straight, kind: 'line', from: { x: -half + radius, y: -half }, dir: { x: 1, y: 0 } },
    { len: arc, kind: 'arc', center: cTR, start: -Math.PI / 2 },
    { len: straight, kind: 'line', from: { x: half, y: -half + radius }, dir: { x: 0, y: 1 } },
    { len: arc, kind: 'arc', center: cBR, start: 0 },
    { len: straight, kind: 'line', from: { x: half - radius, y: half }, dir: { x: -1, y: 0 } },
    { len: arc, kind: 'arc', center: cBL, start: Math.PI / 2 },
    { len: straight, kind: 'line', from: { x: -half, y: half - radius }, dir: { x: 0, y: -1 } },
    { len: arc, kind: 'arc', center: cTL, start: Math.PI },
  ];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (d <= seg.len || i === segments.length - 1) {
      if (seg.kind === 'line') {
        const x = seg.from.x + seg.dir.x * d;
        const y = seg.from.y + seg.dir.y * d;
        const angleDeg = (Math.atan2(seg.dir.y, seg.dir.x) * 180) / Math.PI;
        return { x, y, angleDeg };
      }
      const a = seg.start + d / radius;
      const x = seg.center.x + radius * Math.cos(a);
      const y = seg.center.y + radius * Math.sin(a);
      const angleDeg = (Math.atan2(Math.cos(a), -Math.sin(a)) * 180) / Math.PI;
      return { x, y, angleDeg };
    }
    d -= seg.len;
  }
  return { x: 0, y: -half, angleDeg: 0 };
}

const FRAME_SIZE = 130;
const FRAME_RADIUS = 28;
const TRACK_SIZE = 106;
const TRACK_RADIUS = 22;
const TRAVEL_LINE_LENGTH = 14;
const TRAVEL_LINE_THICKNESS = 2.5;

/** The outer rounded-square frame around the icon, plus a short line that
 * travels slowly around the track in the gap between the icon and the
 * frame — replaces the earlier circular glow. Static (no travel) when
 * reduce-motion is on. */
function IconFrame({ reduceMotion, p }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1, false);
  }, [reduceMotion, t]);

  const travelStyle = useAnimatedStyle(() => {
    const { x, y, angleDeg } = pointOnRoundedSquare(t.value, TRACK_SIZE, TRACK_RADIUS);
    return {
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${angleDeg}deg` }],
    };
  });

  return (
    <View pointerEvents="none" style={[styles.frameWrap, { width: FRAME_SIZE, height: FRAME_SIZE }]}>
      <View
        style={{
          position: 'absolute',
          width: FRAME_SIZE,
          height: FRAME_SIZE,
          borderRadius: FRAME_RADIUS,
          borderWidth: 1,
          borderColor: p.cardBorder,
        }}
      />
      <Animated.View
        style={[
          styles.travelLine,
          { backgroundColor: ACCENT, left: FRAME_SIZE / 2 - TRAVEL_LINE_LENGTH / 2, top: FRAME_SIZE / 2 - TRAVEL_LINE_THICKNESS / 2 },
          travelStyle,
        ]}
      />
    </View>
  );
}

function LinkRow({ label, onPress, isLast, p }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={[styles.linkRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.cardBorder }]}
    >
      <Text style={[styles.linkLabel, { color: p.text, fontFamily: BODY_FONT }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={p.textSecondary} />
    </TouchableOpacity>
  );
}

export default function AboutScreen({ navigation }) {
  const { mode } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const p = PALETTE[mode] || PALETTE.dark;
  useAboutFonts(); // no-op until the .ttf files exist — see assets/fonts/README.md

  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => mounted && setReduceMotion(!!v))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.android?.versionCode ?? Constants.nativeBuildVersion;
  const versionLabel = buildNumber ? `${t('version')} ${appVersion} (${buildNumber})` : `${t('version')} ${appVersion}`;

  const ICON_SIZE = 84;

  return (
    <View style={{ flex: 1, backgroundColor: p.bgTo }}>
      <LinearGradient colors={[p.bgFrom, p.bgTo]} style={StyleSheet.absoluteFill} />
      <View
        style={[
          styles.container,
          { paddingTop: Math.max(insets.top, 24) + 28, paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
      >
        <FadeInUp delay={0} reduceMotion={reduceMotion} style={styles.headerCol}>
          <View style={styles.iconStack}>
            <IconFrame reduceMotion={reduceMotion} p={p} />
            <View style={styles.iconShadowWrap}>
              <Image
                source={require('../../assets/icon.png')}
                style={{ width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_SIZE * 0.22 }}
              />
            </View>
          </View>

          <Text style={[styles.appName, { color: p.text, fontFamily: HEADING_FONT }]}>A</Text>
          <Text style={[styles.versionText, { color: p.textSecondary, fontFamily: BODY_FONT }]}>{versionLabel}</Text>
        </FadeInUp>

        <FadeInUp delay={100} reduceMotion={reduceMotion} style={[styles.quoteCard, { backgroundColor: p.card, borderColor: p.cardBorder }]}>
          <Text
            style={[styles.quoteMark, { color: ACCENT, fontFamily: HEADING_FONT }, isRTL ? { right: 10 } : { left: 10 }]}
            pointerEvents="none"
          >
            "
          </Text>
          <Text style={[styles.quoteBody, { color: p.text, fontFamily: QUOTE_FONT }]}>{t('aboutBody')}</Text>
          <View style={[styles.quoteDivider, { backgroundColor: ACCENT }]} />
        </FadeInUp>

        <FadeInUp delay={170} reduceMotion={reduceMotion} style={styles.madeByRow}>
          <Text style={[styles.madeBy, { color: p.textSecondary, fontFamily: 'Manrope-SemiBold' }]}>{t('madeBy')}</Text>
          {SOCIAL_LINKS.length > 0 && (
            <View style={[styles.socialRow, isRTL && { flexDirection: 'row-reverse' }]}>
              {SOCIAL_LINKS.map((link) => (
                <TouchableOpacity key={link.icon} onPress={() => openSafely(link.url)} style={styles.socialBtn} hitSlop={8}>
                  <Ionicons name={link.icon} size={16} color={p.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </FadeInUp>

        <FadeInUp delay={230} reduceMotion={reduceMotion} style={[styles.linksCard, { backgroundColor: p.card, borderColor: p.cardBorder }]}>
          <LinkRow label={t('aboutPrivacyPolicy')} onPress={() => navigation.navigate('Legal', { type: 'privacy' })} p={p} />
          <LinkRow label={t('aboutTerms')} onPress={() => navigation.navigate('Legal', { type: 'terms' })} p={p} />
          <LinkRow label={t('aboutRateApp')} onPress={() => setRateModalVisible(true)} isLast p={p} />
        </FadeInUp>
      </View>

      <RateAppModal visible={rateModalVisible} onClose={() => setRateModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  headerCol: { alignItems: 'center', marginBottom: 26 },
  iconStack: { alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  frameWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  travelLine: {
    position: 'absolute',
    width: TRAVEL_LINE_LENGTH,
    height: TRAVEL_LINE_THICKNESS,
    borderRadius: TRAVEL_LINE_THICKNESS / 2,
  },
  iconShadowWrap: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  appName: { fontSize: 30, textAlign: 'center', letterSpacing: 0.2 },
  versionText: { fontSize: 12.5, fontWeight: '500', textAlign: 'center', marginTop: 6 },
  quoteCard: {
    alignSelf: 'center',
    maxWidth: '86%',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  quoteMark: { position: 'absolute', top: -10, fontSize: 62, opacity: 0.1, fontWeight: '700' },
  quoteBody: { fontSize: 15.5, textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
  quoteDivider: { width: 24, height: 2, borderRadius: 1, alignSelf: 'center', marginTop: 10, opacity: 0.85 },
  madeByRow: { alignItems: 'center', marginTop: 24, gap: 10 },
  madeBy: { fontSize: 13.5, fontWeight: '600', textAlign: 'center' },
  socialRow: { flexDirection: 'row', gap: 16 },
  socialBtn: { padding: 4 },
  linksCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 'auto',
    overflow: 'hidden',
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 18 },
  linkLabel: { fontSize: 14.5, fontWeight: '500' },
});
