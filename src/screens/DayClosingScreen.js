import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import { useTasks } from '../context/TaskContext';
import { useMood } from '../context/MoodContext';
import { isDueOnDate, statusOf } from '../utils/streakUtils';
import { toKey, addDays } from '../utils/dateUtils';
import { setDayClosingCompletedDate } from '../utils/dayClosingSettings';

const MOODS = [
  { level: 1, emoji: '😞' },
  { level: 2, emoji: '🙁' },
  { level: 3, emoji: '😐' },
  { level: 4, emoji: '🙂' },
  { level: 5, emoji: '😄' },
];

export default function DayClosingScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { habits } = useHabits();
  const { tasks, addTask } = useTasks();
  const { getMoodForDate, setMoodForDate } = useMood();

  const [step, setStep] = useState(0);
  const [mood, setMood] = useState(getMoodForDate(new Date())?.mood || null);
  const [priorityText, setPriorityText] = useState('');

  const todayKey = toKey(new Date());
  const tomorrowKey = toKey(addDays(new Date(), 1));

  const { habitsDone, habitsTotal, tasksDone, tasksTotal } = useMemo(() => {
    const dueHabits = habits.filter((h) => !h.archived && isDueOnDate(h, new Date()));
    const doneHabits = dueHabits.filter((h) => statusOf(h, todayKey) === 'done');

    // Simplified "due today" check for the summary: single tasks due today,
    // plus recurring tasks due today — mirrors TodayScreen's logic without
    // its pending-carryover edge case, which doesn't matter for a one-line
    // end-of-day tally.
    const dueTasks = tasks.filter((tk) => {
      if (tk.archived) return false;
      if (tk.taskType === 'recurring') return isDueOnDate(tk, new Date());
      return tk.dueDate === todayKey;
    });
    const doneTasks = dueTasks.filter((tk) => (tk.taskType === 'recurring' ? statusOf(tk, todayKey) === 'done' : tk.completed));

    return { habitsDone: doneHabits.length, habitsTotal: dueHabits.length, tasksDone: doneTasks.length, tasksTotal: dueTasks.length };
  }, [habits, tasks, todayKey]);

  const goNext = () => {
    Haptics.selectionAsync();
    setStep((s) => Math.min(2, s + 1));
  };
  const goBackStep = () => setStep((s) => Math.max(0, s - 1));

  const handleSelectMood = async (level) => {
    Haptics.selectionAsync();
    setMood(level);
    await setMoodForDate(level, '');
  };

  const handleFinish = async () => {
    if (priorityText.trim()) {
      await addTask({
        title: priorityText.trim(),
        taskType: 'single',
        categoryId: 'task',
        isPriority: true,
        dueDate: tomorrowKey,
      });
    }
    await setDayClosingCompletedDate(todayKey);
    navigation.goBack();
  };

  const stepTitles = [t('dayClosingStep1Title'), t('dayClosingStep2Title'), t('dayClosingStep3Title')];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 20 }]}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === step ? colors.primary : colors.border }]} />
          ))}
        </View>
        <View style={{ width: 26 }} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{t('dayClosingTitle')}</Text>
      <Text style={[styles.stepTitle, { color: colors.textSecondary }]}>{stepTitles[step]}</Text>

      <View style={styles.content}>
        {step === 0 && (
          <View style={styles.summaryBox}>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: 28 }}>🔥</Text>
              <Text style={{ color: colors.text, fontSize: 15, marginTop: 8, textAlign: 'center' }}>
                {t('dayClosingSummaryHabits', habitsDone, habitsTotal)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: 28 }}>✅</Text>
              <Text style={{ color: colors.text, fontSize: 15, marginTop: 8, textAlign: 'center' }}>
                {t('dayClosingSummaryTasks', tasksDone, tasksTotal)}
              </Text>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.moodRow}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.level}
                onPress={() => handleSelectMood(m.level)}
                style={[
                  styles.emojiBtn,
                  { borderColor: mood === m.level ? colors.primary : colors.border, backgroundColor: mood === m.level ? colors.primary + '22' : 'transparent' },
                ]}
              >
                <Text style={{ fontSize: 30 }}>{m.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 2 && (
          <TextInput
            value={priorityText}
            onChangeText={setPriorityText}
            placeholder={t('dayClosingPriorityPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
            style={[styles.priorityInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          />
        )}
      </View>

      <View style={styles.footerRow}>
        {step > 0 ? (
          <TouchableOpacity onPress={goBackStep} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{t('dayClosingBack')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <TouchableOpacity
          onPress={step === 2 ? handleFinish : goNext}
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>
            {step === 2 ? t('dayClosingFinish') : t('dayClosingNext')}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dotsRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { fontSize: 24, fontWeight: '800', marginTop: 20 },
  stepTitle: { fontSize: 14, fontWeight: '600', marginTop: 6, marginBottom: 24 },
  content: { flex: 1, justifyContent: 'center' },
  summaryBox: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 20, alignItems: 'center' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  emojiBtn: { width: 54, height: 54, borderRadius: 27, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  priorityInput: { borderWidth: 1, borderRadius: 14, padding: 16, minHeight: 100, fontSize: 16, textAlignVertical: 'top' },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 30 },
  secondaryBtn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1 },
  primaryBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
});
