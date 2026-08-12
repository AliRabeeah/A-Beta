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
import { pointsProgress, isPlanFullyCompleted, daysUntilDue, isPlanOverdue } from '../utils/planningUtils';

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
  const { t, isRTL } = useLanguage();
  const accent = item.color || colors.primary;

  const [menuVisible, setMenuVisible] = useState(false);

  const { done, total, percent } = pointsProgress(item);
  const fullyDone = isPlanFullyCompleted(item);
  const overdue = isPlanOverdue(item, date);
  const remaining = daysUntilDue(item, date);

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
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {t('planPointsProgress', done, total)}
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
              borderColor: fullyDone ? accent : tokens.hairline,
              backgroundColor: fullyDone ? accent : 'transparent',
            },
          ]}
        >
          {fullyDone && <Ionicons name="checkmark" size={18} color={colors.onPrimary} />}
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
  dueBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  description: { fontSize: 12, marginTop: 6 },
  barTrack: { height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, marginTop: 6, fontWeight: '600' },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
