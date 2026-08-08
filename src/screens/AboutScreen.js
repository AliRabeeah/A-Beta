import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

/** Fades + rises in on mount, with an optional stagger delay — purely a
 * one-time entrance for this screen, so it never touches navigation or
 * other screens. */
function FadeInUp({ delay = 0, style, children }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, [t, delay]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 10 }],
  }));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

export default function AboutScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  // Read the live app version + native build number. These are stamped
  // automatically by scripts/set-build-version.js on every CI build (see
  // .github/workflows/build-apk.yml and release-apk.yml), so this label
  // changes on its own with every new APK — no manual editing needed.
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.android?.versionCode ?? Constants.nativeBuildVersion;
  const versionLabel = buildNumber ? `${t('version')} ${appVersion} (${buildNumber})` : `${t('version')} ${appVersion}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 24) + 36 }]}>
      <FadeInUp delay={0} style={styles.headerCol}>
        <View style={[styles.iconGlow, { backgroundColor: colors.primary }]} />
        <View style={[styles.iconShadowWrap, { shadowColor: colors.primary }]}>
          <Image source={require('../../assets/icon.png')} style={styles.icon} />
        </View>
        <Text style={[styles.appName, { color: colors.text }]}>A</Text>
        <View style={[styles.versionPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>{versionLabel}</Text>
        </View>
      </FadeInUp>

      <FadeInUp delay={90} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.body, { color: colors.text }]}>{t('aboutBody')}</Text>
      </FadeInUp>

      <FadeInUp delay={160} style={styles.footer}>
        <Text style={[styles.madeBy, { color: colors.textSecondary }]}>{t('madeBy')}</Text>
      </FadeInUp>
    </View>
  );
}

const ICON_SIZE = 92;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 28 },
  headerCol: { alignItems: 'center', marginBottom: 28 },
  iconGlow: {
    position: 'absolute',
    top: 6,
    width: ICON_SIZE + 34,
    height: ICON_SIZE + 34,
    borderRadius: (ICON_SIZE + 34) / 2,
    opacity: 0.14,
  },
  iconShadowWrap: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: 16,
  },
  icon: { width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_SIZE * 0.24 },
  appName: { fontSize: 26, fontWeight: '800', textAlign: 'center', letterSpacing: 0.3 },
  versionPill: {
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  versionText: { fontSize: 12.5, fontWeight: '600', textAlign: 'center' },
  card: {
    width: '100%',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  body: { fontSize: 15.5, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  footer: { marginTop: 26 },
  madeBy: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
