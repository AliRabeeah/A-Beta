import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTokens, withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import { getCurrentStreak, getBestStreak, statusOf } from '../utils/streakUtils';
import { toKey, addDays } from '../utils/dateUtils';

export default function StatsScreen({ navigation }) {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t, language } = useLanguage();
  const { habits: allHabits } = useHabits();
  const habits = allHabits.filter((h) => !h.archived);
  const insets = useSafeAreaInsets();
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  const last7 = Array.from({ length: 7 }).map((_, i) => addDays(new Date(), -(6 - i)));
  const dayCompletion = last7.map((date) => {
    const key = toKey(date);
    const total = habits.length || 1;
    const done = habits.filter((h) => statusOf(h, key) === 'done').length;
    return { date, pct: Math.round((done / total) * 100) };
  });

  const sorted = [...habits].sort((a, b) => getCurrentStreak(b) - getCurrentStreak(a));

  const weeklyAvg = useMemo(
    () => Math.round(dayCompletion.reduce((sum, d) => sum + d.pct, 0) / dayCompletion.length),
    [dayCompletion]
  );
  const bestActiveStreak = useMemo(
    () => (sorted.length > 0 ? getCurrentStreak(sorted[0]) : 0),
    [sorted]
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20 }}>
      <View style={styles.headerRow}>
        {navigation?.canGoBack?.() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: colors.text }]}>{t('statsTitle')}</Text>
      </View>

      {/* Bento summary row: two small glass tiles side by side */}
      <View style={styles.bentoRow}>
        <View style={[styles.bentoTile, tokens.glass.card]}>
          <LinearGradient
            colors={tokens.gradient(colors.primary)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bentoGlow}
          />
          <Text style={[styles.bentoValue, { color: colors.text }]}>{weeklyAvg}%</Text>
          <Text style={[styles.bentoLabel, { color: colors.textSecondary }]}>{t('last7Days')}</Text>
        </View>
        <View style={[styles.bentoTile, tokens.glass.card]}>
          <LinearGradient
            colors={tokens.gradient('#00E676')}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bentoGlow}
          />
          <Text style={[styles.bentoValue, { color: colors.text }]}>🔥 {bestActiveStreak}</Text>
          <Text style={[styles.bentoLabel, { color: colors.textSecondary }]}>{t('dayStreak', bestActiveStreak)}</Text>
        </View>
      </View>

      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('last7Days')}</Text>
      <View style={[styles.chartCard, tokens.glass.card]}>
        <View style={styles.barsRow}>
          {dayCompletion.map((d, i) => (
            <View key={i} style={styles.barCol}>
              <View style={[styles.barTrack, { backgroundColor: withAlpha(colors.text, 0.06) }]}>
                <LinearGradient
                  colors={tokens.gradient(colors.primary)}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 0, y: 0 }}
                  style={[styles.barFill, { height: `${Math.max(4, d.pct)}%` }]}
                />
              </View>
              <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
                {d.date.toLocaleDateString(locale, { weekday: 'narrow' })}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('leaderboard')}</Text>
      {sorted.length === 0 ? (
        <Text style={{ color: colors.textSecondary }}>{t('noHabitsYet')}</Text>
      ) : (
        <View style={[styles.leaderCard, tokens.glass.card]}>
          {sorted.map((h, idx) => (
            <View
              key={h.id}
              style={[
                styles.leaderRow,
                idx < sorted.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.hairline },
              ]}
            >
              <Text style={{ color: colors.text, fontSize: 15 }}>{h.icon} {h.name}</Text>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('best')} {getBestStreak(h)}</Text>
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>{getCurrentStreak(h)} 🔥</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  backBtn: { padding: 4, marginLeft: -4 },
  title: { fontSize: 30, fontWeight: '800' },
  section: { fontSize: 12, fontWeight: '700', marginTop: 20, marginBottom: 10, letterSpacing: 0.5 },
  bentoRow: { flexDirection: 'row', gap: 12 },
  bentoTile: { flex: 1, padding: 16, overflow: 'hidden' },
  bentoGlow: { position: 'absolute', top: 0, right: 0, width: 90, height: 60, opacity: 0.35 },
  bentoValue: { fontSize: 22, fontWeight: '800' },
  bentoLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  chartCard: { padding: 16 },
  barsRow: { flexDirection: 'row', justifyContent: 'space-between', height: 120 },
  barCol: { alignItems: 'center', flex: 1 },
  barTrack: { width: 18, height: 90, borderRadius: 9, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 9 },
  barLabel: { fontSize: 11, marginTop: 6 },
  leaderCard: { paddingHorizontal: 14 },
  leaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
});
