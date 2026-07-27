import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { FAVORITE_TYPES } from '../context/FavoriteContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const EXPAND_ANIM = { duration: 220, update: { type: 'easeInEaseOut' } };

/**
 * Semi-hidden filter row: collapsed by default (small, low-opacity type
 * icons only, no labels). A distinct "Filter" toggle button expands the
 * row to reveal each type's name + item count, with a smooth ~220ms
 * transition. The active type stays visibly tinted even while collapsed.
 */
export default function FilterBar({ counts, activeType, onSelectType }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(EXPAND_ANIM);
    setExpanded((v) => !v);
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <View style={[styles.wrap, isRTL && { flexDirection: 'row-reverse' }]}>
      <TouchableOpacity
        onPress={toggleExpanded}
        style={[styles.toggleBtn, { backgroundColor: withAlpha(colors.textSecondary, 0.1) }]}
      >
        <Ionicons name={expanded ? 'close' : 'options-outline'} size={15} color={colors.textSecondary} />
        {!expanded && <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>{t('filterToggle')}</Text>}
      </TouchableOpacity>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.chipsRow, isRTL && { flexDirection: 'row-reverse' }]}
      >
        <Chip
          active={activeType === null}
          expanded={expanded}
          color={colors.primary}
          colors={colors}
          onPress={() => onSelectType(null)}
          label={t('filterAll')}
          count={total}
          icon="✦"
        />
        {FAVORITE_TYPES.map((typeInfo) => (
          <Chip
            key={typeInfo.id}
            active={activeType === typeInfo.id}
            expanded={expanded}
            color={typeInfo.color}
            colors={colors}
            onPress={() => onSelectType(typeInfo.id)}
            label={t(typeInfo.labelKey)}
            count={counts[typeInfo.id] || 0}
            icon={typeInfo.icon}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({ active, expanded, color, colors, onPress, label, count, icon }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? withAlpha(color, 0.22) : withAlpha(colors.textSecondary, 0.08),
          borderColor: active ? color : 'transparent',
          opacity: active ? 1 : expanded ? 0.85 : 0.55,
        },
      ]}
    >
      <Text style={styles.chipIcon}>{icon}</Text>
      {expanded && (
        <>
          <Text style={[styles.chipLabel, { color: active ? color : colors.text }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.chipCount, { color: colors.textSecondary }]}>{count}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  toggleLabel: { fontSize: 11, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 5,
  },
  chipIcon: { fontSize: 14 },
  chipLabel: { fontSize: 12, fontWeight: '600', maxWidth: 90 },
  chipCount: { fontSize: 11, fontWeight: '600' },
});
