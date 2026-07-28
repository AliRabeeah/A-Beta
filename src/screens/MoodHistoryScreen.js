import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useMood } from '../context/MoodContext';
import { getMonthMatrix, toKey } from '../utils/dateUtils';

// Same 1-5 palette as the mood emoji picker, from worst to best.
const MOOD_COLORS = { 1: '#FF453A', 2: '#FF9F0A', 3: '#8E8E93', 4: '#64D2FF', 5: '#00E676' };
const MOOD_EMOJI = { 1: '😞', 2: '🙁', 3: '😐', 4: '🙂', 5: '😄' };

export default function MoodHistoryScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const { moods } = useMood();
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => {
    navigation.setOptions({ title: t('moodHistoryTitle') });
  }, [navigation, t]);

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
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}>
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
            const entry = moods[toKey(day)];
            const isFuture = day > new Date();
            return (
              <View key={di} style={styles.dayCell}>
                <View
                  style={[
                    styles.dayCircle,
                    { backgroundColor: entry ? MOOD_COLORS[entry.mood] + '33' : 'transparent', opacity: isFuture ? 0.3 : 1 },
                  ]}
                >
                  {entry ? (
                    <Text style={{ fontSize: 14 }}>{MOOD_EMOJI[entry.mood]}</Text>
                  ) : (
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{day.getDate()}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  monthLabel: { fontSize: 18, fontWeight: '700' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  weekdayLabel: { width: 36, textAlign: 'center', fontSize: 11 },
  dayCell: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
