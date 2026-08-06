import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal, useWindowDimensions, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
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

// A round, semi-transparent glass button for floating over the scene —
// used for the menu and stats triggers so they read as controls, not chrome.
function GlassButton({ onPress, onLongPress, delayLongPress, icon, size = 40, iconSize = 20, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
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

// Renders text with a soft cartoon "sticker" outline by stacking a few
// offset copies behind the main colored text — a cheap, dependency-free
// stand-in for a proper stroked/comic font.
function OutlinedText({ text, textStyle, color, outlineColor }) {
  const offsets = [
    [-1, -1], [1, -1], [-1, 1], [1, 1],
    [0, -1.3], [0, 1.3], [-1.3, 0], [1.3, 0],
  ];
  return (
    <View>
      {offsets.map(([dx, dy], i) => (
        <Text key={i} numberOfLines={1} style={[textStyle, styles.badgeTextGhost, { left: dx, top: dy, color: outlineColor }]}>
          {text}
        </Text>
      ))}
      <Text style={[textStyle, { color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

// A small floating name tag for the companion, styled like a hand-lettered
// sticker rather than a plain UI pill. Lives up top, out of the way of the
// scene, bobs and tilts gently, and opens the same stats sheet the old
// bottom bar used to (tap or long-press).
function NameBadge({ name, accent, onOpen, maxWidth }) {
  const float = useSharedValue(0);
  const press = useSharedValue(1);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: float.value * -3 },
      { rotate: `${-3 + float.value * 6}deg` },
      { scale: press.value },
    ],
  }));

  return (
    <Animated.View style={[styles.nameBadgeWrap, maxWidth ? { maxWidth } : null, floatStyle]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onOpen}
        onLongPress={onOpen}
        onPressIn={() => {
          press.value = withTiming(0.92, { duration: 90 });
        }}
        onPressOut={() => {
          press.value = withSpring(1, { damping: 12, stiffness: 220 });
        }}
        style={[styles.nameBadge, { backgroundColor: accent }]}
      >
        {/* little "knot" nub at the top, like a hanging tag */}
        <View style={[styles.nameBadgeNub, { backgroundColor: accent }]} />
        <Ionicons name="paw" size={11} color="rgba(255,255,255,0.92)" style={{ marginRight: 4 }} />
        <OutlinedText text={name} textStyle={styles.nameBadgeText} color="#FFFFFF" outlineColor="rgba(0,0,0,0.28)" />
      </TouchableOpacity>
    </Animated.View>
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
        <GlassButton
          icon="menu"
          onPress={() => setDrawerVisible(true)}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('Today');
          }}
          delayLongPress={450}
        />
        <GlassButton icon="stats-chart" onPress={openStats} />
      </View>

      {/* the name tag floats in the top-right corner, sitting below the two
          glass buttons rather than between them — clear of both the button
          row and the cat/scene below */}
      <View pointerEvents="box-none" style={[styles.nameBadgeRow, { top: insets.top + 58 }]}>
        <NameBadge name={name} accent={accent} onOpen={openStats} maxWidth={width * 0.54} />
      </View>

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
  nameBadgeRow: {
    position: 'absolute',
    right: 16,
    alignItems: 'flex-end',
    // pinned to the right edge, below the button row — never overlaps the
    // menu/stats buttons above it or the cat lower in the scene, and never
    // intercepts touches outside the tag itself thanks to
    // pointerEvents="box-none" above
    zIndex: 5,
  },
  nameBadgeWrap: {
    // Fallback only — CompanionScreen always passes an explicit pixel
    // maxWidth (54% of the real screen width) as an inline style instead.
    // A percentage here is unreliable: this wrap sits inside nameBadgeRow,
    // which is absolutely positioned with only `right` set (no `left`/
    // width), so it sizes to hug its content. Yoga can't resolve a `%`
    // maxWidth against a parent whose own width isn't yet resolved, and
    // was collapsing it to ~0 — squeezing the name down to one letter
    // per wrapped line instead of a single horizontal row.
    maxWidth: 220,
  },
  nameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 7,
    // a soft drop shadow so the tag lifts off the scene like a sticker
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  nameBadgeNub: {
    position: 'absolute',
    top: -5,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  nameBadgeText: {
    fontSize: 15,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: 0.3,
    fontFamily: Platform.select({ ios: 'Marker Felt', android: 'sans-serif-condensed', default: undefined }),
  },
  badgeTextGhost: {
    position: 'absolute',
  },

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
