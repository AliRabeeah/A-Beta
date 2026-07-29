import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useTokens, withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import AnimatedPressable from './AnimatedPressable';
import ActionSheet from './ActionSheet';
import {
  activeSubjectsOnDate,
  completedDaysCount,
  totalDaysCount,
  isDayCompleted,
  maxDuration,
} from '../utils/planningUtils';
import { toKey, addDays } from '../utils/dateUtils';

function PlanningCard({
  item,
  date = new Date(),
  index = 0,
  onPress,
  onToggleCompleted,
  onDeleteToday,
  onDeletePlan,
  onReorderRequest,
}) {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t } = useLanguage();
  const accent = colors.primary;
  const isExtended = item.type === 'extended';

  const [menuVisible, setMenuVisible] = useState(false);

  const subjectsToday = isExtended ? activeSubjectsOnDate(item, date) : item.subjects || [];
  const done = isDayCompleted(item, date);
  const totalDays = totalDaysCount(item);
  const doneDays = completedDaysCount(item);

  const subjectSummary = subjectsToday
    .map((s) => {
      const qty = isExtended ? s.perDay : s.quantityLabel;
      const parts = [s.name, qty].filter(Boolean);
      return parts.join(' \u2014 ');
    })
    .filter(Boolean)
    .join(' + ');

  const handleTap = () => {
    Haptics.selectionAsync();
    onPress && onPress(item.id);
  };

  const handleLongPress = () => {
    Haptics.selectionAsync();
    setMenuVisible(true);
  };

  const menuActions = [
    { icon: 'create-outline', label: t('editPlan'), onPress: () => onPress && onPress(item.id) },
    {
      icon: done ? 'checkmark-circle' : 'checkmark-circle-outline',
      label: done ? t('markTodayNotCompleted') : t('markTodayCompleted'),
      onPress: () => onToggleCompleted && onToggleCompleted(item.id),
    },
    ...(onReorderRequest ? [{ icon: 'swap-vertical-outline', label: t('reorderItems'), onPress: onReorderRequest }] : []),
    { icon: 'close-circle-outline', label: t('deleteTodayOnly'), onPress: () => onDeleteToday && onDeleteToday(item.id) },
    { icon: 'trash-outline', label: t('deleteEntirePlan'), onPress: () => onDeletePlan && onDeletePlan(item.id), destructive: true },
  ];

  // Day-by-day progress strip: one dot per day, filled for completed days,
  // ringed for today. Beyond a certain length this wraps into an unreadable
  // wall of dots inside a card, so long plans fall back to a single compact
  // progress bar (with a marker for today) instead.
  const DOT_STRIP_MAX_DAYS = 31;
  const showDotStrip = isExtended && totalDays <= DOT_STRIP_MAX_DAYS;
  const dayDots = [];
  let todayDayIndex = 0;
  if (isExtended) {
    const start = item.startDate || item.createdDate;
    const startDateObj = new Date(start + 'T00:00:00');
    const todayKey = toKey(date);
    for (let i = 0; i < totalDays; i++) {
      const dKey = toKey(addDays(startDateObj, i));
      if (dKey === todayKey) todayDayIndex = i;
      if (showDotStrip) {
        dayDots.push({ key: dKey, completed: !!item.completedDays?.[dKey], isToday: dKey === todayKey });
      }
    }
  }

  return (
    <>
      <AnimatedPressable
        index={index}
        onPress={handleTap}
        onLongPress={handleLongPress}
        style={[styles.card, tokens.glass.card, tokens.shadow.soft]}
      >
        <LinearGradient
          colors={[withAlpha(accent, 0.16), 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={[styles.colorDot, { backgroundColor: accent }]} />
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: colors.text, textDecorationLine: done ? 'line-through' : 'none' }]} numberOfLines={1}>
              {isExtended ? '\ud83d\udcda' : '\u2600\ufe0f'} {item.title}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: withAlpha(accent, 0.14) }]}>
              <Text style={{ color: accent, fontSize: 10, fontWeight: '700' }}>
                {isExtended ? t('planningTypeExtended') : t('planningTypeDaily')}
              </Text>
            </View>
          </View>

          {subjectSummary ? (
            <Text style={[styles.subjects, { color: colors.textSecondary }]} numberOfLines={2}>
              {subjectSummary}
            </Text>
          ) : null}

          {isExtended && (
            <>
              {showDotStrip ? (
                <View style={styles.dotsRow}>
                  {dayDots.map((d) => (
                    <View
                      key={d.key}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: d.completed ? accent : withAlpha(colors.text, 0.1),
                          borderColor: d.isToday ? accent : 'transparent',
                          borderWidth: d.isToday ? 2 : 0,
                        },
                      ]}
                    />
                  ))}
                </View>
              ) : (
                <View style={[styles.barTrack, { backgroundColor: withAlpha(colors.text, 0.1) }]}>
                  <View style={[styles.barFill, { width: `${(doneDays / totalDays) * 100}%`, backgroundColor: accent }]} />
                  <View
                    style={[
                      styles.barTodayMarker,
                      { left: `${(todayDayIndex / Math.max(1, totalDays - 1)) * 100}%`, backgroundColor: colors.text },
                    ]}
                  />
                </View>
              )}
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {t('completedDaysProgress', doneDays, totalDays)}
              </Text>
            </>
          )}
        </View>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onToggleCompleted && onToggleCompleted(item.id);
          }}
          style={[
            styles.checkbox,
            {
              borderColor: done ? accent : tokens.hairline,
              backgroundColor: done ? accent : 'transparent',
            },
          ]}
        >
          {done && <Ionicons name="checkmark" size={18} color={colors.onPrimary} />}
        </TouchableOpacity>
      </AnimatedPressable>
      <ActionSheet visible={menuVisible} onClose={() => setMenuVisible(false)} title={item.title} actions={menuActions} />
    </>
  );
}

export default React.memo(PlanningCard);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10, overflow: 'hidden' },
  colorDot: { width: 8, height: 32, borderRadius: 4, marginRight: 12, alignSelf: 'flex-start', marginTop: 2 },
  info: { flex: 1, marginRight: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  subjects: { fontSize: 12, marginTop: 6 },
  dotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  barTrack: { height: 6, borderRadius: 3, marginTop: 8, overflow: 'visible' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  barTodayMarker: { position: 'absolute', top: -3, width: 2, height: 12, borderRadius: 1, marginLeft: -1 },
  progressText: { fontSize: 11, marginTop: 6, fontWeight: '600' },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
