import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getLegalContent } from '../constants/legalContent';

/**
 * Shared screen for both the Privacy Policy and Terms of Service.
 * route.params.type is 'privacy' | 'terms'. Content + language come from
 * legalContent.js and the app's current language, so switching the app's
 * language also switches this screen without any extra wiring.
 */
export default function LegalScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { language, isRTL, t } = useLanguage();
  const type = route?.params?.type === 'terms' ? 'terms' : 'privacy';
  const content = getLegalContent(type, language);

  useEffect(() => {
    navigation.setOptions({ title: content.title });
  }, [navigation, content.title]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.updated, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
          {content.updated}
        </Text>

        <View style={[styles.introCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.introText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {content.intro}
          </Text>
        </View>

        {content.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={[styles.heading, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {section.heading}
            </Text>
            {section.body.split('\n\n').map((para, idx) => (
              <Text
                key={idx}
                style={[styles.paragraph, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}
              >
                {para}
              </Text>
            ))}
          </View>
        ))}

        <Text style={[styles.footer, { color: colors.textSecondary }]}>
          {t('madeBy')}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  updated: { fontSize: 12.5, fontWeight: '600', marginBottom: 16, opacity: 0.8 },
  introCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 20,
  },
  introText: { fontSize: 14.5, lineHeight: 21, fontWeight: '500' },
  section: { marginBottom: 20 },
  heading: { fontSize: 15.5, fontWeight: '700', marginBottom: 8 },
  paragraph: { fontSize: 14, lineHeight: 21, marginBottom: 8 },
  footer: { fontSize: 12, textAlign: 'center', marginTop: 12, opacity: 0.7 },
});
