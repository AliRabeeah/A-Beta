import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useTokens, withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { defaultWishlistTagLabel } from '../constants/wishlistOptions';

/**
 * A single wishlist item as a card: optional thumbnail up top, then title,
 * a short description preview, and its tag chips. A small bell shows when
 * a reminder is set (still pending) so important items stand out in the
 * grid without opening each one.
 */
export default function WishlistCard({ item, tagsById, onPress, onLongPress }) {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t, language, isRTL } = useLanguage();
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  const itemTags = (item.tagIds || []).map((id) => tagsById[id]).filter(Boolean);
  const hasPendingReminder = !!item.reminderAt && new Date(item.reminderAt).getTime() > Date.now();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.card, tokens.glass.card, { borderRadius: tokens.radius.card }]}
    >
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={[styles.thumb, { borderTopLeftRadius: tokens.radius.card, borderTopRightRadius: tokens.radius.card }]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.thumbPlaceholder,
            {
              backgroundColor: withAlpha(colors.primary, 0.12),
              borderTopLeftRadius: tokens.radius.card,
              borderTopRightRadius: tokens.radius.card,
            },
          ]}
        >
          <Text style={styles.placeholderEmoji}>{itemTags[0]?.emoji || '✨'}</Text>
        </View>
      )}

      {hasPendingReminder && (
        <View style={[styles.reminderBadge, { backgroundColor: colors.primary }, isRTL ? { left: 8 } : { right: 8 }]}>
          <Ionicons name="notifications" size={11} color={colors.onPrimary} />
        </View>
      )}

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>

        {!!item.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {itemTags.length > 0 && (
          <View style={[styles.tagsRow, isRTL && { flexDirection: 'row-reverse' }]}>
            {itemTags.slice(0, 3).map((tag) => (
              <View key={tag.id} style={[styles.tagChip, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
                <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                <Text style={[styles.tagLabel, { color: colors.primary }]} numberOfLines={1}>
                  {tag.builtIn ? defaultWishlistTagLabel(tag, t) : tag.label}
                </Text>
              </View>
            ))}
            {itemTags.length > 3 && (
              <Text style={[styles.moreTags, { color: colors.textSecondary }]}>+{itemTags.length - 3}</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, overflow: 'hidden' },
  thumb: { width: '100%', aspectRatio: 4 / 3 },
  thumbPlaceholder: { width: '100%', aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 34 },
  reminderBadge: {
    position: 'absolute',
    top: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 10, gap: 4 },
  title: { fontSize: 13.5, fontWeight: '700', lineHeight: 18 },
  description: { fontSize: 11.5, lineHeight: 15 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4, alignItems: 'center' },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  tagEmoji: { fontSize: 10 },
  tagLabel: { fontSize: 10, fontWeight: '700', maxWidth: 70 },
  moreTags: { fontSize: 10.5, fontWeight: '600' },
});
