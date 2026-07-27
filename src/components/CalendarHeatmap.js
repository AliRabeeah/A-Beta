import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getMonthMatrix, toKey } from '../utils/dateUtils';
import { isDueOnDate, statusOf } from '../utils/streakUtils';

/**
 * Tap a day to mark it Done (or clear it if already Done).
 * Long-press a day to mark it Skipped (or clear it if already Skipped).
 */
export default function CalendarHeatmap({ habit, onDayPress, onDayLongPress }) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const weeks = getMonthMatrix(year, month);
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const monthName = cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const weekdayLabels = t('weekdayShort');

  const changeMonth = (delta) => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + delta);
    setCursor(d);
  };

  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => changeMonth(-1)}>
          <Ionicons name={language === 'ar' ? 'chevron-forward' : 'chevron-back'} size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.text }]}>{monthName}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)}>
          <Ionicons name={language === 'ar' ? 'chevron-back' : 'chevron-forward'} size={22} color={colors.text} />
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
            const key = toKey(day);
            const status = statusOf(habit, key); // 'done' | 'skipped' | null
            const due = isDueOnDate(habit, day);
            const isFuture = day > new Date();

            let bg = 'transparent';
            let borderColor = 'transparent';
            let textColor = colors.text;
            if (status === 'done') {
              bg = habit.color;
              textColor = colors.onPrimary;
            } else if (status === 'skipped') {
              borderColor = habit.color;
              textColor = colors.textSecondary;
            } else if (due) {
              bg = colors.surfaceElevated;
            }

            return (
              <TouchableOpacity
                key={di}
                style={styles.dayCell}
                disabled={isFuture || !due}
                onPress={() => onDayPress(day)}
                onLongPress={() => onDayLongPress && onDayLongPress(day)}
              >
                <View
                  style={[
                    styles.dayCircle,
                    { backgroundColor: bg, borderWidth: status === 'skipped' ? 1.5 : 0, borderColor, opacity: isFuture ? 0.3 : 1 },
                  ]}
                >
                  <Text style={{ color: textColor, fontSize: 12 }}>{day.getDate()}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthLabel: { fontSize: 16, fontWeight: '600' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  weekdayLabel: { width: 36, textAlign: 'center', fontSize: 11 },
  dayCell: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
