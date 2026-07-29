import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Pressable, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useTokens, withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import { useTasks } from '../context/TaskContext';
import { usePlanning } from '../context/PlanningContext';
import { useChallenges } from '../context/ChallengeContext';
import ProgressRing from '../components/ProgressRing';
import HabitCard from '../components/HabitCard';
import TaskCard from '../components/TaskCard';
import PlanningCard from '../components/PlanningCard';
import ChallengeCard from '../components/ChallengeCard';
import SideDrawer from '../components/SideDrawer';
import AddOptionsSheet from '../components/AddOptionsSheet';
import Confetti from '../components/Confetti';
import { isDueOnDate, statusOf } from '../utils/streakUtils';
import { isDueOnDate as isPlanningDueOnDate, isDayCompleted as isPlanningDayCompleted } from '../utils/planningUtils';
import { toKey, addDays } from '../utils/dateUtils';

const DATE_RANGE_DAYS = 15; // days shown before/after today in the strip
const TODAY_ORDER_STORAGE_KEY = 'today_items_custom_order';

function isTaskDueOnDate(task, date) {
  if (task.taskType === 'recurring') return isDueOnDate(task, date);
  const dateKey = toKey(date);
  if (task.dueDate === dateKey) return true;
  // Pending single tasks keep showing on every day after their due date until completed.
  if (task.isPending && !task.completed && task.dueDate && dateKey > task.dueDate) return true;
  return false;
}

export default function TodayScreen({ navigation }) {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t, language } = useLanguage();
  const { habits, setCompletionStatus, addToValue, logTimerSeconds, setChecklistItem, archiveAllCompletedToday, archiveHabit, deleteHabit } = useHabits();
  const { tasks, categories: taskCategories, toggleSingleTaskComplete, setRecurringTaskStatus, toggleChecklistItem, archiveTask, deleteTask } = useTasks();
  const { planningItems, setDayCompleted, deleteTodayOnly, deletePlanningItem } = usePlanning();
  const { challenges, checkInChallenge, archiveChallenge, deleteChallenge } = useChallenges();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  // Safety net for the invisible drag-catching overlay in renderItem: if the
  // user enters reorder mode and then leaves this tab/screen without tapping
  // "Done", reorderMode would otherwise stay stuck at `true` forever (tab
  // screens stay mounted), leaving a full-screen invisible layer over every
  // card that swallows all taps (check-in buttons, card presses, everything).
  useFocusEffect(
    useCallback(() => {
      return () => setReorderMode(false);
    }, [])
  );

  const dateStrip = useMemo(() => {
    const arr = [];
    for (let i = -DATE_RANGE_DAYS; i <= DATE_RANGE_DAYS; i++) arr.push(addDays(new Date(), i));
    return arr;
  }, []);

  const selectedKey = toKey(selectedDate);
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  const dueHabits = useMemo(
    () => habits.filter((h) => !h.archived && isDueOnDate(h, selectedDate)),
    [habits, selectedDate]
  );
  const dueTasks = useMemo(
    () => tasks.filter((tk) => !tk.archived && isTaskDueOnDate(tk, selectedDate)),
    [tasks, selectedDate]
  );
  const duePlanningItems = useMemo(
    () => planningItems.filter((p) => isPlanningDueOnDate(p, selectedDate)),
    [planningItems, selectedDate]
  );
  const todayActualKey = toKey(new Date());
  // "Most important thing tomorrow" (set via the Day Closing ritual) shows
  // pinned at the top instead of mixed into the regular task list.
  const priorityTask = useMemo(
    () => (selectedKey === todayActualKey ? dueTasks.find((tk) => tk.isPriority && !tk.completed) : null),
    [dueTasks, selectedKey, todayActualKey]
  );
  const activeChallenges = useMemo(
    () => (selectedKey === todayActualKey ? challenges.filter((c) => !c.archived && c.status === 'active') : []),
    [challenges, selectedKey, todayActualKey]
  );

  const combinedList = useMemo(
    () => [
      ...activeChallenges.map((c) => ({ kind: 'challenge', id: `c_${c.id}`, data: c })),
      ...dueHabits.map((h) => ({ kind: 'habit', id: `h_${h.id}`, data: h })),
      ...dueTasks.filter((tk) => !priorityTask || tk.id !== priorityTask.id).map((tk) => ({ kind: 'task', id: `t_${tk.id}`, data: tk })),
      ...duePlanningItems.map((p) => ({ kind: 'planning', id: `p_${p.id}`, data: p })),
    ],
    [dueHabits, dueTasks, duePlanningItems, activeChallenges, priorityTask]
  );

  // Permanent, user-controlled ordering across ALL item types (habits, tasks,
  // planning, challenges combined). Stored once as a flat list of item ids;
  // items not yet placed (new habits/tasks, or items simply not due today)
  // fall back to their natural order at the end, so nothing ever disappears.
  const [customOrder, setCustomOrder] = useState(null);
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(TODAY_ORDER_STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      try {
        setCustomOrder(raw ? JSON.parse(raw) : []);
      } catch (e) {
        setCustomOrder([]);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const displayList = useMemo(() => {
    if (!customOrder || customOrder.length === 0) return combinedList;
    const rank = new Map(customOrder.map((id, idx) => [id, idx]));
    return [...combinedList].sort((a, b) => {
      const ai = rank.has(a.id) ? rank.get(a.id) : Infinity;
      const bi = rank.has(b.id) ? rank.get(b.id) : Infinity;
      return ai - bi;
    });
  }, [combinedList, customOrder]);

  const handleDragEnd = useCallback(({ data }) => {
    const visibleIds = data.map((it) => it.id);
    setCustomOrder((prevOrderState) => {
      const prevOrder = prevOrderState || [];
      const visibleSet = new Set(visibleIds);
      let firstVisibleIndex = prevOrder.findIndex((id) => visibleSet.has(id));
      if (firstVisibleIndex === -1) firstVisibleIndex = prevOrder.length;
      const remaining = prevOrder.filter((id) => !visibleSet.has(id));
      const nextOrder = [
        ...remaining.slice(0, firstVisibleIndex),
        ...visibleIds,
        ...remaining.slice(firstVisibleIndex),
      ];
      AsyncStorage.setItem(TODAY_ORDER_STORAGE_KEY, JSON.stringify(nextOrder)).catch(() => {});
      return nextOrder;
    });
  }, []);

  const completedCount = useMemo(
    () => dueHabits.filter((h) => statusOf(h, selectedKey) === 'done').length,
    [dueHabits, selectedKey]
  );
  const totalDue = combinedList.length;
  const dueTasksDone = useMemo(
    () => dueTasks.filter((tk) => (tk.taskType === 'single' ? tk.completed : statusOf(tk, selectedKey) === 'done')).length,
    [dueTasks, selectedKey]
  );
  const duePlanningDone = useMemo(
    () => duePlanningItems.filter((p) => isPlanningDayCompleted(p, selectedDate)).length,
    [duePlanningItems, selectedDate]
  );
  const dueChallengesDone = useMemo(
    () => activeChallenges.filter((c) => c.completions?.[todayActualKey]).length,
    [activeChallenges, todayActualKey]
  );
  const overallDone = completedCount + dueTasksDone + duePlanningDone + dueChallengesDone;
  const overallRatio = totalDue > 0 ? Math.min(1, overallDone / totalDue) : 0;
  const allDoneToday = totalDue > 0 && overallDone === totalDue;

  const [burstKey, setBurstKey] = useState(0);
  const prevAllDoneRef = useRef(false);
  useEffect(() => {
    if (allDoneToday && !prevAllDoneRef.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBurstKey((k) => k + 1);
    }
    prevAllDoneRef.current = allDoneToday;
  }, [allDoneToday]);

  // --- Stable, id-keyed handlers -------------------------------------
  // Previously every card in the list got a brand-new closure for each of
  // these on every single render of TodayScreen (e.g. `onDone={() =>
  // setCompletionStatus(item.data.id, 'done', selectedDate)}` built fresh
  // inside renderItem). That meant React.memo on the card components could
  // never actually skip a re-render, since their props always looked
  // "changed" even when nothing relevant to that specific card did.
  //
  // Wrapping each handler in useCallback (and having the cards call them
  // with the item's id, see HabitCard/TaskCard/PlanningCard/ChallengeCard)
  // means the function passed down stays the same reference across
  // re-renders unless its own dependencies actually change — so a card
  // whose own data/date/index didn't change now genuinely skips re-render.
  const handleHabitDone = useCallback(
    (id) => setCompletionStatus(id, 'done', selectedDate),
    [setCompletionStatus, selectedDate]
  );
  const handleHabitSkip = useCallback(
    (id) => setCompletionStatus(id, 'skipped', selectedDate),
    [setCompletionStatus, selectedDate]
  );
  const handleHabitIncrement = useCallback(
    (id, evaluationType, step) => {
      if (evaluationType === 'timer') logTimerSeconds(id, step, selectedDate);
      else addToValue(id, step, selectedDate);
    },
    [logTimerSeconds, addToValue, selectedDate]
  );
  const handleHabitArchive = useCallback((id) => archiveHabit(id), [archiveHabit]);
  const handleHabitChecklistToggle = useCallback(
    (id, itemId, checked) => setChecklistItem(id, itemId, checked, selectedDate),
    [setChecklistItem, selectedDate]
  );
  const handleHabitViewDetails = useCallback(
    (id) => navigation.navigate('HabitDetail', { habitId: id }),
    [navigation]
  );
  const handleHabitDeleteRequest = useCallback(
    (id) => {
      const habit = habits.find((h) => h.id === id);
      if (!habit) return;
      Alert.alert(t('deleteConfirmTitle'), t('deleteConfirmBody'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => deleteHabit(habit.id) },
      ]);
    },
    [habits, deleteHabit, t]
  );

  const handleTaskToggleComplete = useCallback(
    (id) => {
      const task = tasks.find((tk) => tk.id === id);
      if (!task) return;
      if (task.taskType === 'single') toggleSingleTaskComplete(id);
      else setRecurringTaskStatus(id, 'done', selectedDate);
    },
    [tasks, toggleSingleTaskComplete, setRecurringTaskStatus, selectedDate]
  );
  const handleTaskSkip = useCallback(
    (id) => setRecurringTaskStatus(id, 'skipped', selectedDate),
    [setRecurringTaskStatus, selectedDate]
  );
  const handleTaskArchive = useCallback((id) => archiveTask(id), [archiveTask]);
  const handleTaskChecklistToggle = useCallback(
    (id, itemId) => toggleChecklistItem(id, itemId),
    [toggleChecklistItem]
  );
  const handleTaskViewDetails = useCallback(
    (id) => navigation.navigate('TaskDetail', { taskId: id }),
    [navigation]
  );
  const handleTaskDeleteRequest = useCallback(
    (id) => {
      const task = tasks.find((tk) => tk.id === id);
      if (!task) return;
      Alert.alert(t('deleteTaskTitle'), t('deleteTaskBody'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => deleteTask(task.id) },
      ]);
    },
    [tasks, deleteTask, t]
  );

  const handlePlanningPress = useCallback(
    (id) => navigation.navigate('AddEditPlanning', { planningId: id }),
    [navigation]
  );
  const handlePlanningToggleCompleted = useCallback(
    (id) => {
      const item = planningItems.find((p) => p.id === id);
      if (!item) return;
      setDayCompleted(id, !isPlanningDayCompleted(item, selectedDate), selectedDate);
    },
    [planningItems, setDayCompleted, selectedDate]
  );
  const handlePlanningDeleteToday = useCallback(
    (id) => deleteTodayOnly(id, selectedDate),
    [deleteTodayOnly, selectedDate]
  );
  const handlePlanningDeletePlanRequest = useCallback(
    (id) => {
      const item = planningItems.find((p) => p.id === id);
      if (!item) return;
      Alert.alert(t('deletePlanConfirmTitle'), t('deletePlanConfirmBody'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => deletePlanningItem(item.id) },
      ]);
    },
    [planningItems, deletePlanningItem, t]
  );

  const handleChallengeCheckIn = useCallback((id) => checkInChallenge(id), [checkInChallenge]);
  const handleChallengeViewDetails = useCallback(
    (id) => navigation.navigate('ChallengeDetail', { challengeId: id }),
    [navigation]
  );
  const handleChallengeEdit = useCallback(
    (id) => navigation.navigate('StartChallenge', { challengeId: id }),
    [navigation]
  );
  const handleChallengeArchive = useCallback((id) => archiveChallenge(id), [archiveChallenge]);
  const handleChallengeDeleteRequest = useCallback(
    (id) => {
      const challenge = challenges.find((c) => c.id === id);
      if (!challenge) return;
      Alert.alert(t('deleteConfirmTitle'), t('deleteConfirmBody'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => deleteChallenge(challenge.id) },
      ]);
    },
    [challenges, deleteChallenge, t]
  );

  // Stable across renders (no deps), reused by every card instead of a
  // fresh `() => setReorderMode(true)` closure built per item.
  const handleReorderRequest = useCallback(() => setReorderMode(true), []);

  const handleArchiveCompleted = () => {
    Alert.alert(t('archiveCompletedTitle'), t('archiveCompletedBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('archive'), style: 'destructive', onPress: archiveAllCompletedToday },
    ]);
  };

  const handleAddPress = () => {
    Haptics.selectionAsync();
    setAddMenuVisible(true);
  };

  // Scroll-aware FAB: fade/slide it out of the way while the user is
  // actively scrolling down the list, and bring it back on scroll-up or as
  // soon as scrolling stops, so it doesn't permanently block content.
  const fabAnim = useRef(new Animated.Value(1)).current; // 1 = visible, 0 = hidden
  const [fabVisible, setFabVisible] = useState(true);
  const lastScrollY = useRef(0);
  const fabIdleTimer = useRef(null);

  const setFab = (visible) => {
    setFabVisible(visible);
    Animated.spring(fabAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      friction: 9,
      tension: 60,
    }).start();
  };

  const handleListScroll = (y) => {
    const delta = y - lastScrollY.current;
    lastScrollY.current = y;

    if (Math.abs(delta) > 4) {
      if (delta > 0 && y > 24) setFab(false); // scrolling down past the top
      else setFab(true); // scrolling up
    }

    if (fabIdleTimer.current) clearTimeout(fabIdleTimer.current);
    fabIdleTimer.current = setTimeout(() => setFab(true), 500); // reveal once scrolling stops
  };

  useEffect(() => {
    return () => {
      if (fabIdleTimer.current) clearTimeout(fabIdleTimer.current);
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuBtn}>
            <Ionicons name="menu" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('today')}</Text>
        </View>

        {/* Compact circular progress ring replacing the old large summary card */}
        {totalDue > 0 && (
          <View style={styles.ringWrap}>
            <ProgressRing
              size={44}
              strokeWidth={4.5}
              progress={overallRatio}
              color={allDoneToday ? '#00E676' : colors.primary}
              trackColor={withAlpha(colors.text, 0.08)}
            >
              <Text style={{ color: colors.text, fontSize: 11, fontWeight: '800' }}>
                {overallDone}/{totalDue}
              </Text>
            </ProgressRing>
            {allDoneToday && <Confetti burstKey={burstKey} colors={['#00E676', colors.primary, '#FFD60A']} />}
          </View>
        )}
      </View>

      {priorityTask && (
        <TouchableOpacity
          onPress={() => toggleSingleTaskComplete(priorityTask.id)}
          style={[styles.priorityBanner, { backgroundColor: withAlpha('#FFD60A', 0.15), borderColor: withAlpha('#FFD60A', 0.4) }]}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{t('priorityTaskPinnedLabel')}</Text>
          <Text style={{ fontSize: 14, color: colors.text, marginTop: 2 }} numberOfLines={1}>{priorityTask.title}</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={listRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        data={dateStrip}
        keyExtractor={(d) => toKey(d)}
        initialScrollIndex={DATE_RANGE_DAYS}
        getItemLayout={(_, index) => ({ length: 44, offset: 44 * index, index })}
        onScrollToIndexFailed={() => {}}
        contentContainerStyle={{ paddingBottom: 8, gap: 6 }}
        style={{ flexGrow: 0, marginBottom: 10 }}
        renderItem={({ item }) => {
          const isSelected = toKey(item) === selectedKey;
          return (
            <TouchableOpacity
              onPress={() => setSelectedDate(item)}
              activeOpacity={0.7}
              style={[
                styles.dateTile,
                isSelected && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={{ color: isSelected ? colors.onPrimary : colors.textSecondary, fontSize: 10, fontWeight: '600' }}>
                {item.toLocaleDateString(locale, { weekday: 'short' })}
              </Text>
              <Text style={{ color: isSelected ? colors.onPrimary : colors.text, fontSize: 14, fontWeight: '800', marginTop: 1 }}>
                {item.getDate()}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {completedCount > 0 && (
        <TouchableOpacity onPress={handleArchiveCompleted} style={styles.archiveRow}>
          <Ionicons name="archive-outline" size={15} color={colors.textSecondary} />
          <Text style={[styles.archiveText, { color: colors.textSecondary }]}>
            {t('archiveCompletedToday', completedCount)}
          </Text>
        </TouchableOpacity>
      )}

      {reorderMode && combinedList.length > 0 && (
        <View style={[styles.reorderBanner, tokens.glass.card]}>
          <Ionicons name="swap-vertical-outline" size={16} color={colors.primary} />
          <Text style={[styles.reorderBannerText, { color: colors.textSecondary }]} numberOfLines={1}>
            {t('reorderModeHint')}
          </Text>
          <TouchableOpacity
            onPress={() => setReorderMode(false)}
            style={[styles.reorderSaveBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 13 }}>{t('doneLabel')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {combinedList.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{t('noHabitsToday')}</Text>
          <TouchableOpacity onPress={handleAddPress}>
            <Text style={{ color: colors.primary, marginTop: 8, fontWeight: '600' }}>{t('addFirstHabit')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <DraggableFlatList
          data={displayList}
          keyExtractor={(item) => item.id}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          onDragEnd={handleDragEnd}
          onScrollOffsetChange={handleListScroll}
          activationDistance={12}
          renderItem={({ item, index, drag, isActive }) => {
            let card;
            if (item.kind === 'challenge') {
              card = (
                <ChallengeCard
                  challenge={item.data}
                  index={index}
                  onCheckIn={handleChallengeCheckIn}
                  onPress={handleChallengeViewDetails}
                  onArchive={handleChallengeArchive}
                  onDelete={handleChallengeDeleteRequest}
                  onEdit={handleChallengeEdit}
                  onMore={handleChallengeViewDetails}
                  onReorderRequest={handleReorderRequest}
                />
              );
            } else if (item.kind === 'habit') {
              card = (
                <HabitCard
                  habit={item.data}
                  date={selectedDate}
                  index={index}
                  onDone={handleHabitDone}
                  onSkip={handleHabitSkip}
                  onIncrement={handleHabitIncrement}
                  onArchive={handleHabitArchive}
                  onDelete={handleHabitDeleteRequest}
                  onToggleChecklistItem={handleHabitChecklistToggle}
                  onPress={handleHabitViewDetails}
                  onReorderRequest={handleReorderRequest}
                />
              );
            } else if (item.kind === 'task') {
              card = (
                <TaskCard
                  task={item.data}
                  category={taskCategories.find((c) => c.id === item.data.categoryId)}
                  index={index}
                  onToggleComplete={handleTaskToggleComplete}
                  onSkip={handleTaskSkip}
                  onArchive={handleTaskArchive}
                  onDelete={handleTaskDeleteRequest}
                  onToggleChecklistItem={handleTaskChecklistToggle}
                  onPress={handleTaskViewDetails}
                  onReorderRequest={handleReorderRequest}
                />
              );
            } else {
              card = (
                <PlanningCard
                  item={item.data}
                  date={selectedDate}
                  index={index}
                  onPress={handlePlanningPress}
                  onToggleCompleted={handlePlanningToggleCompleted}
                  onDeleteToday={handlePlanningDeleteToday}
                  onDeletePlan={handlePlanningDeletePlanRequest}
                  onReorderRequest={handleReorderRequest}
                />
              );
            }

            // Normally the card is 100% untouched: its own tap / double-tap /
            // long-press menu (which now also offers "Reorder") work exactly
            // as before, and there's no visible handle anywhere. Only once
            // reorder mode is switched on (from that menu) does a fully
            // invisible layer appear on top to catch the long-press-and-drag
            // gesture; it disappears the moment "Save" is tapped.
            return (
              <ScaleDecorator>
                <View style={[styles.reorderRow, isActive && styles.reorderRowActive]}>
                  {card}
                  {reorderMode && (
                    <Pressable
                      onLongPress={drag}
                      delayLongPress={150}
                      style={StyleSheet.absoluteFillObject}
                    />
                  )}
                </View>
              </ScaleDecorator>
            );
          }}
        />
      )}

      <Animated.View
        pointerEvents={fabVisible ? 'auto' : 'none'}
        style={[
          styles.fab,
          tokens.glow(colors.primary),
          {
            opacity: fabAnim,
            transform: [
              { scale: fabAnim },
              {
                translateY: fabAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity onPress={handleAddPress} style={styles.fabTouchable} activeOpacity={0.85}>
          <LinearGradient
            colors={tokens.gradient(colors.primary)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color={colors.onPrimary} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <SideDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} navigation={navigation} />
      <AddOptionsSheet
        visible={addMenuVisible}
        onClose={() => setAddMenuVisible(false)}
        onSelectHabit={() => navigation.navigate('AddEditHabit')}
        onSelectRecurringTask={() => navigation.navigate('NewTask', { taskType: 'recurring' })}
        onSelectTask={() => navigation.navigate('NewTask', { taskType: 'single' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  priorityBanner: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: { padding: 4 },
  title: { fontSize: 26, fontWeight: '800' },
  ringWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dateTile: { width: 38, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -60 },
  archiveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  archiveText: { fontSize: 12, fontWeight: '600' },
  challengesSection: { marginBottom: 6 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.4 },
  reorderRow: { position: 'relative' },
  reorderRowActive: { opacity: 0.85 },
  reorderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  reorderBannerText: { flex: 1, fontSize: 12.5 },
  reorderSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  fabTouchable: {
    width: 56,
    height: 56,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
