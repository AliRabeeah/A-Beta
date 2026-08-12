import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useTokens, withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { getColumnType } from '../constants/tableTemplates';
import AnimatedPressable from './AnimatedPressable';

function TableCard({ item, index = 0, onPress, onLongPress, onTogglePin }) {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t, isRTL } = useLanguage();
  const accent = item.color || colors.primary;

  const columnCount = (item.columns || []).length;
  const rowCount = (item.rows || []).length;

  return (
    <AnimatedPressable
      index={index}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.card, tokens.glass.card, tokens.shadow.soft]}
    >
      <View style={[styles.colorDot, { backgroundColor: accent }]} />
      <View style={styles.info}>
        <View style={[styles.titleRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {item.icon || '\ud83d\udcca'} {item.title || t('untitledTable')}
          </Text>
        </View>

        <View style={[styles.metaRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {t('tableMeta', columnCount, rowCount)}
          </Text>
        </View>

        {columnCount > 0 && (
          <View style={[styles.typeRow, isRTL && { flexDirection: 'row-reverse' }]}>
            {item.columns.slice(0, 5).map((c) => (
              <View key={c.id} style={[styles.typeChip, { backgroundColor: withAlpha(accent, 0.12) }]}>
                <Ionicons name={getColumnType(c.type).icon} size={10} color={accent} />
              </View>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={() => { Haptics.selectionAsync(); onTogglePin && onTogglePin(); }}
        hitSlop={10}
        style={[styles.pinBtn, { backgroundColor: item.isPinned ? accent : 'rgba(255,255,255,0.25)' }]}
      >
        <Ionicons name={item.isPinned ? 'pin' : 'pin-outline'} size={14} color={item.isPinned ? '#fff' : colors.text} />
      </TouchableOpacity>
    </AnimatedPressable>
  );
}

export default React.memo(TableCard);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10 },
  colorDot: { width: 8, height: 32, borderRadius: 4, marginRight: 12, alignSelf: 'flex-start', marginTop: 2 },
  info: { flex: 1, marginRight: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  metaRow: { marginTop: 4 },
  metaText: { fontSize: 12 },
  typeRow: { flexDirection: 'row', gap: 5, marginTop: 8 },
  typeChip: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  pinBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
