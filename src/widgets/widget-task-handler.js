import React from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getWidgetOpacity,
  getWidgetDayOffset,
  setWidgetDayOffset,
  getFocusHabitId,
  getHeatmapHabitId,
} from '../utils/widgetSettings';
import { loadPomodoroWidgetState } from '../utils/pomodoroWidgetState';
import { toKey } from '../utils/dateUtils';
import TodayWidget from './TodayWidget';
import ProgressWidget from './ProgressWidget';
import HabitFocusWidget from './HabitFocusWidget';
import WeeklyHeatmapWidget from './WeeklyHeatmapWidget';
import QuickAddWidget from './QuickAddWidget';
import PomodoroWidget from './PomodoroWidget';
import QuoteWidget from './QuoteWidget';
import { pickRandomQuote, emojiForQuoteId, findQuoteById } from '../utils/quotePicker';
import {
  getWidgetTextColor,
  getWidgetFontFamily,
  getWidgetSize,
  getWidgetAlign,
  getShowAuthor,
  getQuoteEmojiEnabled,
  getCurrentWidgetQuoteId,
  setCurrentWidgetQuoteId,
} from '../utils/quoteSettings';

const HABITS_KEY = 'a_habits_v1';
const TASKS_KEY = 'a_tasks_v1';
const PLANNING_KEY = 'a_planning_v1';
const LANGUAGE_KEY = 'a_language';

async function loadHabits() {
  const raw = await AsyncStorage.getItem(HABITS_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveHabits(habits) {
  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

async function loadTasks() {
  const raw = await AsyncStorage.getItem(TASKS_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveTasks(tasks) {
  await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

async function loadPlanningItems() {
  const raw = await AsyncStorage.getItem(PLANNING_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function savePlanningItems(planningItems) {
  await AsyncStorage.setItem(PLANNING_KEY, JSON.stringify(planningItems));
}

async function loadLanguage() {
  const raw = await AsyncStorage.getItem(LANGUAGE_KEY);
  return raw === 'ar' ? 'ar' : 'en';
}

async function openApp() {
  try {
    await Linking.openURL('a://');
  } catch (e) {
    // Best effort — some launchers/Android versions restrict opening
    // an activity from a background task even on a genuine tap.
  }
}

/**
 * Sets a habit's status for a date (mirrors HabitContext.setCompletionStatus
 * so every widget stays consistent with the in-app behavior). Returns
 * the updated habits array.
 */
function applyHabitStatus(habits, habitId, dateKey, nextStatus) {
  return habits.map((h) => {
    if (h.id !== habitId) return h;
    const completions = { ...h.completions };
    const current = completions[dateKey] === true ? 'done' : completions[dateKey];
    const clearing = current === nextStatus;

    if (clearing) {
      delete completions[dateKey];
    } else if (nextStatus === 'done' && h.evaluationType && h.evaluationType !== 'yesno') {
      completions[dateKey] = 'done';
    } else {
      completions[dateKey] = nextStatus;
    }

    if (h.evaluationType === 'checklist' && nextStatus === 'done') {
      const allChecked = {};
      for (const item of h.checklistItems || []) {
        allChecked[item.id] = !clearing;
      }
      const checklist = { ...h.checklist, [dateKey]: allChecked };
      return { ...h, completions, checklist };
    }

    return { ...h, completions };
  });
}

/**
 * Toggles a task's completion for a date (mirrors TaskContext's
 * toggleSingleTaskComplete / setRecurringTaskStatus).
 */
function applyTaskStatus(tasks, taskId, dateKey, nextStatus) {
  return tasks.map((t) => {
    if (t.id !== taskId) return t;
    if (t.taskType === 'single') {
      const completed = !t.completed;
      return { ...t, completed, completedAt: completed ? new Date().toISOString() : null };
    }
    const completions = { ...t.completions };
    const current = completions[dateKey];
    if (current === nextStatus) delete completions[dateKey];
    else completions[dateKey] = nextStatus;
    return { ...t, completions };
  });
}

/** Toggles a Planning item's completed state for a date (mirrors PlanningContext.setDayCompleted). */
function applyPlanningStatus(planningItems, planningId, dateKey) {
  return planningItems.map((p) => {
    if (p.id !== planningId) return p;
    const completedDays = { ...(p.completedDays || {}) };
    if (completedDays[dateKey]) delete completedDays[dateKey];
    else completedDays[dateKey] = true;
    return { ...p, completedDays };
  });
}

async function handleTodayHabits(props) {
  let dayOffset = await getWidgetDayOffset();

  if (props.widgetAction === 'WIDGET_CLICK') {
    const { clickAction, clickActionData } = props;
    if (clickAction === 'PREV_DAY') {
      dayOffset -= 1;
      await setWidgetDayOffset(dayOffset);
    } else if (clickAction === 'NEXT_DAY') {
      dayOffset += 1;
      await setWidgetDayOffset(dayOffset);
    } else if (clickAction === 'OPEN_APP' || clickAction === 'ADD_HABIT') {
      await openApp();
    } else if (clickAction === 'TOGGLE_DONE' || clickAction === 'TOGGLE_SKIP') {
      const { habitId, dateKey } = clickActionData || {};
      if (habitId && dateKey) {
        const habits = await loadHabits();
        const updated = applyHabitStatus(habits, habitId, dateKey, clickAction === 'TOGGLE_DONE' ? 'done' : 'skipped');
        await saveHabits(updated);
      }
    } else if (clickAction === 'TASK_TOGGLE_DONE' || clickAction === 'TASK_TOGGLE_SKIP') {
      const { taskId, dateKey } = clickActionData || {};
      if (taskId && dateKey) {
        const tasks = await loadTasks();
        const updated = applyTaskStatus(tasks, taskId, dateKey, clickAction === 'TASK_TOGGLE_DONE' ? 'done' : 'skipped');
        await saveTasks(updated);
      }
    } else if (clickAction === 'PLANNING_TOGGLE_DONE') {
      const { planningId, dateKey } = clickActionData || {};
      if (planningId && dateKey) {
        const planningItems = await loadPlanningItems();
        const updated = applyPlanningStatus(planningItems, planningId, dateKey);
        await savePlanningItems(updated);
      }
    }
  }

  const [freshHabits, freshTasks, freshPlanningItems, opacity, language] = await Promise.all([
    loadHabits(),
    loadTasks(),
    loadPlanningItems(),
    getWidgetOpacity(),
    loadLanguage(),
  ]);
  const widgetHeightDp = props.widgetInfo?.height ?? null;

  props.renderWidget(
    <TodayWidget
      habits={freshHabits}
      tasks={freshTasks}
      planningItems={freshPlanningItems}
      dayOffset={dayOffset}
      opacity={opacity}
      language={language}
      widgetHeightDp={widgetHeightDp}
    />
  );
}

async function handleProgressRing(props) {
  if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'OPEN_APP') {
    await openApp();
  }
  const habits = await loadHabits();
  const opacity = await getWidgetOpacity();
  props.renderWidget(<ProgressWidget habits={habits} opacity={opacity} />);
}

async function handleHabitFocus(props) {
  const todayKey = toKey(new Date());

  if (props.widgetAction === 'WIDGET_CLICK') {
    const { clickAction, clickActionData } = props;
    if (clickAction === 'FOCUS_OPEN_APP' || clickAction === 'OPEN_APP') {
      await openApp();
    } else if (clickAction === 'FOCUS_TOGGLE_DONE') {
      const focusId = await getFocusHabitId();
      if (focusId) {
        const habits = await loadHabits();
        const updated = applyHabitStatus(habits, focusId, todayKey, 'done');
        await saveHabits(updated);
      }
    }
  }

  const focusId = await getFocusHabitId();
  const habits = await loadHabits();
  const habit = focusId ? habits.find((h) => h.id === focusId && !h.archived) : null;
  const opacity = await getWidgetOpacity();
  props.renderWidget(<HabitFocusWidget habit={habit} opacity={opacity} />);
}

async function handleWeeklyHeatmap(props) {
  const todayKey = toKey(new Date());

  if (props.widgetAction === 'WIDGET_CLICK') {
    const { clickAction } = props;
    if (clickAction === 'OPEN_APP') {
      await openApp();
    } else if (clickAction === 'HEATMAP_TOGGLE_DONE') {
      const heatmapId = await getHeatmapHabitId();
      if (heatmapId) {
        const habits = await loadHabits();
        const updated = applyHabitStatus(habits, heatmapId, todayKey, 'done');
        await saveHabits(updated);
      }
    }
  }

  const heatmapId = await getHeatmapHabitId();
  const habits = await loadHabits();
  const habit = heatmapId ? habits.find((h) => h.id === heatmapId && !h.archived) : null;
  const opacity = await getWidgetOpacity();
  props.renderWidget(<WeeklyHeatmapWidget habit={habit} opacity={opacity} />);
}

async function handleQuickAdd(props) {
  if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'OPEN_APP') {
    await openApp();
  }
  const opacity = await getWidgetOpacity();
  props.renderWidget(<QuickAddWidget opacity={opacity} />);
}

async function handlePomodoro(props) {
  if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'OPEN_APP') {
    await openApp();
  }
  const state = await loadPomodoroWidgetState();
  const opacity = await getWidgetOpacity();
  props.renderWidget(<PomodoroWidget state={state} opacity={opacity} />);
}

async function handleQuoteWidget(props) {
  let quote = null;

  if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'NEW_QUOTE') {
    // Tap anywhere on the widget -> immediately swap in a new quote.
    quote = await pickRandomQuote();
  } else {
    // Periodic refresh or first render: keep showing the same quote that
    // was last chosen (by the timer or a tap) rather than reshuffling on
    // every Android-triggered redraw.
    const currentId = await getCurrentWidgetQuoteId();
    quote = currentId ? findQuoteById(currentId) : null;
    if (!quote) quote = await pickRandomQuote();
  }

  if (quote) await setCurrentWidgetQuoteId(quote.id);

  const [textColor, fontFamily, size, align, showAuthor, emojiEnabled] = await Promise.all([
    getWidgetTextColor(),
    getWidgetFontFamily(),
    getWidgetSize(),
    getWidgetAlign(),
    getShowAuthor(),
    getQuoteEmojiEnabled(),
  ]);

  props.renderWidget(
    <QuoteWidget
      quoteText={quote?.text || ''}
      author={quote?.author || ''}
      emoji={emojiEnabled && quote ? emojiForQuoteId(quote.id) : ''}
      showAuthor={showAuthor}
      textColor={textColor}
      fontFamily={fontFamily}
      size={size}
      align={align}
    />
  );
}

/**
 * Registered in index.js via registerWidgetTaskHandler(). Android calls
 * this in a headless JS context (no app UI running) whenever any of
 * A's widgets is added, needs a periodic refresh, or is tapped.
 * Routes to the right per-widget handler based on which widget it is.
 */
export async function widgetTaskHandler(props) {
  const widgetName = props.widgetInfo?.widgetName;

  switch (widgetName) {
    case 'ProgressRing':
      return handleProgressRing(props);
    case 'HabitFocus':
      return handleHabitFocus(props);
    case 'WeeklyHeatmap':
      return handleWeeklyHeatmap(props);
    case 'QuickAdd':
      return handleQuickAdd(props);
    case 'PomodoroTimer':
      return handlePomodoro(props);
    case 'QuoteWidget':
      return handleQuoteWidget(props);
    case 'TodayHabits':
    default:
      return handleTodayHabits(props);
  }
}
