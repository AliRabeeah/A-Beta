import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import CalendarHeatmap from '../components/CalendarHeatmap';
import { getCurrentStreak, getBestStreak, getCompletionRate, getWeekProgress } from '../utils/streakUtils';
import { toKey } from '../utils/dateUtils';

function formatMinutes(seconds) {
  return Math.round(seconds / 60);
}
function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function HabitDetailScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { habits, setCompletionStatus, addToValue, logTimerSeconds, setChecklistItem, archiveHabit, unarchiveHabit } = useHabits();
  const habit = habits.find((h) => h.id === route.params.habitId);

  // --- Live stopwatch state for timer-type habits (counts up, logs on stop) ---
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => () => intervalRef.current && clearInterval(intervalRef.current), []);

  if (!habit) return null;

  const todayKey = toKey(new Date());
  const current = getCurrentStreak(habit);
  const best = getBestStreak(habit);
  const rate = getCompletionRate(habit, 30);
  const week = getWeekProgress(habit);

  const handleArchiveToggle = () => {
    if (habit.archived) {
      unarchiveHabit(habit.id);
    } else {
      Alert.alert(t('archiveHabitTitle'), t('archiveHabitBody'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('archive'),
          onPress: async () => {
            await archiveHabit(habit.id);
            navigation.goBack();
          },
        },
      ]);
    }
  };

  const startStopwatch = () => {
    setRunning(true);
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const stopStopwatch = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    if (elapsed > 0) {
      logTimerSeconds(habit.id, elapsed);
      setElapsed(0);
    }
  };

  const todayValue = habit.values?.[todayKey] || 0;
  const todayChecklist = habit.checklist?.[todayKey] || {};

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>{habit.icon} {habit.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleArchiveToggle}>
            <Ionicons name={habit.archived ? 'arrow-undo-outline' : 'archive-outline'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AddEditHabit', { habitId: habit.id })}>
            <Ionicons name="pencil" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label={t('current')} value={`${current}🔥`} colors={colors} />
        <Stat label={t('best')} value={best} colors={colors} />
        <Stat label={t('thisWeek')} value={`${week.done}/${week.due}`} colors={colors} />
        <Stat label={t('rate30')} value={`${rate}%`} colors={colors} />
      </View>

      {habit.evaluationType === 'numeric' && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('todayLabel')}</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity onPress={() => addToValue(habit.id, -1)} style={[styles.stepBtn, { borderColor: colors.border }]}>
              <Ionicons name="remove" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.stepperValue, { color: colors.text }]}>
              {todayValue}{habit.numericUnit ? ` ${habit.numericUnit}` : ''}
            </Text>
            <TouchableOpacity onPress={() => addToValue(habit.id, 1)} style={[styles.stepBtn, { borderColor: colors.border }]}>
              <Ionicons name="add" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.goalHint, { color: colors.textSecondary }]}>
            {t('goalHint', habit.numericGoal, habit.numericUnit || '')}
          </Text>
        </View>
      )}

      {habit.evaluationType === 'timer' && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('todayLabel')}</Text>
          <Text style={[styles.stopwatchClock, { color: colors.text }]}>
            {running ? formatClock(elapsed) : `${formatMinutes(todayValue)} / ${habit.timerGoalMinutes} min`}
          </Text>
          <TouchableOpacity
            onPress={running ? stopStopwatch : startStopwatch}
            style={[styles.primaryBtn, { backgroundColor: running ? colors.surfaceElevated : habit.color }]}
          >
            <Ionicons name={running ? 'stop' : 'play'} size={18} color={running ? colors.text : colors.onPrimary} />
            <Text style={{ color: running ? colors.text : colors.onPrimary, fontWeight: '700', marginLeft: 6 }}>
              {running ? t('stopAndLog') : t('startTimer')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {habit.evaluationType === 'checklist' && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('todayLabel')}</Text>
          {(habit.checklistItems || []).map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setChecklistItem(habit.id, item.id, !todayChecklist[item.id])}
              style={styles.checklistRow}
            >
              <Ionicons
                name={todayChecklist[item.id] ? 'checkbox' : 'square-outline'}
                size={22}
                color={todayChecklist[item.id] ? habit.color : colors.textSecondary}
              />
              <Text style={{ color: colors.text, marginLeft: 10, fontSize: 15 }}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <CalendarHeatmap
          habit={habit}
          onDayPress={(date) => setCompletionStatus(habit.id, 'done', date)}
          onDayLongPress={(date) => setCompletionStatus(habit.id, 'skipped', date)}
        />
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('calendarHint')}</Text>
    </ScrollView>
  );
}

function Stat({ label, value, colors }) {
  return (
    <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  title: { fontSize: 24, fontWeight: '800', flexShrink: 1 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statBox: { flexGrow: 1, minWidth: '45%', borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontSize: 22, fontWeight: '800', minWidth: 90, textAlign: 'center' },
  goalHint: { fontSize: 12, textAlign: 'center', marginTop: 10 },
  stopwatchClock: { fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 14, fontVariant: ['tabular-nums'] },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
});
