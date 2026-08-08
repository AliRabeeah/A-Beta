import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking, AccessibilityInfo, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

// ---------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------
// The design spec calls for Fraunces (headings/quote) + Manrope (body/UI),
// but no font binaries are bundled in this environment — see
// assets/fonts/README.md for how to drop the real files in later. Until
// then this falls back to a safe system serif for headings and the
// platform default for everything else; the screen is fully designed and
// functional either way, this is purely a typeface swap when ready.
const HEADING_FONT = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const BODY_FONT = undefined; // platform default

// Once assets/fonts/*.ttf exist, load them with expo-font's useFonts()
// here and change the two constants above to 'Fraunces-Regular' /
// 'Manrope-Regular' — see assets/fonts/README.md for the exact snippet.

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

// TODO: replace with the real URLs before shipping — these are
// placeholders so the section is fully built and working, just pointed
// nowhere yet.
const PRIVACY_URL = 'https://example.com/privacy';
const TERMS_URL = 'https://example.com/terms';
const ANDROID_PACKAGE = 'com.alihalim.a';
const RATE_URL_NATIVE = `market://details?id=${ANDROID_PACKAGE}`;
const RATE_URL_WEB = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

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

async function openRateApp() {
  try {
    await Linking.openURL(RATE_URL_NATIVE);
  } catch {
    openSafely(RATE_URL_WEB);
  }
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

/** The quiet signature background behind the icon: a slowly breathing
 * glow plus two very thin dashed rings rotating opposite directions.
 * Purely ambient — intentionally too slow to read as "an animation"
 * rather than a mood. Fully static when reduce-motion is on. */
function SignatureHalo({ reduceMotion, size }) {
  const breathe = useSharedValue(reduceMotion ? 0.5 : 0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    breathe.value = withRepeat(withTiming(1, { duration: 6500, easing: Easing.inOut(Easing.sin) }), -1, true);
    ring1.value = withRepeat(withTiming(1, { duration: 32000, easing: Easing.linear }), -1, false);
    ring2.value = withRepeat(withTiming(1, { duration: 25000, easing: Easing.linear }), -1, false);
  }, [reduceMotion, breathe, ring1, ring2]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.16 + breathe.value * 0.1,
    transform: [{ scale: 1 + breathe.value * 0.12 }],
  }));
  const ring1Style = useAnimatedStyle(() => ({ transform: [{ rotate: `${ring1.value * 360}deg` }] }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ rotate: `${-ring2.value * 360}deg` }] }));

  const ringOuter = size + 56;
  const ringInner = size + 30;

  return (
    <View pointerEvents="none" style={[styles.haloWrap, { width: ringOuter + 20, height: ringOuter + 20 }]}>
      <Animated.View
        style={[
          styles.glowCircle,
          { width: size + 70, height: size + 70, borderRadius: (size + 70) / 2, backgroundColor: ACCENT },
          haloStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { width: ringOuter, height: ringOuter, borderRadius: ringOuter / 2, borderColor: ACCENT },
          ring1Style,
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { width: ringInner, height: ringInner, borderRadius: ringInner / 2, borderColor: ACCENT, opacity: 0.5 },
          ring2Style,
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

export default function AboutScreen() {
  const { mode } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const p = PALETTE[mode] || PALETTE.dark;

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
            <SignatureHalo reduceMotion={reduceMotion} size={ICON_SIZE + 56} />
            <View style={styles.iconTileShadow}>
              <LinearGradient
                colors={mode === 'dark' ? ['#232327', '#161619'] : ['#FFFFFF', '#F2EEE7']}
                style={[styles.iconTile, { borderColor: p.cardBorder }]}
              >
                <Image
                  source={require('../../assets/icon.png')}
                  style={{ width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_SIZE * 0.22 }}
                />
              </LinearGradient>
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
          <Text style={[styles.quoteBody, { color: p.text, fontFamily: HEADING_FONT }]}>{t('aboutBody')}</Text>
          <View style={[styles.quoteDivider, { backgroundColor: ACCENT }]} />
        </FadeInUp>

        <FadeInUp delay={170} reduceMotion={reduceMotion} style={styles.madeByRow}>
          <Text style={[styles.madeBy, { color: p.textSecondary, fontFamily: BODY_FONT }]}>{t('madeBy')}</Text>
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
          <LinkRow label={t('aboutPrivacyPolicy')} onPress={() => openSafely(PRIVACY_URL)} p={p} />
          <LinkRow label={t('aboutTerms')} onPress={() => openSafely(TERMS_URL)} p={p} />
          <LinkRow label={t('aboutRateApp')} onPress={openRateApp} isLast p={p} />
        </FadeInUp>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  headerCol: { alignItems: 'center', marginBottom: 26 },
  iconStack: { alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  haloWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  glowCircle: { position: 'absolute' },
  ring: { position: 'absolute', borderWidth: 1, borderStyle: 'dashed' },
  iconTileShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
  iconTile: {
    width: 140,
    height: 140,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
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
