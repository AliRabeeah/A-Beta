import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

export default function AboutScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();

  // Read the live app version + native build number. These are stamped
  // automatically by scripts/set-build-version.js on every CI build (see
  // .github/workflows/build-apk.yml and release-apk.yml), so this label
  // changes on its own with every new APK — no manual editing needed.
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.android?.versionCode ?? Constants.nativeBuildVersion;
  const versionLabel = buildNumber ? `${t('version')} ${appVersion} (${buildNumber})` : `${t('version')} ${appVersion}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <Image source={require('../../assets/icon.png')} style={styles.icon} />
        <View style={[styles.headerText, isRTL && { alignItems: 'flex-end' }]}>
          <Text style={[styles.appName, { color: colors.text }]}>A</Text>
          <Text style={[styles.version, { color: colors.textSecondary }]}>{versionLabel}</Text>
        </View>
      </View>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{t('aboutBody')}</Text>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.madeBy, { color: colors.text }]}>{t('madeBy')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  icon: { width: 56, height: 56, borderRadius: 14 },
  headerText: { alignItems: 'flex-start' },
  appName: { fontSize: 22, fontWeight: '800' },
  version: { fontSize: 12.5, marginTop: 2 },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  divider: { height: 1, width: '100%', marginVertical: 24 },
  madeBy: { fontSize: 15, fontWeight: '600' },
});
