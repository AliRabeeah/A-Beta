import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import { useTasks } from '../context/TaskContext';
import { useChallenges } from '../context/ChallengeContext';
import SideDrawer from '../components/SideDrawer';
import CompanionWorld from '../components/CompanionWorld';
import { computeCompanionState, xpEarnedToday } from '../utils/companionStats';
import { getCompanionName, setCompanionName, DEFAULT_COMPANION_NAME } from '../utils/companionProfile';

const MOOD_LABEL_KEY = {
  happy: 'companionMoodHappy',
  content: 'companionMoodContent',
  sleepy: 'companionMoodSleepy',
  new: 'companionMoodNew',
};

export default function CompanionScreen({ navigation }) {
  const { colors, accent } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { habits, loaded: habitsLoaded } = useHabits();
  const { tasks, loaded: tasksLoaded } = useTasks();
  const { challenges, loaded: challengesLoaded } = useChallenges();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [name, setName] = useState(DEFAULT_COMPANION_NAME);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => {
    getCompanionName().then(setName);
  }, []);

  const loaded = habitsLoaded && tasksLoaded && challengesLoaded;

  const state = useMemo(
    () => computeCompanionState({ habits, tasks, challenges }),
    [habits, tasks, challenges]
  );
  const todayXP = useMemo(() => xpEarnedToday({ habits, tasks }), [habits, tasks]);

  const worldWidth = Math.min(420, width - 32);

  const openRename = () => {
    setRenameDraft(name);
    setRenameOpen(true);
  };

  const saveRename = useCallback(async () => {
    const saved = await setCompanionName(renameDraft);
    setName(saved);
    Haptics.selectionAsync();
    setRenameOpen(false);
  }, [renameDraft]);

  if (!loaded) return <View style={[styles.container, { backgroundColor: colors.background }]} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <View style={[styles.headerRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[styles.headerLeft, isRTL && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuBtn}>
            <Ionicons name="menu" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('companionTitle')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
        <CompanionWorld stage={state.stage} mood={state.mood} accentColor={accent} width={worldWidth} />

        <TouchableOpacity onPress={openRename} activeOpacity={0.6} style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <Ionicons name="pencil-outline" size={14} color={colors.textSecondary} style={{ marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }} />
        </TouchableOpacity>
        <Text style={[styles.mood, { color: colors.textSecondary }]}>{t(MOOD_LABEL_KEY[state.mood])}</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, width: worldWidth }]}>
          <View style={[styles.levelRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.levelText, { color: colors.text }]}>{t('companionLevel', state.level)}</Text>
            <Text style={[styles.xpText, { color: colors.textSecondary }]}>
              {state.nextLevelXP == null ? t('companionMaxLevel') : `${state.xpIntoLevel} / ${state.xpForLevel} XP`}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
            <View style={[styles.progressFill, { backgroundColor: accent, width: `${Math.round(state.ratio * 100)}%` }]} />
          </View>

          {todayXP > 0 && (
            <View style={[styles.todayPill, { backgroundColor: `${accent}22`, alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Ionicons name="sparkles" size={13} color={accent} />
              <Text style={[styles.todayPillText, { color: accent }]}>{t('companionEarnedToday', todayXP)}</Text>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, width: worldWidth }]}>
          <Text style={[styles.breakdownTitle, { color: colors.text }]}>{t('companionHowToGrow')}</Text>
          {[
            { icon: 'checkmark-circle-outline', labelKey: 'companionXpHabit' },
            { icon: 'clipboard-outline', labelKey: 'companionXpTask' },
            { icon: 'flag-outline', labelKey: 'companionXpMilestone' },
            { icon: 'trophy-outline', labelKey: 'companionXpChallenge' },
          ].map((row) => (
            <View key={row.labelKey} style={[styles.breakdownRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Ionicons name={row.icon} size={16} color={colors.textSecondary} style={{ marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }} />
              <Text style={{ color: colors.textSecondary, fontSize: 13, flex: 1 }}>{t(row.labelKey)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('companionRenameTitle')}</Text>
            <TextInput
              value={renameDraft}
              onChangeText={setRenameDraft}
              maxLength={20}
              autoFocus
              placeholder={DEFAULT_COMPANION_NAME}
              placeholderTextColor={colors.textSecondary}
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, textAlign: isRTL ? 'right' : 'left' }]}
            />
            <View style={[styles.modalActions, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity onPress={() => setRenameOpen(false)} style={styles.modalBtn}>
                <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveRename} style={[styles.modalBtn, { backgroundColor: accent, borderRadius: 8 }]}>
                <Text style={{ color: colors.onPrimary, fontSize: 15, fontWeight: '600' }}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SideDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  menuBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  name: { fontSize: 20, fontWeight: '700' },
  mood: { fontSize: 13, marginTop: 2, marginBottom: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  levelText: { fontSize: 15, fontWeight: '700' },
  xpText: { fontSize: 12 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  todayPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginTop: 12 },
  todayPillText: { fontSize: 12, fontWeight: '600' },
  breakdownTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 340, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 9 },
});
