import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';

/**
 * Large-title header matching iOS Notes: optional back chevron (when
 * drilled into a folder), "Notes" title with a small note-count
 * subtitle underneath, and a single "..." options button top-right.
 * Search lives in the persistent bottom bar, not up here.
 */
export default function NotesHeader({
  showBack = false,
  onBackPress,
  noteCount = 0,
  onMorePress,
  viewMode,
  onToggleViewMode,
}) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();

  return (
    <View style={styles.container}>
      <View style={[styles.topRow, isRTL && { flexDirection: 'row-reverse' }]}>
        {showBack ? (
          <TouchableOpacity onPress={onBackPress} style={styles.backBtn} hitSlop={8}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={26} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}

        <View style={[styles.rightGroup, isRTL && { flexDirection: 'row-reverse' }]}>
          {!!onToggleViewMode && (
            <TouchableOpacity onPress={onToggleViewMode} style={styles.moreBtn} hitSlop={8}>
              <Ionicons
                name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
                size={22}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onMorePress} style={styles.moreBtn} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal-circle" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.largeTitle, { color: colors.text }]}>{t('notesTitle')}</Text>
      <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
        {noteCount === 1 ? t('noteCountSingular') : t('noteCountPlural', noteCount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 30,
  },
  backBtn: {
    width: 30,
    justifyContent: 'center',
  },
  moreBtn: {
    padding: 2,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginTop: 2,
  },
  countLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 4,
  },
});
