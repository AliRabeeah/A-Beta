import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import { getMonthMatrix, toKey, isSameDay } from '../utils/dateUtils';
import { isDueOnDate, statusOf } from '../utils/streakUtils';

const MONTHS_IN_YEAR = 12;

export default function YearInPixelsScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { habits } = useHabits();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const weekdayLabels = t('weekdayShort');

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);

  const ratioForDay = (day) => {
    if (day > today) return null; // future day, no data yet
    const due = activeHabits.filter((h) => isDueOnDate(h, day));
    if (due.length === 0) return null;
    const done = due.filter((h) => statusOf(h, toKey(day)) === 'done').length;
    return done / due.length;
  };

  const cellColor = (ratio) => {
    if (ratio === null) return colors.border;
    return withAlpha(colors.primary, 0.12 + ratio * 0.88);
  };

  // Best-weekday insight for the year so far, based on overall daily
  // completion ratio (a lightweight "smart insight" derived straight from
  // data we already have — no extra storage or computation needed).
  const insight = useMemo(() => {
    if (activeHabits.length === 0) return null;
    const weekdayTotals = Array(7).fill(0);
    const weekdayCounts = Array(7).fill(0);
    let cursor = new Date(year, 0, 1);
    const end = today < new Date(year, 11, 31) ? today : new Date(year, 11, 31);
    while (cursor <= end) {
      const ratio = ratioForDay(cursor);
      if (ratio !== null) {
        weekdayTotals[cursor.getDay()] += ratio;
        weekdayCounts[cursor.getDay()] += 1;
      }
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 1);
    }
    let bestIdx = -1;
    let bestAvg = -1;
    for (let i = 0; i < 7; i++) {
      if (weekdayCounts[i] < 2) continue; // not enough samples yet
      const avg = weekdayTotals[i] / weekdayCounts[i];
      if (avg > bestAvg) {
        bestAvg = avg;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) return null;
    return t('yearInPixelsBestWeekday', weekdayLabels[bestIdx], Math.round(bestAvg * 100));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHabits, year]);

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
        <Text style={[styles.title, { color: colors.text }]}>{t('yearInPixelsTitle')}</Text>
      </View>

      <View style={[styles.yearNav, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => setYear((y) => y - 1)} style={styles.yearBtn}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.yearLabel, { color: colors.text }]}>{year}</Text>
        <TouchableOpacity onPress={() => setYear((y) => y + 1)} style={styles.yearBtn}>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {insight && (
        <View style={[styles.insightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginHorizontal: 8, flex: 1 }}>{insight}</Text>
        </View>
      )}

      {Array.from({ length: MONTHS_IN_YEAR }, (_, m) => m).map((monthIndex) => {
        const weeks = getMonthMatrix(year, monthIndex);
        const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString(locale, { month: 'long' });
        return (
          <View key={monthIndex} style={[styles.monthCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 10 }}>{monthLabel}</Text>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((day, di) => {
                  if (!day) return <View key={di} style={styles.pixel} />;
                  const isToday = isSameDay(day, today);
                  return (
                    <View
                      key={di}
                      style={[
                        styles.pixel,
                        styles.pixelBox,
                        { backgroundColor: cellColor(ratioForDay(day)) },
                        isToday && { borderWidth: 1.5, borderColor: colors.text },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  backBtn: { padding: 4, marginLeft: -4 },
  title: { fontSize: 24, fontWeight: '800' },
  yearNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 14 },
  yearBtn: { padding: 6 },
  yearLabel: { fontSize: 17, fontWeight: '700', minWidth: 60, textAlign: 'center' },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  monthCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 12, marginBottom: 12 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  pixel: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  pixelBox: { borderRadius: 4 },
});
