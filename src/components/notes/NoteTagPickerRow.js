import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { NOTE_TAGS } from '../../constants/noteOptions';

/**
 * Row of tag chips (same categories as the list's filter row). Tapping
 * the already-selected tag clears it (a note can have zero or one tag).
 */
export default function NoteTagPickerRow({ value, onChange }) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.row}>
      {NOTE_TAGS.map((tag) => {
        const active = value === tag.id;
        return (
          <TouchableOpacity
            key={tag.id}
            onPress={() => onChange(active ? null : tag.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.surface,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={styles.emoji}>{tag.emoji}</Text>
            <Text style={[styles.label, { color: active ? colors.onPrimary : colors.text }]}>
              {t(tag.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  emoji: { fontSize: 13, marginRight: 5 },
  label: { fontSize: 13, fontWeight: '600' },
});
