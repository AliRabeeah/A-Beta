import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useTokens, withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { favoriteTypeInfo } from '../context/FavoriteContext';

/**
 * A single favorite, rendered like an index/ticket card: a colored strip
 * along the top (carrying the type's emoji) sits above the title, rating,
 * note preview, and a small running index number.
 *
 * Deletion: RN grids don't play well with per-cell swipe gestures (they
 * fight the grid's own scroll), so instead a long-press reveals a confirm
 * dialog — the mobile-native equivalent of "hover to reveal delete".
 */
export default function FavoriteCard({ item, index = 0, onPress, onLongPress }) {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { language } = useLanguage();
  const typeInfo = favoriteTypeInfo(item.type);

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
          {
            backgroundColor: withAlpha(typeInfo.color, 0.18),
            borderTopLeftRadius: tokens.radius.card,
            borderTopRightRadius: tokens.radius.card,
          },
        ]}
      >
        <Text style={styles.stripEmoji}>{typeInfo.icon}</Text>
        <Text style={[styles.indexBadge, { color: withAlpha(typeInfo.color, 0.9) }]}>
          {String(index + 1).padStart(2, '0')}
        </Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>

        {item.rating > 0 && (
          <View style={[styles.starsRow, language === 'ar' && { flexDirection: 'row-reverse' }]}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Ionicons
                key={n}
                name={n <= item.rating ? 'star' : 'star-outline'}
                size={12}
                color={n <= item.rating ? typeInfo.color : colors.textSecondary}
                style={{ marginRight: language === 'ar' ? 0 : 2, marginLeft: language === 'ar' ? 2 : 0 }}
              />
            ))}
          </View>
        )}

        {!!item.note && (
          <Text style={[styles.note, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.note}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, overflow: 'hidden' },
  strip: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  stripEmoji: { fontSize: 20 },
  indexBadge: { fontSize: 11, fontWeight: '700' },
  body: { padding: 12, gap: 6 },
  title: { fontSize: 14, fontWeight: '700' },
  starsRow: { flexDirection: 'row' },
  note: { fontSize: 12, lineHeight: 16 },
});
