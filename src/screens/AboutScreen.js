import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

export default function AboutScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={require('../../assets/icon.png')} style={styles.icon} />
      <Text style={[styles.appName, { color: colors.text }]}>A</Text>
      <Text style={[styles.version, { color: colors.textSecondary }]}>{t('version')}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{t('aboutBody')}</Text>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.madeBy, { color: colors.text }]}>{t('madeBy')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  icon: { width: 96, height: 96, borderRadius: 22, marginBottom: 12 },
  appName: { fontSize: 26, fontWeight: '800' },
  version: { fontSize: 13, marginTop: 4, marginBottom: 20 },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  divider: { height: 1, width: '100%', marginVertical: 24 },
  madeBy: { fontSize: 15, fontWeight: '600' },
});
