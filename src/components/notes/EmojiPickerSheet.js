import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { NOTE_EMOJIS } from '../../constants/noteOptions';

/**
 * Small grid emoji picker used by the note editor's title-row emoji
 * button. Not a full system emoji keyboard — just a quick-pick grid of
 * common emojis, matching the "منتقي إيموجي بشبكة صغيرة" spec.
 */
export default function EmojiPickerSheet({ visible, onClose, onSelect, selected }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.sheet,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>{t('chooseEmoji')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.grid}>
            {NOTE_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => {
                  onSelect(emoji);
                  onClose();
                }}
                style={[
                  styles.cell,
                  selected === emoji && { backgroundColor: colors.primary + '33', borderColor: colors.primary },
                ]}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: '60%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 8,
  },
  cell: {
    width: '16.66%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  emoji: { fontSize: 26 },
});
