import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '../utils/secureStorage'; // encrypted at rest -- see secureStorage.js
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useTokens, withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { scheduleTimerAlert, cancelTimerAlert } from '../utils/notifications';
import { playTimerCompleteSound } from '../utils/timerSound';
import ProgressRing from '../components/ProgressRing';

const POMODORO_SETTINGS_KEY = 'a_pomodoro_settings';
const DEFAULT_POMODORO = { work: 25, short: 5, long: 15 };

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Shared countdown engine used by both Normal and Pomodoro modes.
 *
 * Instead of decrementing a counter every second (which drifts or
 * freezes when the OS throttles JS while the app is backgrounded),
 * this tracks a fixed `endTimestamp` and always computes remaining
 * time as `endTimestamp - Date.now()`. A 1s interval re-reads that
 * while the screen is visible (so the display ticks smoothly), and
 * an AppState listener immediately resyncs the displayed value the
 * moment the app returns to the foreground — so the countdown is
 * always correct even if it was backgrounded for a while.
 *
 * The actual "you're done" alert is a local notification scheduled
 * with the OS at start time, so it still fires on time regardless
 * of whether the app is foregrounded, backgrounded, or killed.
 */
function useCountdown() {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [completedSignal, setCompletedSignal] = useState(0);
  const endTimestampRef = useRef(null);
  const intervalRef = useRef(null);
  const notifIdRef = useRef(null);

  const clearTick = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const stopAlert = useCallback(async () => {
    if (notifIdRef.current) {
      await cancelTimerAlert(notifIdRef.current);
      notifIdRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (!endTimestampRef.current) return;
    const secondsLeft = Math.max(0, Math.round((endTimestampRef.current - Date.now()) / 1000));
    setRemaining(secondsLeft);
    if (secondsLeft <= 0) {
      clearTick();
      setRunning(false);
      endTimestampRef.current = null;
      setCompletedSignal((c) => c + 1);
    }
  }, []);

  const start = useCallback(
    async (seconds, alertTitle, alertBody) => {
      await stopAlert();
      endTimestampRef.current = Date.now() + seconds * 1000;
      setRemaining(seconds);
      setRunning(true);
      notifIdRef.current = await scheduleTimerAlert(seconds, alertTitle, alertBody);
      clearTick();
      intervalRef.current = setInterval(tick, 1000);
    },
    [stopAlert, tick]
  );

  const pause = useCallback(async () => {
    clearTick();
    setRunning(false);
    endTimestampRef.current = null;
    await stopAlert();
  }, [stopAlert]);

  const reset = useCallback(
    async (seconds = 0) => {
      clearTick();
      setRunning(false);
      endTimestampRef.current = null;
      setRemaining(seconds);
      await stopAlert();
    },
    [stopAlert]
  );

  // Resync immediately when the app comes back to the foreground —
  // this is what makes the countdown "catch up" correctly instead
  // of showing stale time after being backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && endTimestampRef.current) {
        tick();
      }
    });
    return () => sub.remove();
  }, [tick]);

  useEffect(() => () => clearTick(), []);

  return { remaining, running, completedSignal, start, pause, reset };
}

function DurationStepper({ label, value, onChange, colors, min = 1, max = 120 }) {
  return (
    <View style={styles.pomoStepperRow}>
      <Text style={[styles.pomoStepperLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.pomoStepperControls}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(min, value - 1))}
          style={[styles.miniStepBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="remove" size={16} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.pomoStepperValue, { color: colors.text }]}>{value}</Text>
        <TouchableOpacity
          onPress={() => onChange(Math.min(max, value + 1))}
          style={[styles.miniStepBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="add" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TimerScreen({ navigation }) {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('normal'); // 'normal' | 'pomodoro'

  // --- Normal timer ---
  const [normalMinutes, setNormalMinutes] = useState(10);
  const normalTimer = useCountdown();

  // --- Pomodoro ---
  const [durations, setDurations] = useState(DEFAULT_POMODORO); // { work, short, long } in minutes
  const [durationsLoaded, setDurationsLoaded] = useState(false);
  const [phase, setPhase] = useState('work'); // 'work' | 'short' | 'long'
  const [cycleCount, setCycleCount] = useState(0); // completed work sessions
  const pomodoroTimer = useCountdown();

  useEffect(() => {
    AsyncStorage.getItem(POMODORO_SETTINGS_KEY).then((raw) => {
      if (raw) {
        try {
          setDurations({ ...DEFAULT_POMODORO, ...JSON.parse(raw) });
        } catch (e) {
          // ignore corrupt data, keep defaults
        }
      }
      setDurationsLoaded(true);
    });
  }, []);

  const updateDuration = (key, value) => {
    setDurations((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(POMODORO_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const phaseKeys = { work: 'phaseWork', short: 'phaseShortBreak', long: 'phaseLongBreak' };

  // When a Pomodoro phase (focus or break) finishes, chime and prep the
  // next phase — but do NOT auto-start it. The countdown is loaded with
  // the next phase's full duration and left paused, so the person has to
  // tap Start themselves to move on.
  useEffect(() => {
    if (pomodoroTimer.completedSignal === 0) return; // skip on mount

    playTimerCompleteSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (phase === 'work') {
      const nextCycle = cycleCount + 1;
      const nextPhase = nextCycle % 4 === 0 ? 'long' : 'short';
      setCycleCount(nextCycle);
      setPhase(nextPhase);
      pomodoroTimer.reset(durations[nextPhase] * 60);
    } else {
      setPhase('work');
      pomodoroTimer.reset(durations.work * 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoroTimer.completedSignal]);

  // The plain Normal timer also gets the completion chime.
  useEffect(() => {
    if (normalTimer.completedSignal === 0) return; // skip on mount
    playTimerCompleteSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalTimer.completedSignal]);

  const startNormal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    normalTimer.start(normalMinutes * 60, t('timerDoneTitle'), t('timerDoneBody'));
  };

  const startPomodoroFresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('work');
    setCycleCount(0);
    const seconds = durations.work * 60;
    pomodoroTimer.start(seconds, t('timerPhaseCompleteTitle'), t('phaseWork'));
  };

  const resumePomodoro = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pomodoroTimer.start(pomodoroTimer.remaining, t('timerPhaseCompleteTitle'), t(phaseKeys[phase]));
  };

  const pausePomodoro = () => {
    Haptics.selectionAsync();
    pomodoroTimer.pause();
  };

  const resetPomodoro = () => {
    Haptics.selectionAsync();
    setPhase('work');
    setCycleCount(0);
    pomodoroTimer.reset(0);
  };

  const phaseLabel = t(phaseKeys[phase]);
  const phaseColor = phase === 'work' ? colors.primary : '#30D158';
  const sessionInCycle = phase === 'work' ? (cycleCount % 4) + 1 : ((cycleCount - 1 + 4) % 4) + 1;
  const pomodoroIdle = !pomodoroTimer.running && pomodoroTimer.remaining === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 20 }]}>
      <View style={styles.headerRow}>
        {navigation?.canGoBack?.() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: colors.text }]}>{t('timerTitle')}</Text>
      </View>

      <View style={[styles.segment, tokens.glass.card, { borderRadius: tokens.radius.interactive }]}>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setMode('normal'); }}
          style={[styles.segmentBtn, { borderRadius: tokens.radius.interactive }, mode === 'normal' && { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: mode === 'normal' ? colors.onPrimary : colors.textSecondary, fontWeight: '700' }}>
            {t('timerNormal')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setMode('pomodoro'); }}
          style={[styles.segmentBtn, { borderRadius: tokens.radius.interactive }, mode === 'pomodoro' && { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: mode === 'pomodoro' ? colors.onPrimary : colors.textSecondary, fontWeight: '700' }}>
            {t('timerPomodoro')}
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'normal' ? (
        <View style={styles.content}>
          {!normalTimer.running && normalTimer.remaining === 0 && (
            <View style={styles.durationRow}>
              <TouchableOpacity
                onPress={() => setNormalMinutes((m) => Math.max(1, m - 1))}
                style={[styles.stepBtn, { borderColor: colors.border }]}
              >
                <Ionicons name="remove" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.durationText, { color: colors.text }]}>{normalMinutes} {t('minutesLabel')}</Text>
              <TouchableOpacity
                onPress={() => setNormalMinutes((m) => Math.min(180, m + 1))}
                style={[styles.stepBtn, { borderColor: colors.border }]}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}

          <ProgressRing
            size={260}
            strokeWidth={14}
            color={colors.primary}
            trackColor={withAlpha(colors.text, 0.08)}
            progress={
              normalTimer.remaining > 0 || normalTimer.running
                ? 1 - normalTimer.remaining / (normalMinutes * 60)
                : 0
            }
          >
            <Text style={[styles.clock, { color: colors.text }]}>
              {normalTimer.remaining > 0 || normalTimer.running
                ? formatTime(normalTimer.remaining)
                : formatTime(normalMinutes * 60)}
            </Text>
          </ProgressRing>

          <View style={styles.controlsRow}>
            {!normalTimer.running ? (
              <TouchableOpacity onPress={startNormal} style={[styles.primaryBtn, tokens.glow(colors.primary), { backgroundColor: colors.primary }]}>
                <Ionicons name="play" size={22} color={colors.onPrimary} />
                <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>{t('start')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={normalTimer.pause} style={[styles.primaryBtn, tokens.glass.card, { borderRadius: 30 }]}>
                <Ionicons name="pause" size={22} color={colors.text} />
                <Text style={[styles.primaryBtnText, { color: colors.text }]}>{t('pause')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); normalTimer.reset(0); }}
              style={[styles.secondaryBtn, tokens.glass.card, { borderRadius: 24 }]}
            >
              <Ionicons name="refresh" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.content, styles.pomodoroContent]}>
          <View style={[styles.phaseBadge, tokens.glow(phaseColor), { backgroundColor: phaseColor }]}>
            <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 13 }}>{phaseLabel}</Text>
          </View>
          <Text style={[styles.cycleText, { color: colors.textSecondary }]}>
            {t('pomodoroSession', sessionInCycle, 4)}
          </Text>

          <ProgressRing
            size={260}
            strokeWidth={14}
            color={phaseColor}
            trackColor={withAlpha(colors.text, 0.08)}
            progress={
              pomodoroTimer.remaining > 0 || pomodoroTimer.running
                ? 1 - pomodoroTimer.remaining / (durations[phase] * 60)
                : 0
            }
          >
            <Text style={[styles.clock, { color: colors.text }]}>
              {pomodoroTimer.remaining > 0 || pomodoroTimer.running
                ? formatTime(pomodoroTimer.remaining)
                : formatTime(durations.work * 60)}
            </Text>
          </ProgressRing>

          {pomodoroIdle && durationsLoaded && (
            <View style={[styles.pomoSettingsCard, tokens.glass.card]}>
              <Text style={[styles.pomoSettingsTitle, { color: colors.textSecondary }]}>{t('customizeDurations')}</Text>
              <DurationStepper label={t('phaseWork')} value={durations.work} onChange={(v) => updateDuration('work', v)} colors={colors} />
              <DurationStepper label={t('phaseShortBreak')} value={durations.short} onChange={(v) => updateDuration('short', v)} colors={colors} />
              <DurationStepper label={t('phaseLongBreak')} value={durations.long} onChange={(v) => updateDuration('long', v)} colors={colors} />
            </View>
          )}

          <View style={styles.controlsRow}>
            {!pomodoroTimer.running ? (
              <TouchableOpacity
                onPress={pomodoroTimer.remaining > 0 ? resumePomodoro : startPomodoroFresh}
                style={[styles.primaryBtn, tokens.glow(phaseColor), { backgroundColor: phaseColor }]}
              >
                <Ionicons name="play" size={22} color={colors.onPrimary} />
                <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>{t('start')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={pausePomodoro} style={[styles.primaryBtn, tokens.glass.card, { borderRadius: 30 }]}>
                <Ionicons name="pause" size={22} color={colors.text} />
                <Text style={[styles.primaryBtnText, { color: colors.text }]}>{t('pause')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={resetPomodoro}
              style={[styles.secondaryBtn, tokens.glass.card, { borderRadius: 24 }]}
            >
              <Ionicons name="refresh" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('pomodoroHint')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backBtn: { padding: 4, marginLeft: -4 },
  title: { fontSize: 30, fontWeight: '800' },
  segment: { flexDirection: 'row', overflow: 'hidden', marginBottom: 30 },
  segmentBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -40 },
  // Pomodoro has a phase badge above the timer. Keep it below the mode
  // selector instead of vertically centering it into the segmented control.
  pomodoroContent: { justifyContent: 'flex-start', marginTop: 0 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 30 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  durationText: { fontSize: 18, fontWeight: '700', minWidth: 90, textAlign: 'center' },
  clock: { fontSize: 64, fontWeight: '800', fontVariant: ['tabular-nums'], marginBottom: 16 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 20 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 30 },
  primaryBtnText: { fontWeight: '700', fontSize: 16 },
  secondaryBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  phaseBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, marginBottom: 10 },
  cycleText: { fontSize: 13, marginBottom: 12 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 26, maxWidth: 260 },
  pomoSettingsCard: { width: '100%', padding: 14, marginTop: 6 },
  pomoSettingsTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10, textAlign: 'center' },
  pomoStepperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  pomoStepperLabel: { fontSize: 14 },
  pomoStepperControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniStepBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pomoStepperValue: { fontSize: 15, fontWeight: '700', minWidth: 30, textAlign: 'center' },
});
