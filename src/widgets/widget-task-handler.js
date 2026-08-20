import React from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '../utils/secureStorage'; // encrypted at rest -- see secureStorage.js
import { getWidgetCustomization } from '../utils/widgetCustomization';
import FocusListWidget from './FocusListWidget';
import StatsWidget from './StatsWidget';
import QuickAddWidget from './QuickAddWidget';
import QuoteWidget from './QuoteWidget';
import { pickRandomQuote, emojiForQuoteId, findQuoteById } from '../utils/quotePicker';
import {
  getWidgetTextColor,
  getWidgetFontFamily,
  getWidgetSize,
  getWidgetAlign,
  getShowAuthor,
  getWidgetShadowEnabled,
  getQuoteEmojiEnabled,
  getCurrentWidgetQuoteId,
  setCurrentWidgetQuoteId,
  getWidgetFitRatio,
  getWidgetOffsets,
  getWidgetRotationInterval,
  getWidgetLastRotatedAt,
  setWidgetLastRotatedAt,
} from '../utils/quoteSettings';

const HABITS_KEY = 'a_habits_v1';
const TASKS_KEY = 'a_tasks_v1';
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

async function handleFocusList(props) {
  if (props.widgetAction === 'WIDGET_CLICK') {
    const { clickAction, clickActionData } = props;
    if (clickAction === 'OPEN_APP') {
      await openApp();
    } else if (clickAction === 'TOGGLE_DONE') {
      const { habitId, dateKey } = clickActionData || {};
      if (habitId && dateKey) {
        const habits = await loadHabits();
        await saveHabits(applyHabitStatus(habits, habitId, dateKey, 'done'));
      }
    } else if (clickAction === 'TASK_TOGGLE_DONE') {
      const { taskId, dateKey } = clickActionData || {};
      if (taskId && dateKey) {
        const tasks = await loadTasks();
        await saveTasks(applyTaskStatus(tasks, taskId, dateKey, 'done'));
      }
    }
  }

  const [habits, tasks, language, custom] = await Promise.all([
    loadHabits(),
    loadTasks(),
    loadLanguage(),
    getWidgetCustomization('list'),
  ]);

  props.renderWidget(
    <FocusListWidget
      habits={habits}
      tasks={tasks}
      language={language}
      accentColor={custom.accentColor}
      style={custom.style}
      size={custom.size}
      offset={custom.offset}
      widgetHeightDp={props.widgetInfo?.height ?? null}
    />
  );
}

async function handleStats(props) {
  if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'OPEN_APP') {
    await openApp();
  }
  const [habits, language, custom] = await Promise.all([
    loadHabits(),
    loadLanguage(),
    getWidgetCustomization('stats'),
  ]);
  props.renderWidget(
    <StatsWidget
      habits={habits}
      language={language}
      accentColor={custom.accentColor}
      style={custom.style}
      size={custom.size}
      offset={custom.offset}
    />
  );
}

async function handleQuickAdd(props) {
  if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'ADD_OPEN_APP') {
    await openApp();
  }
  const [language, custom] = await Promise.all([loadLanguage(), getWidgetCustomization('quickAdd')]);
  props.renderWidget(
    <QuickAddWidget
      language={language}
      accentColor={custom.accentColor}
      style={custom.style}
      size={custom.size}
      offset={custom.offset}
    />
  );
}

async function handleQuoteWidget(props) {
  let quote = null;
  const isTap = props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'NEW_QUOTE';

  if (isTap) {
    // Tap anywhere on the widget -> immediately swap in a new quote, and
    // restart the auto-rotation clock from this moment (so a manual pick
    // doesn't get overwritten by an auto-change a few seconds later).
    quote = await pickRandomQuote();
    await setWidgetLastRotatedAt(Date.now());
  } else {
    // Periodic refresh (Android's own widget update tick, at most every
    // 30 min — see app.json's updatePeriodMillis). Only actually swap the
    // quote once the user's configured auto-change interval has elapsed;
    // otherwise redraw with the same quote so it doesn't reshuffle on
    // every OS-triggered tick.
    const [currentId, intervalMinutes, lastRotatedAt] = await Promise.all([
      getCurrentWidgetQuoteId(),
      getWidgetRotationInterval(),
      getWidgetLastRotatedAt(),
    ]);

    const dueForAutoChange =
      intervalMinutes > 0 && (lastRotatedAt === 0 || Date.now() - lastRotatedAt >= intervalMinutes * 60 * 1000);

    if (dueForAutoChange || !currentId) {
      quote = await pickRandomQuote();
      await setWidgetLastRotatedAt(Date.now());
    } else {
      quote = findQuoteById(currentId);
      if (!quote) quote = await pickRandomQuote();
    }
  }

  if (quote) await setCurrentWidgetQuoteId(quote.id);

  const [textColor, fontFamily, size, align, showAuthor, emojiEnabled, fitRatio, offsets, shadowEnabled] = await Promise.all([
    getWidgetTextColor(),
    getWidgetFontFamily(),
    getWidgetSize(),
    getWidgetAlign(),
    getShowAuthor(),
    getQuoteEmojiEnabled(),
    getWidgetFitRatio(),
    getWidgetOffsets(),
    getWidgetShadowEnabled(),
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
      shadowEnabled={shadowEnabled}
      widgetWidthDp={props.widgetInfo?.width ?? null}
      widgetHeightDp={props.widgetInfo?.height ?? null}
      fitRatio={fitRatio}
      offsets={offsets}
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
    case 'FocusList':
      return handleFocusList(props);
    case 'Stats':
      return handleStats(props);
    case 'QuickAdd':
      return handleQuickAdd(props);
    case 'QuoteWidget':
    default:
      return handleQuoteWidget(props);
  }
}
