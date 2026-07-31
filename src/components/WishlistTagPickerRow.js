import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { defaultWishlistTagLabel } from '../constants/wishlistOptions';
import EmojiPickerSheet from './notes/EmojiPickerSheet';

/**
 * Multi-select chip row for wishlist tags (an item can carry several).
 * A trailing "+" chip expands into a tiny inline creator — pick an emoji,
 * type a label, confirm — so custom tags (any emoji + any name) don't need
 * a separate screen. New tags are auto-selected on the item being edited.
 */
export default function WishlistTagPickerRow({ tags, selectedIds = [], onToggle, onCreateTag }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();

  const [creating, setCreating] = useState(false);
  const [draftEmoji, setDraftEmoji] = useState('🏷️');
  const [draftLabel, setDraftLabel] = useState('');
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);

  const handleConfirmCreate = async () => {
    if (!draftLabel.trim()) return;
    const newTag = await onCreateTag(draftEmoji, draftLabel.trim());
    if (newTag) onToggle(newTag.id);
    setCreating(false);
    setDraftLabel('');
    setDraftEmoji('🏷️');
  };

  return (
    <View>
      <View style={[styles.row, isRTL && { flexDirection: 'row-reverse' }]}>
        {tags.map((tag) => {
          const active = selectedIds.includes(tag.id);
          const label = tag.builtIn ? defaultWishlistTagLabel(tag, t) : tag.label;
          return (
            <TouchableOpacity
              key={tag.id}
              onPress={() => onToggle(tag.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={styles.emoji}>{tag.emoji}</Text>
              <Text style={[styles.label, { color: active ? colors.onPrimary : colors.text }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => setCreating((v) => !v)}
          style={[styles.chip, styles.addChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Ionicons name={creating ? 'close' : 'add'} size={15} color={colors.textSecondary} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('wishlistAddTag')}</Text>
        </TouchableOpacity>
      </View>

      {creating && (
        <View style={[styles.createRow, isRTL && { flexDirection: 'row-reverse' }, { borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setEmojiPickerVisible(true)}
            style={[styles.emojiBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
          >
            <Text style={{ fontSize: 18 }}>{draftEmoji}</Text>
          </TouchableOpacity>
          <TextInput
            value={draftLabel}
            onChangeText={setDraftLabel}
            placeholder={t('wishlistNewTagPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.createInput,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, textAlign: isRTL ? 'right' : 'left' },
            ]}
          />
          <TouchableOpacity
            onPress={handleConfirmCreate}
            disabled={!draftLabel.trim()}
            style={[styles.confirmBtn, { backgroundColor: colors.primary, opacity: draftLabel.trim() ? 1 : 0.5 }]}
          >
            <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      )}

      <EmojiPickerSheet
        visible={emojiPickerVisible}
        onClose={() => setEmojiPickerVisible(false)}
        onSelect={setDraftEmoji}
        selected={draftEmoji}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    gap: 5,
  },
  addChip: { borderStyle: 'dashed' },
  emoji: { fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600' },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  emojiBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  createInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13.5 },
  confirmBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
