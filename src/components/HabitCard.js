import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useTokens, withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { getCurrentStreak, statusOf, getAvoidStreak } from '../utils/streakUtils';
import { toKey } from '../utils/dateUtils';
import { useTapGesture } from '../utils/tapGesture';
import { useHabits } from '../context/HabitContext';
import AnimatedPressable from './AnimatedPressable';
import ActionSheet from './ActionSheet';
import ChecklistQuickView from './ChecklistQuickView';
import RelapseModal from './RelapseModal';

export default function HabitCard({ habit, onDone, onSkip, onIncrement, onArchive, onDelete, onPress, onToggleChecklistItem, onReorderRequest, date = new Date(), index = 0 }) {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t } = useLanguage();
  const todayKey = toKey(date);
  const status = statusOf(habit, todayKey); // 'done' | 'skipped' | null
  const streak = getCurrentStreak(habit);
  const evaluationType = habit.evaluationType || 'yesno';

  let progressText = null;
  let incrementStep = null;
  let progressRatio = null;
  if (evaluationType === 'numeric') {
    const value = habit.values?.[todayKey] || 0;
    const goal = habit.numericGoal || 0;
    progressText = `${value}/${goal}${habit.numericUnit ? ' ' + habit.numericUnit : ''}`;
    progressRatio = goal > 0 ? Math.min(1, value / goal) : 0;
    incrementStep = 1;
  } else if (evaluationType === 'timer') {
    const seconds = habit.values?.[todayKey] || 0;
    const goalMin = habit.timerGoalMinutes || 0;
    progressText = `${Math.round(seconds / 60)}/${goalMin} min`;
    progressRatio = goalMin > 0 ? Math.min(1, seconds / (goalMin * 60)) : 0;
    incrementStep = 300; // +5 min quick add
  } else if (evaluationType === 'checklist') {
    const dayState = habit.checklist?.[todayKey] || {};
    const total = (habit.checklistItems || []).length;
    const doneCount = (habit.checklistItems || []).filter((it) => dayState[it.id]).length;
    progressText = `${doneCount}/${total}`;
    progressRatio = total > 0 ? doneCount / total : 0;
  }

  const { logRelapse } = useHabits();
  const isAvoid = habit.kind === 'avoid';
  const avoidStreak = isAvoid ? getAvoidStreak(habit, date) : 0;
  const [relapseModalVisible, setRelapseModalVisible] = useState(false);

  const handleConfirmRelapse = async (note) => {
    await logRelapse(habit.id, note, date);
    setRelapseModalVisible(false);
  };

  const [menuVisible, setMenuVisible] = useState(false);
  const [checklistViewVisible, setChecklistViewVisible] = useState(false);

  const handleSingleTap = () => {
    if (isAvoid) return; // avoid habits aren't toggled by tapping — see relapse button
    if (evaluationType === 'checklist') setChecklistViewVisible(true);
    else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onDone && onDone();
    }
  };

  const handleDoubleTap = () => {
    if (isAvoid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip && onSkip();
  };

  const handlePress = useTapGesture({ onSingleTap: handleSingleTap, onDoubleTap: handleDoubleTap });
  const handleLongPress = () => {
    Haptics.selectionAsync();
    setMenuVisible(true);
  };

  const menuActions = [
    ...(isAvoid ? [] : [{ icon: 'play-skip-forward-outline', label: t('skipLabel'), onPress: onSkip }]),
    { icon: 'archive-outline', label: t('archive'), onPress: onArchive },
    { icon: 'eye-outline', label: t('viewDetails'), onPress: onPress },
    ...(onReorderRequest ? [{ icon: 'swap-vertical-outline', label: t('reorderItems'), onPress: onReorderRequest }] : []),
    { icon: 'trash-outline', label: t('delete'), onPress: onDelete, destructive: true },
  ];

  const accent = habit.color || colors.primary;

  return (
    <>
    <AnimatedPressable
      index={index}
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={[styles.card, tokens.glass.card, tokens.shadow.soft]}
    >
      {/* Ambient accent glow in the corner, bento-style */}
      <LinearGradient
        colors={[withAlpha(accent, 0.16), 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.colorDot, { backgroundColor: accent }]} />
      <View style={styles.info}>
        <Text
          style={[
            styles.name,
            { color: colors.text, textDecorationLine: status === 'done' ? 'line-through' : 'none' },
          ]}
        >
          {habit.icon} {habit.name}
        </Text>
        {isAvoid ? (
          <Text style={[styles.streak, { color: colors.textSecondary }]}>🛡️ {t('daysWithoutLabel', avoidStreak, habit.name)}</Text>
        ) : progressText ? (
          <View style={styles.progressRow}>
            <Text style={[styles.streak, { color: colors.textSecondary }]}>{progressText}</Text>
            {progressRatio !== null && (
              <View style={[styles.miniTrack, { backgroundColor: withAlpha(colors.text, 0.08) }]}>
                <View style={[styles.miniFill, { width: `${progressRatio * 100}%`, backgroundColor: accent }]} />
              </View>
            )}
          </View>
        ) : streak > 0 ? (
          <Text style={[styles.streak, { color: colors.textSecondary }]}>🔥 {t('dayStreak', streak)}</Text>
        ) : null}
      </View>

      {isAvoid ? (
        <TouchableOpacity
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setRelapseModalVisible(true);
          }}
          style={[styles.iconBtn, { borderColor: colors.danger, backgroundColor: withAlpha(colors.danger, 0.08) }]}
        >
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
        </TouchableOpacity>
      ) : (
        evaluationType !== 'yesno' && evaluationType !== 'checklist' && (
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onIncrement && onIncrement(incrementStep);
            }}
            style={[styles.iconBtn, { borderColor: tokens.hairline, backgroundColor: withAlpha(colors.text, 0.04) }]}
          >
            <Ionicons name="add" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )
      )}

      {isAvoid ? (
        <View style={[styles.checkbox, { borderColor: tokens.hairline, backgroundColor: 'transparent' }]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
        </View>
      ) : (
      <View
        style={[
          styles.checkbox,
          {
            borderColor: status === 'done' ? accent : tokens.hairline,
            backgroundColor: status === 'done' ? accent : 'transparent',
          },
          status === 'done' && tokens.glow(accent),
        ]}
      >
        {status === 'done' && <Ionicons name="checkmark" size={18} color={colors.onPrimary} />}
        {status === 'skipped' && <Ionicons name="play-skip-forward" size={14} color={colors.textSecondary} />}
      </View>
      )}
    </AnimatedPressable>
    <ActionSheet visible={menuVisible} onClose={() => setMenuVisible(false)} title={habit.name} actions={menuActions} />
    <RelapseModal visible={relapseModalVisible} onClose={() => setRelapseModalVisible(false)} onConfirm={handleConfirmRelapse} />
    <ChecklistQuickView
      visible={checklistViewVisible}
      onClose={() => setChecklistViewVisible(false)}
      habit={habit}
      date={date}
      onToggleItem={(itemId, checked) => onToggleChecklistItem && onToggleChecklistItem(itemId, checked)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10, overflow: 'hidden' },
  colorDot: { width: 8, height: 32, borderRadius: 4, marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  progressRow: { marginTop: 6, gap: 5 },
  streak: { fontSize: 12 },
  miniTrack: { height: 4, borderRadius: 2, overflow: 'hidden', width: '70%' },
  miniFill: { height: '100%', borderRadius: 2 },
  iconBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
