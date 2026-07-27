import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';

/**
 * Persistent bottom bar: a docked search field (with mic icon) on the
 * left, and a square compose button on the right — matching the always
 * -visible search + new-note row at the bottom of iOS Notes' list view.
 */
export default function NotesBottomBar({ value, onChangeText, onMicPress, onNewNote }) {
  const { colors, mode } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <BlurView
        intensity={60}
        tint={mode === 'dark' ? 'dark' : 'light'}
        style={[styles.blur, { borderTopColor: colors.border, paddingBottom: insets.bottom || 8 }]}
      >
        <View style={styles.row}>
          <View style={[styles.searchWrap, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <TextInput
              value={value}
              onChangeText={onChangeText}
              placeholder={t('notesSearchPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
            />
            <TouchableOpacity onPress={onMicPress} hitSlop={6}>
              <Ionicons name="mic-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onNewNote}
            style={[styles.composeBtn]}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  blur: {
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    height: '100%',
  },
  composeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
