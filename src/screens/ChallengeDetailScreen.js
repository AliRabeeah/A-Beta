import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useChallenges } from '../context/ChallengeContext';
import { toKey, calendarDaysBetween } from '../utils/dateUtils';

// Motivational quotes for panic button
const MOTIVATIONAL_QUOTES = {
  en: [
    "You've got this! Remember why you started.",
    'Every moment is a fresh beginning.',
    'The only way out is through.',
    'You are stronger than your urges.',
    'Progress, not perfection.',
    'This feeling will pass.',
    "You're building a better version of yourself.",
    'One day at a time.',
  ],
  ar: [
    'أنت قادر على هذا! تذكّر لماذا بدأت.',
    'كل لحظة هي بداية جديدة.',
    'الطريق الوحيد للخروج هو المرور من خلالها.',
    'أنت أقوى من رغباتك.',
    'التقدّم، لا الكمال.',
    'هذا الشعور سيزول.',
    'أنت تبني نسخة أفضل من نفسك.',
    'يومًا بعد يوم.',
  ],
};

export default function ChallengeDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const { challenges, checkInChallenge, recordSlip, updateChallenge } = useChallenges();
  const insets = useSafeAreaInsets();

  const challengeId = route.params?.challengeId;
  const challenge = useMemo(
    () => challenges.find((c) => c.id === challengeId),
    [challenges, challengeId]
  );

  const [panicModalVisible, setPanicModalVisible] = useState(false);
  const [slipModalVisible, setSlipModalVisible] = useState(false);
  const [slipReason, setSlipReason] = useState('');
  const [slipRecovery, setSlipRecovery] = useState('');
  const [breathingActive, setBreathingActive] = useState(false);

  if (!challenge) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{t('challengeNotFound')}</Text>
      </View>
    );
  }

  // Calculate challenge stats
  const startDate = new Date(challenge.startDate);
  const today = new Date();
  const daysElapsed = calendarDaysBetween(startDate, today);
  const currentDay = Math.max(1, Math.min(daysElapsed + 1, challenge.durationDays));
  const progressPercent = (currentDay / challenge.durationDays) * 100;

  const todayKey = toKey(today);
  const checkedInToday = challenge.completions?.[todayKey];

  // Calculate streak
  const calculateStreak = () => {
    let streak = 0;
    const date = new Date(today);
    for (let i = 0; i < challenge.durationDays; i++) {
      const key = toKey(date);
      if (challenge.completions?.[key]) {
        streak++;
        date.setDate(date.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();
  const nextMilestone = (challenge.milestones || []).find((m) => !m.achieved);

  const handlePanicButton = () => {
    setPanicModalVisible(true);
  };

  const handleSlipButton = () => {
    setSlipModalVisible(true);
  };

  const handleRecordSlip = async () => {
    await recordSlip(challengeId, slipReason, slipRecovery, today);
    setSlipReason('');
    setSlipRecovery('');
    setSlipModalVisible(false);
    Alert.alert(t('slipRecorded'), t('slipRecordedBody'));
  };

  const handleCheckIn = async () => {
    const wasCheckedIn = !!checkedInToday;
    await checkInChallenge(challengeId, today);
    if (wasCheckedIn) {
      Alert.alert(t('checkInUndone'));
    } else {
      Alert.alert(t('checkInSuccess'), t('checkInSuccessBody'));
    }
  };

  const getRandomQuote = () => {
    const quotes = MOTIVATIONAL_QUOTES[language] || MOTIVATIONAL_QUOTES.en;
    return quotes[Math.floor(Math.random() * quotes.length)];
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        style={[styles.scrollView, { paddingTop: insets.top }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {challenge.icon} {challenge.name}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Challenge Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.description, { color: colors.text }]}>
            {challenge.description}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('statusLabel')}</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {t('dayProgressLabel', currentDay, challenge.durationDays)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('streakLabel')}</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                🔥 {streak}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('impactLabel')}</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {challenge.metrics?.totalImpact || 0} {challenge.metrics?.unit}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={[styles.progressContainer, { backgroundColor: colors.surfaceElevated }]}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: challenge.color, width: `${progressPercent}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {t('percentCompleteLabel', Math.round(progressPercent))}
          </Text>
        </View>

        {/* Milestones */}
        {(challenge.milestones || []).length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('milestonesLabel')}
            </Text>
            <View style={styles.milestonesGrid}>
              {challenge.milestones.map((milestone, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.milestoneItem,
                    {
                      backgroundColor: milestone.achieved ? challenge.color : colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={styles.milestoneBadge}>
                    {milestone.achieved ? '✓' : '○'}
                  </Text>
                  <Text
                    style={[
                      styles.milestoneDay,
                      { color: milestone.achieved ? colors.onPrimary : colors.text },
                    ]}
                  >
                    {t('dayNumberLabel', milestone.day)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Slips */}
        {(challenge.slips || []).length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('slipHistoryLabel')}
            </Text>
            {challenge.slips.map((slip, idx) => (
              <View
                key={idx}
                style={[styles.slipItem, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                <Text style={[styles.slipDate, { color: colors.textSecondary }]}>
                  {slip.date}
                </Text>
                <Text style={[styles.slipReason, { color: colors.text }]}>
                  {slip.reason}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.section}>
          {!checkedInToday && (
            <TouchableOpacity
              onPress={handleCheckIn}
              style={[styles.actionBtn, { backgroundColor: challenge.color }]}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
              <Text style={[styles.actionBtnText, { color: colors.onPrimary }]}>
                {t('checkInTodayButton')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handlePanicButton}
            style={[styles.actionBtn, { backgroundColor: colors.danger }]}
          >
            <Ionicons name="alert-circle" size={20} color={colors.onPrimary} />
            <Text style={[styles.actionBtnText, { color: colors.onPrimary }]}>
              {t('panicButtonLabel')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSlipButton}
            style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}
          >
            <Ionicons name="alert-outline" size={20} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>
              {t('logSlipButton')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Panic Button Modal */}
      <Modal
        visible={panicModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPanicModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={() => setPanicModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>

            {!breathingActive ? (
              <>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t('youveGotThis')}
                </Text>
                <Text style={[styles.motivationalQuote, { color: colors.textSecondary }]}>
                  "{getRandomQuote()}"
                </Text>

                <TouchableOpacity
                  onPress={() => setBreathingActive(true)}
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.modalBtnText, { color: colors.onPrimary }]}>
                    {t('startBreathingExercise')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPanicModalVisible(false)}
                  style={[styles.modalBtn, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>
                    {t('dismiss')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t('breathingExerciseTitle')}
                </Text>
                <Text style={[styles.breathingInstruction, { color: colors.textSecondary }]}>
                  {t('followPattern')}
                </Text>

                <View style={styles.breathingCircle}>
                  <Text style={[styles.breathingText, { color: colors.primary }]}>
                    {t('breatheIn')}
                  </Text>
                </View>

                <Text style={[styles.breathingInstruction, { color: colors.textSecondary, marginVertical: 20 }]}>
                  {t('holdSeconds')}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    setBreathingActive(false);
                    setPanicModalVisible(false);
                  }}
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.modalBtnText, { color: colors.onPrimary }]}>
                    {t('iFeelBetter')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Slip Tracker Modal */}
      <Modal
        visible={slipModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSlipModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={() => setSlipModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>

            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('slipModalTitle')}
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('whatHappened')}
            </Text>
            <TextInput
              value={slipReason}
              onChangeText={setSlipReason}
              placeholder={t('slipReasonPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
              multiline
            />

            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
              {t('recoveryActionLabel')}
            </Text>
            <TextInput
              value={slipRecovery}
              onChangeText={setSlipRecovery}
              placeholder={t('recoveryActionPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
              multiline
            />

            <TouchableOpacity
              onPress={handleRecordSlip}
              style={[styles.modalBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
            >
              <Text style={[styles.modalBtnText, { color: colors.onPrimary }]}>
                {t('recordSlipButton')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700' },
  statDivider: { width: 1, height: 24, backgroundColor: '#333' },
  progressSection: { marginBottom: 24 },
  progressContainer: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: { height: '100%' },
  progressText: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
  milestonesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  milestoneBadge: { fontSize: 12 },
  milestoneDay: { fontSize: 12, fontWeight: '700' },
  slipItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  slipDate: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  slipReason: { fontSize: 13 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
    gap: 8,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalCloseBtn: { alignSelf: 'flex-end', padding: 4, marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  motivationalQuote: { fontSize: 16, fontStyle: 'italic', textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  modalBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalBtnText: { fontSize: 14, fontWeight: '700' },
  breathingCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#FF8A00',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 20,
  },
  breathingText: { fontSize: 18, fontWeight: '800' },
  breathingInstruction: { fontSize: 14, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
});
