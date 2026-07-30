import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useTokens, withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { favoriteTypeInfo } from '../context/FavoriteContext';

function formatAddedDate(isoString, locale) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const isThisYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: isThisYear ? undefined : 'numeric',
  });
}

/**
 * A single favorite, rendered like an index/ticket card: a slim colored
 * strip along the top carries the type's emoji, its star rating, and the
 * running index number all in one row — condensed on purpose so the card
 * stays compact in a 2-column grid instead of the rating eating a whole
 * row of its own in the body. The body holds the title, an optional note
 * preview, and — for every category — a small "added on" date footer.
 *
 * Deletion: RN grids don't play well with per-cell swipe gestures (they
 * fight the grid's own scroll), so instead a long-press reveals a confirm
 * dialog — the mobile-native equivalent of "hover to reveal delete".
 */
export default function FavoriteCard({ item, number = 1, onPress, onLongPress }) {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { language } = useLanguage();
  const typeInfo = favoriteTypeInfo(item.type);
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const isRTL = language === 'ar';
  const addedLabel = formatAddedDate(item.addedAt, locale);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.card, tokens.glass.card, { borderRadius: tokens.radius.card }]}
    >
      <View
        style={[
          styles.strip,
          isRTL && { flexDirection: 'row-reverse' },
          {
            backgroundColor: withAlpha(typeInfo.color, 0.18),
            borderTopLeftRadius: tokens.radius.card,
            borderTopRightRadius: tokens.radius.card,
          },
        ]}
      >
        <View style={[styles.stripLeft, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.stripEmoji}>{typeInfo.icon}</Text>
          {item.rating > 0 && (
            <View style={[styles.starsRow, isRTL && { flexDirection: 'row-reverse' }]}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Ionicons
                  key={n}
                  name={n <= item.rating ? 'star' : 'star-outline'}
                  size={10}
                  color={n <= item.rating ? typeInfo.color : withAlpha(typeInfo.color, 0.35)}
                  style={{ marginRight: isRTL ? 0 : 1, marginLeft: isRTL ? 1 : 0 }}
                />
              ))}
            </View>
          )}
        </View>
        <Text style={[styles.indexBadge, { color: withAlpha(typeInfo.color, 0.9) }]}>
          {String(number).padStart(2, '0')}
        </Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>

        {!!item.note && (
          <Text style={[styles.note, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.note}
          </Text>
        )}

        {!!addedLabel && (
          <View style={[styles.footerRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} style={{ opacity: 0.7 }} />
            <Text style={[styles.footerDate, { color: colors.textSecondary }]}>{addedLabel}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, overflow: 'hidden' },
  strip: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  stripLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  stripEmoji: { fontSize: 15 },
  starsRow: { flexDirection: 'row' },
  indexBadge: { fontSize: 10, fontWeight: '700' },
  body: { padding: 10, gap: 4 },
  title: { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  note: { fontSize: 11.5, lineHeight: 15 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  footerDate: { fontSize: 10.5, fontWeight: '500' },
});
