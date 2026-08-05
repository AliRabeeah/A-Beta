import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal, useWindowDimensions, StatusBar } from 'react-native';
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

// A round, semi-transparent glass button for floating over the scene —
// used for the menu and stats triggers so they read as controls, not chrome.
function GlassButton({ onPress, icon, size = 40, iconSize = 20, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(20,22,30,0.38)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={iconSize} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

export default function CompanionScreen({ navigation }) {
  const { colors, accent } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const { habits, loaded: habitsLoaded } = useHabits();
  const { tasks, loaded: tasksLoaded } = useTasks();
  const { challenges, loaded: challengesLoaded } = useChallenges();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [name, setName] = useState(DEFAULT_COMPANION_NAME);
  const [renameDraft, setRenameDraft] = useState('');
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    getCompanionName().then(setName);
  }, []);

  const loaded = habitsLoaded && tasksLoaded && challengesLoaded;

  const state = useMemo(() => computeCompanionState({ habits, tasks, challenges }), [habits, tasks, challenges]);
  const todayXP = useMemo(() => xpEarnedToday({ habits, tasks }), [habits, tasks]);

  const openStats = () => {
    Haptics.selectionAsync();
    setStatsOpen(true);
  };

  const startRename = () => {
    setRenameDraft(name);
    setEditingName(true);
  };

  const saveRename = useCallback(async () => {
    const saved = await setCompanionName(renameDraft);
    setName(saved);
    Haptics.selectionAsync();
    setEditingName(false);
  }, [renameDraft]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* the world fills the ENTIRE screen, edge to edge, behind everything else */}
      <CompanionWorld
        stage={state.stage}
        mood={state.mood}
        accentColor={accent}
        width={width}
        height={height}
        borderRadius={0}
        catBottomOffset={0.22}
        catSizeRatio={0.55}
      />

      {/* floating controls, overlaid on top of the scene */}
      <View style={[styles.topRow, { top: insets.top + 10 }, isRTL && { flexDirection: 'row-reverse' }]}>
        <GlassButton icon="menu" onPress={() => setDrawerVisible(true)} />
        <GlassButton icon="stats-chart" onPress={openStats} />
      </View>

      {/* name + mood, tucked low and unobtrusive, tap to open the stats sheet */}
      <TouchableOpacity
        onPress={openStats}
        activeOpacity={0.8}
        style={[styles.namePill, { bottom: insets.bottom + 18 }]}
      >
        <Text style={styles.namePillName}>{name}</Text>
        <View style={styles.namePillDot} />
        <Text style={styles.namePillMood} numberOfLines={1}>
          {t(MOOD_LABEL_KEY[state.mood])}
        </Text>
      </TouchableOpacity>

      {/* stats bottom sheet — everything that used to live on-screen now lives here */}
      <Modal visible={statsOpen} transparent animationType="slide" onRequestClose={() => setStatsOpen(false)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setStatsOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />

            <View style={[styles.sheetHeaderRow, isRTL && { flexDirection: 'row-reverse' }]}>
              {editingName ? (
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    value={renameDraft}
                    onChangeText={setRenameDraft}
                    maxLength={20}
                    autoFocus
                    onSubmitEditing={saveRename}
                    placeholder={DEFAULT_COMPANION_NAME}
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.nameInput, { color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                  />
                  <TouchableOpacity onPress={saveRename} style={{ marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0 }}>
                    <Ionicons name="checkmark-circle" size={26} color={accent} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={startRename} style={[styles.sheetNameRow, isRTL && { flexDirection: 'row-reverse' }]}>
                  <Text style={[styles.sheetName, { color: colors.text }]}>{name}</Text>
                  <Ionicons name="pencil-outline" size={14} color={colors.textSecondary} style={{ marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setStatsOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <SideDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  namePill: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,22,30,0.4)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  namePillName: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  namePillDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.6)', marginHorizontal: 7 },
  namePillMood: { color: 'rgba(255,255,255,0.85)', fontSize: 12, flexShrink: 1 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 10, maxHeight: '70%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.4)', alignSelf: 'center', marginBottom: 14 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sheetName: { fontSize: 18, fontWeight: '700' },
  nameInput: { flex: 1, borderBottomWidth: 1, fontSize: 18, fontWeight: '700', paddingVertical: 2 },

  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  levelText: { fontSize: 15, fontWeight: '700' },
  xpText: { fontSize: 12 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  todayPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginTop: 12 },
  todayPillText: { fontSize: 12, fontWeight: '600' },
  breakdownTitle: { fontSize: 14, fontWeight: '700', marginTop: 18, marginBottom: 10 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
});
