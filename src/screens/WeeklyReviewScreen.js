import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import { useTasks } from '../context/TaskContext';
import { isDueOnDate, statusOf } from '../utils/streakUtils';
import { toKey, addDays } from '../utils/dateUtils';

export default function WeeklyReviewScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { habits } = useHabits();
  const { tasks } = useTasks();

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const today = new Date();

  // Last 7 days, oldest first, ending today.
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)), []);

  const dayStats = useMemo(
    () =>
      days.map((day) => {
        const key = toKey(day);
        const dueHabits = habits.filter((h) => !h.archived && isDueOnDate(h, day));
        const doneHabits = dueHabits.filter((h) => statusOf(h, key) === 'done');

        const dueTasks = tasks.filter((tk) => {
          if (tk.archived) return false;
          if (tk.taskType === 'recurring') return isDueOnDate(tk, day);
          return tk.dueDate === key;
        });
        const doneTasks = dueTasks.filter((tk) =>
          tk.taskType === 'recurring' ? statusOf(tk, key) === 'done' : tk.completed
        );

        const due = dueHabits.length + dueTasks.length;
        const done = doneHabits.length + doneTasks.length;
        return { day, key, due, done, ratio: due > 0 ? done / due : null };
      }),
    [days, habits, tasks]
  );

  const totals = useMemo(
    () => dayStats.reduce((acc, d) => ({ due: acc.due + d.due, done: acc.done + d.done }), { due: 0, done: 0 }),
    [dayStats]
  );

  const { bestDay, worstDay } = useMemo(() => {
    const withDue = dayStats.filter((d) => d.due > 0);
    if (withDue.length === 0) return { bestDay: null, worstDay: null };
    let best = withDue[0];
    let worst = withDue[0];
    for (const d of withDue) {
      if (d.ratio > best.ratio) best = d;
      if (d.ratio < worst.ratio) worst = d;
    }
    return { bestDay: best, worstDay: best === worst ? null : worst };
  }, [dayStats]);

  const weekdayLabels = t('weekdayShort');
  const rangeLabel = `${days[0].toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`;

  const barColor = (ratio) => {
    if (ratio === null) return colors.border;
    if (ratio >= 0.8) return '#00C853';
    if (ratio >= 0.4) return '#FFD60A';
    return '#FF5252';
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30 }}
    >
      <View style={[styles.headerRow, isRTL && { flexDirection: 'row-reverse' }]}>
        {navigation?.canGoBack?.() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={26} color={colors.text} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={[styles.title, { color: colors.text }]}>{t('weeklyReviewTitle')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{rangeLabel}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('weeklyReviewDailyBreakdown')}</Text>
        <View style={styles.barsRow}>
          {dayStats.map((d, i) => (
            <View key={d.key} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: d.ratio === null ? 4 : Math.max(6, d.ratio * 64),
                      backgroundColor: barColor(d.ratio),
                    },
                  ]}
                />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 10.5, marginTop: 6 }}>{weekdayLabels[d.day.getDay()]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: 26 }}>✅</Text>
          <Text style={{ color: colors.text, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
            {t('weeklyReviewCompleted', totals.done, totals.due)}
          </Text>
        </View>
        {bestDay && (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 26 }}>🌟</Text>
            <Text style={{ color: colors.text, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              {t('weeklyReviewBestDay')}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginTop: 2 }}>
              {bestDay.day.toLocaleDateString(locale, { weekday: 'long' })}
            </Text>
          </View>
        )}
      </View>

      {worstDay && (
        <View style={[styles.hintCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="bulb-outline" size={16} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginHorizontal: 8, flex: 1 }}>
            {t('weeklyReviewWorstDayHint', worstDay.day.toLocaleDateString(locale, { weekday: 'long' }))}
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={() => navigation.navigate('Agenda')}
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.onPrimary} />
        <Text style={{ color: colors.onPrimary, fontWeight: '700', marginHorizontal: 8 }}>
          {t('weeklyReviewPlanNext')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  backBtn: { padding: 4, marginLeft: -4 },
  title: { fontSize: 24, fontWeight: '800' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardLabel: { fontSize: 12, fontWeight: '700', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  barsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  barCol: { alignItems: 'center', width: 34 },
  barTrack: { height: 64, width: 14, justifyContent: 'flex-end' },
  barFill: { width: 14, borderRadius: 7 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16, alignItems: 'center' },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
});
