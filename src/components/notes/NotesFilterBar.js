import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { NOTE_TAGS } from '../../constants/noteOptions';

/**
 * Horizontal, scrollable row of filter chips: All 🗂️ / Pinned 📌 / then
 * one chip per tag category. The active filter is highlighted with the
 * app's primary accent color.
 */
export default function NotesFilterBar({ value, onChange }) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const chips = [
    { id: 'all', emoji: '\ud83d\uddc2\ufe0f', label: t('noteFilterAll') },
    { id: 'pinned', emoji: '\ud83d\udccc', label: t('noteFilterPinned') },
    ...NOTE_TAGS.map((tag) => ({ id: tag.id, emoji: tag.emoji, label: t(tag.labelKey) })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {chips.map((chip) => {
        const active = value === chip.id;
        return (
          <TouchableOpacity
            key={chip.id}
            onPress={() => onChange(chip.id)}
            style={[
              styles.chip,
              { backgroundColor: active ? colors.primary + '1f' : 'transparent' },
            ]}
            activeOpacity={0.6}
          >
            <Text style={styles.emoji}>{chip.emoji}</Text>
            <Text
              style={[
                styles.label,
                {
                  color: active ? colors.primary : colors.textSecondary,
                  fontWeight: active ? '700' : '500',
                },
              ]}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 10,
    alignItems: 'center',
    gap: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
    marginRight: 4,
  },
  emoji: { fontSize: 11, marginRight: 4 },
  label: { fontSize: 11.5 },
});
