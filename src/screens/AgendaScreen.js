import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import { useTasks } from '../context/TaskContext';
import { usePlanning } from '../context/PlanningContext';
import { useChallenges } from '../context/ChallengeContext';
import { getMonthMatrix, toKey, isSameDay } from '../utils/dateUtils';
import { isDueOnDate } from '../utils/streakUtils';
import { isDueOnDate as isPlanningDueOnDate } from '../utils/planningUtils';

function isTaskDueOnDate(task, date, dateKey) {
  if (task.taskType === 'recurring') return isDueOnDate(task, date);
  if (task.dueDate === dateKey) return true;
  if (task.isPending && !task.completed && task.dueDate && dateKey > task.dueDate) return true;
  return false;
}

export default function AgendaScreen({ navigation, embedded = false }) {
  const { colors } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  const { habits } = useHabits();
  const { tasks } = useTasks();
  const { planningItems } = usePlanning();
  const { challenges } = useChallenges();

  const [cursor, setCursor] = useState(new Date());
  const today = new Date();
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const monthName = cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const weekdayLabels = t('weekdayShort');
  const weeks = useMemo(() => getMonthMatrix(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  const activeChallengesCount = useMemo(
    () => challenges.filter((c) => !c.archived && c.status === 'active').length,
    [challenges]
  );

  const countsForDay = useCallback(
    (day) => {
      const key = toKey(day);
      const habitCount = habits.filter((h) => !h.archived && isDueOnDate(h, day)).length;
      const taskCount = tasks.filter((tk) => !tk.archived && isTaskDueOnDate(tk, day, key)).length;
      const planCount = planningItems.filter((p) => !p.archived && isPlanningDueOnDate(p, day)).length;
      return { habitCount, taskCount, planCount, total: habitCount + taskCount + planCount };
    },
    [habits, tasks, planningItems]
  );

  const changeMonth = (delta) => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + delta);
    setCursor(d);
  };

  const goToDay = (day) => {
    navigation.navigate('Today', { jumpToDate: toKey(day) });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingTop: embedded ? 4 : insets.top + 20, paddingBottom: insets.bottom + 30 }}
    >
      {!embedded && (
        <View style={[styles.headerRow, isRTL && { flexDirection: 'row-reverse' }]}>
          {navigation?.canGoBack?.() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={26} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { color: colors.text }]}>{t('agendaTitle')}</Text>
        </View>
      )}

      {activeChallengesCount > 0 && (
        <View style={[styles.challengeBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="trophy-outline" size={16} color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginHorizontal: 8 }}>
            {t('agendaActiveChallenges', activeChallengesCount)}
          </Text>
        </View>
      )}

      <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: colors.text }]}>{monthName}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {weekdayLabels.map((d, i) => (
            <Text key={i} style={[styles.weekdayLabel, { color: colors.textSecondary }]}>{d}</Text>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              if (!day) return <View key={di} style={styles.dayCell} />;
              const { total } = countsForDay(day);
              const isToday = isSameDay(day, today);

              return (
                <TouchableOpacity key={di} style={styles.dayCell} onPress={() => goToDay(day)}>
                  <View
                    style={[
                      styles.dayCircle,
                      isToday && { borderWidth: 1.5, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: isToday ? '800' : '400' }}>
                      {day.getDate()}
                    </Text>
                  </View>
                  {total > 0 && (
                    <View style={[styles.dot, { backgroundColor: colors.primary, opacity: Math.min(1, 0.4 + total * 0.15) }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('agendaHint')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backBtn: { padding: 4, marginLeft: -4 },
  title: { fontSize: 28, fontWeight: '800' },
  challengeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  calendarCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  monthBtn: { padding: 6 },
  monthLabel: { fontSize: 16, fontWeight: '700' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  weekdayLabel: { width: 38, textAlign: 'center', fontSize: 11 },
  dayCell: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 16 },
});
