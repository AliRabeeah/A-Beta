import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import { exportStatsToFile } from '../utils/statsExport';
import StatsScreen from './StatsScreen';
import AgendaScreen from './AgendaScreen';
import WeeklyReviewScreen from './WeeklyReviewScreen';
import YearInPixelsScreen from './YearInPixelsScreen';

// The four sections merged here (Stats, Agenda, Weekly Review, Year in
// Pixels) all read from the same underlying habit/task data and answer the
// same broad question — "how am I doing?" — just at a different zoom level
// (right now / this week / this year). Combining them into one segmented
// section means the person only has one place to look, and can flip
// between zoom levels without leaving the screen.
const SEGMENTS = [
  { id: 'stats', icon: 'bar-chart-outline', labelKey: 'statsTitle' },
  { id: 'agenda', icon: 'calendar-outline', labelKey: 'agendaTitle' },
  { id: 'weeklyReview', icon: 'stats-chart-outline', labelKey: 'weeklyReviewTitle' },
  { id: 'yearInPixels', icon: 'grid-outline', labelKey: 'yearInPixelsTitle' },
];

export default function InsightsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { habits: allHabits } = useHabits();
  const [exporting, setExporting] = useState(false);

  const [activeTab, setActiveTab] = useState(route?.params?.initialTab || 'stats');

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportStatsToFile(allHabits.filter((h) => !h.archived));
    } catch (e) {
      Alert.alert(t('statsExportFailed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 16 }, isRTL && { flexDirection: 'row-reverse' }]}>
        {navigation?.canGoBack?.() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={26} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: colors.text }]}>{t('insightsTitle')}</Text>
        <View style={{ flex: 1 }} />
        {activeTab === 'stats' && (
          <TouchableOpacity onPress={handleExport} disabled={exporting} style={styles.exportBtn}>
            {exporting ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Ionicons name="share-outline" size={22} color={colors.text} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.segmentScroll}
        contentContainerStyle={[styles.segmentRow, isRTL && { flexDirection: 'row-reverse' }]}
      >
        {SEGMENTS.map((seg) => {
          const active = activeTab === seg.id;
          return (
            <TouchableOpacity
              key={seg.id}
              onPress={() => setActiveTab(seg.id)}
              style={[
                styles.segment,
                {
                  backgroundColor: active ? withAlpha(colors.primary, 0.16) : withAlpha(colors.textSecondary, 0.08),
                  borderColor: active ? colors.primary : 'transparent',
                },
              ]}
            >
              <Ionicons name={seg.icon} size={15} color={active ? colors.primary : colors.textSecondary} />
              <Text style={[styles.segmentLabel, { color: active ? colors.primary : colors.textSecondary }]}>
                {t(seg.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1 }}>
        {activeTab === 'stats' && <StatsScreen navigation={navigation} embedded onNavigateTab={setActiveTab} />}
        {activeTab === 'agenda' && <AgendaScreen navigation={navigation} embedded />}
        {activeTab === 'weeklyReview' && (
          <WeeklyReviewScreen navigation={navigation} embedded onNavigateTab={setActiveTab} />
        )}
        {activeTab === 'yearInPixels' && <YearInPixelsScreen navigation={navigation} embedded />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { marginRight: 8, padding: 2 },
  title: { fontSize: 22, fontWeight: '700' },
  exportBtn: { padding: 6, marginLeft: 6 },
  segmentScroll: { flexGrow: 0, paddingBottom: 12 },
  segmentRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  segmentLabel: { fontSize: 13, fontWeight: '600' },
});
