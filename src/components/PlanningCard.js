import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useTokens, withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { usePlanning } from '../context/PlanningContext';
import AnimatedPressable from './AnimatedPressable';
import ActionSheet from './ActionSheet';
import { pointsProgress, isPlanFullyCompleted, daysUntilDue, isPlanOverdue } from '../utils/planningUtils';

function formatPeriodLabel(item, t, locale) {
  const fmt = (key) => new Date(key + 'T00:00:00').toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  if (item.startDate && item.dueDate) {
    return item.startDate === item.dueDate ? fmt(item.startDate) : `${fmt(item.startDate)} \u2192 ${fmt(item.dueDate)}`;
  }
  if (item.dueDate) return t('planUntilDateLabel', fmt(item.dueDate));
  if (item.startDate) return t('planFromDateLabel', fmt(item.startDate));
  return t('planNoPeriodLabel');
}

function PlanningCard({
  item,
  date = new Date(),
  index = 0,
  onPress,
  onToggleCompleted,
  onDeleteToday,
  onDeletePlan,
}) {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t, language, isRTL } = useLanguage();
  const { togglePoint } = usePlanning();
  const accent = item.color || colors.primary;
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  const [menuVisible, setMenuVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { done, total, percent } = pointsProgress(item);
  const fullyDone = isPlanFullyCompleted(item);
  const overdue = isPlanOverdue(item, date);
  const remaining = daysUntilDue(item, date);
  const canExpand = total > 1;

  // A plan with points checks in right from the card, without opening the
  // editor: a single point toggles directly on tap (tap again to undo);
  // more than one point expands the card to show each one, checkable
  // individually. Editing the plan itself moves to the long-press menu.
  // Only a plan with no points at all still opens straight to the editor
  // on tap, since there's nothing to check off yet.
  const handleTap = () => {
    if (total === 0) {
      Haptics.selectionAsync();
      onPress && onPress(item.id);
    } else if (total === 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      togglePoint(item.id, item.points[0].id);
    } else {
      Haptics.selectionAsync();
      setExpanded((e) => !e);
    }
  };

  const handleLongPress = () => {
    Haptics.selectionAsync();
    setMenuVisible(true);
  };

  const menuActions = [
    { icon: 'create-outline', label: t('editPlan'), onPress: () => onPress && onPress(item.id) },
    {
      icon: fullyDone ? 'checkmark-circle' : 'checkmark-circle-outline',
      label: fullyDone ? t('markTodayNotCompleted') : t('markTodayCompleted'),
      onPress: () => onToggleCompleted && onToggleCompleted(item.id),
    },
    { icon: 'close-circle-outline', label: t('deleteTodayOnly'), onPress: () => onDeleteToday && onDeleteToday(item.id) },
    { icon: 'trash-outline', label: t('deleteEntirePlan'), onPress: () => onDeletePlan && onDeletePlan(item.id), destructive: true },
  ];

  let dueLabel = null;
  let dueColor = colors.textSecondary;
  if (item.dueDate) {
    if (fullyDone) {
      dueLabel = t('planCompletedLabel');
      dueColor = accent;
    } else if (overdue) {
      dueLabel = t('planOverdueLabel', Math.abs(remaining));
      dueColor = colors.danger;
    } else if (remaining === 0) {
      dueLabel = t('planDueTodayLabel');
      dueColor = accent;
    } else {
      dueLabel = t('planDaysRemainingLabel', remaining);
    }
  }

  const periodLabel = formatPeriodLabel(item, t, locale);

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

        <View style={[styles.mainRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.colorDot, { backgroundColor: accent }]} />
          <View style={styles.info}>
            <View style={[styles.titleRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text
                style={[styles.name, { color: colors.text, textDecorationLine: fullyDone ? 'line-through' : 'none' }]}
                numberOfLines={1}
              >
                {'\ud83d\udcdd'} {item.title || t('untitledPlan')}
              </Text>
              {!!dueLabel && (
                <View style={[styles.dueBadge, { backgroundColor: withAlpha(dueColor, 0.14) }]}>
                  <Text style={{ color: dueColor, fontSize: 10, fontWeight: '700' }}>{dueLabel}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.periodText, { color: colors.textSecondary }]} numberOfLines={1}>
              {periodLabel}
            </Text>

            {!!item.description && (
              <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}

            {total > 0 && (
              <>
                <View style={[styles.barTrack, { backgroundColor: withAlpha(colors.text, 0.1) }]}>
                  <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: accent }]} />
                </View>
                <View style={[styles.progressRow, isRTL && { flexDirection: 'row-reverse' }]}>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                    {t('planPointsProgress', done, total)}
                  </Text>
                  {canExpand && (
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={colors.textSecondary} />
                  )}
                </View>
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
                borderColor: fullyDone ? accent : tokens.hairline,
                backgroundColor: fullyDone ? accent : 'transparent',
              },
            ]}
          >
            {fullyDone && <Ionicons name="checkmark" size={18} color={colors.onPrimary} />}
          </TouchableOpacity>
        </View>

        {expanded && (
          <View style={[styles.pointsList, { borderColor: withAlpha(colors.text, 0.08) }]}>
            {(item.points || []).map((point) => (
              <TouchableOpacity
                key={point.id}
                onPress={() => { Haptics.selectionAsync(); togglePoint(item.id, point.id); }}
                style={[styles.pointRow, isRTL && { flexDirection: 'row-reverse' }]}
              >
                <Ionicons
                  name={point.completed ? 'checkbox' : 'square-outline'}
                  size={17}
                  color={point.completed ? accent : colors.textSecondary}
                />
                <Text
                  numberOfLines={2}
                  style={[
                    styles.pointText,
                    {
                      color: colors.text,
                      textAlign: isRTL ? 'right' : 'left',
                      textDecorationLine: point.completed ? 'line-through' : 'none',
                      opacity: point.completed ? 0.55 : 0.92,
                    },
                  ]}
                >
                  {point.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </AnimatedPressable>
      <ActionSheet visible={menuVisible} onClose={() => setMenuVisible(false)} title={item.title} actions={menuActions} />
    </>
  );
}

export default React.memo(PlanningCard);

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: 10, overflow: 'hidden' },
  mainRow: { flexDirection: 'row', alignItems: 'center' },
  colorDot: { width: 8, height: 32, borderRadius: 4, marginRight: 12, alignSelf: 'flex-start', marginTop: 2 },
  info: { flex: 1, marginRight: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  dueBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  periodText: { fontSize: 11, marginTop: 3, fontWeight: '600' },
  description: { fontSize: 12, marginTop: 6 },
  barTrack: { height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  progressText: { fontSize: 11, fontWeight: '600' },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pointsList: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 4 },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 5 },
  pointText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
