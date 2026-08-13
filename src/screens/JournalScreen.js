import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { useJournal } from '../context/JournalContext';
import { getMonthMatrix, toKey } from '../utils/dateUtils';
import { computeStreak, sortedEntryList, hasContent, wordCount } from '../utils/journalUtils';
import JournalUnlockGate from '../components/journal/JournalUnlockGate';

export default function JournalScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const { entries } = useJournal();
  const insets = useSafeAreaInsets();
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  const [unlocked, setUnlocked] = useState(false);
  const [cursor, setCursor] = useState(new Date());

  // Every entry into this screen re-asks for authentication -- unlike
  // notes (locked per-note), the whole Journal section is treated as one
  // sensitive area, so leaving it (tab switch, back, backgrounding) means
  // coming back always re-gates rather than staying open indefinitely.
  useFocusEffect(
    useCallback(() => {
      return () => setUnlocked(false);
    }, [])
  );

  usePreventScreenCapture('journal-screen');

  const today = new Date();
  const todayKey = toKey(today);
  const todayEntry = entries[todayKey];
  const streak = useMemo(() => computeStreak(entries, today), [entries]);
  const recentEntries = useMemo(() => sortedEntryList(entries).slice(0, 20), [entries]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const weeks = useMemo(() => getMonthMatrix(year, month), [year, month]);
  const monthName = cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const weekdayLabels = t('weekdayShort');

  const changeMonth = (delta) => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + delta);
    setCursor(d);
  };

  const openEntry = useCallback((dateKey) => {
    navigation.navigate('JournalEntry', { dateKey });
  }, [navigation]);

  if (!unlocked) {
    return <JournalUnlockGate onUnlock={() => setUnlocked(true)} onCancel={() => navigation.goBack()} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('journalTitle')}</Text>
        {streak > 0 ? (
          <View style={[styles.streakBadge, { backgroundColor: withAlpha(colors.primary, 0.14) }, isRTL && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="flame" size={13} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{streak}</Text>
          </View>
        ) : (
          <View style={{ width: 26 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); openEntry(todayKey); }}
          style={[styles.todayCard, { backgroundColor: withAlpha(colors.primary, 0.1), borderColor: withAlpha(colors.primary, 0.25) }]}
        >
          <Ionicons name={hasContent(todayEntry) ? 'create' : 'add-circle'} size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, textAlign: isRTL ? 'right' : 'left' }}>
              {hasContent(todayEntry) ? t('journalContinueToday') : t('journalWriteToday')}
            </Text>
            {hasContent(todayEntry) && (
              <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                {todayEntry.content}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={[styles.calendarHeader, isRTL && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity onPress={() => changeMonth(-1)} hitSlop={8}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: colors.text }]}>{monthName}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} hitSlop={8}>
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
              const key = toKey(day);
              const entry = entries[key];
              const isFuture = day > today;
              const isToday = key === todayKey;
              return (
                <TouchableOpacity
                  key={di}
                  disabled={isFuture}
                  onPress={() => { Haptics.selectionAsync(); openEntry(key); }}
                  style={styles.dayCell}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      {
                        backgroundColor: hasContent(entry) ? withAlpha(colors.primary, 0.18) : 'transparent',
                        borderWidth: isToday ? 1.5 : 0,
                        borderColor: colors.primary,
                        opacity: isFuture ? 0.3 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: hasContent(entry) ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: hasContent(entry) ? '800' : '400' }}>
                      {day.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {recentEntries.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('journalRecentEntries')}</Text>
            {recentEntries.map((entry) => (
              <TouchableOpacity
                key={entry.date}
                onPress={() => openEntry(entry.date)}
                style={[styles.entryRow, { borderColor: colors.border }, isRTL && { flexDirection: 'row-reverse' }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, textAlign: isRTL ? 'right' : 'left' }}>
                    {new Date(entry.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </Text>
                  <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                    {entry.content}
                  </Text>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{t('journalWordCountShort', wordCount(entry.content))}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  todayCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 20 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  monthLabel: { fontSize: 16, fontWeight: '700' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  weekdayLabel: { width: 34, textAlign: 'center', fontSize: 11 },
  dayCell: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginTop: 24, marginBottom: 10, letterSpacing: 0.5 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
