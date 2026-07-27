import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import TodayWidget from '../widgets/TodayWidget';
import ProgressWidget from '../widgets/ProgressWidget';
import HabitFocusWidget from '../widgets/HabitFocusWidget';
import WeeklyHeatmapWidget from '../widgets/WeeklyHeatmapWidget';
import PomodoroWidget from '../widgets/PomodoroWidget';
import QuoteWidget from '../widgets/QuoteWidget';
import { getWidgetOpacity, getWidgetDayOffset, getFocusHabitId, getHeatmapHabitId } from './widgetSettings';
import { loadPomodoroWidgetState } from './pomodoroWidgetState';
import { pickRandomQuote, emojiForQuoteId, findQuoteById } from './quotePicker';
import {
  getWidgetTextColor,
  getWidgetFontFamily,
  getWidgetSize,
  getWidgetAlign,
  getShowAuthor,
  getQuoteEmojiEnabled,
  getCurrentWidgetQuoteId,
  setCurrentWidgetQuoteId,
} from './quoteSettings';

const LANGUAGE_KEY = 'a_language';
const HABITS_KEY = 'a_habits_v1';
const TASKS_KEY = 'a_tasks_v1';
const PLANNING_KEY = 'a_planning_v1';

async function loadJson(key) {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

/**
 * Called after every habit/task/planning add/update/delete/status-change
 * so every driven home-screen widget updates immediately instead of
 * waiting for Android's periodic refresh interval. Safe to call even
 * if the widget library isn't fully linked yet or the user hasn't
 * added any of these widgets — each update is wrapped so one missing
 * widget instance doesn't stop the others from refreshing.
 *
 * `habitsOverride` lets a caller that already has the freshest in-memory
 * habits array (HabitContext) skip an extra storage read; tasks and
 * planning items are always read fresh from storage since this is also
 * called from TaskContext/PlanningContext, which don't carry habits.
 */
export async function refreshTodayWidget(habitsOverride) {
  const [habits, tasks, planningItems, opacity, dayOffset, storedLang, focusId, heatmapId] = await Promise.all([
    habitsOverride || loadJson(HABITS_KEY),
    loadJson(TASKS_KEY),
    loadJson(PLANNING_KEY),
    getWidgetOpacity(),
    getWidgetDayOffset(),
    AsyncStorage.getItem(LANGUAGE_KEY),
    getFocusHabitId(),
    getHeatmapHabitId(),
  ]);
  const language = storedLang === 'ar' ? 'ar' : 'en';

  const updates = [
    requestWidgetUpdate({
      widgetName: 'TodayHabits',
      renderWidget: () => (
        <TodayWidget
          habits={habits}
          tasks={tasks}
          planningItems={planningItems}
          dayOffset={dayOffset}
          opacity={opacity}
          language={language}
        />
      ),
    }),
    requestWidgetUpdate({
      widgetName: 'ProgressRing',
      renderWidget: () => <ProgressWidget habits={habits} opacity={opacity} />,
    }),
    requestWidgetUpdate({
      widgetName: 'HabitFocus',
      renderWidget: () => <HabitFocusWidget habit={habits.find((h) => h.id === focusId && !h.archived) || null} opacity={opacity} />,
    }),
    requestWidgetUpdate({
      widgetName: 'WeeklyHeatmap',
      renderWidget: () => <WeeklyHeatmapWidget habit={habits.find((h) => h.id === heatmapId && !h.archived) || null} opacity={opacity} />,
    }),
  ];

  for (const update of updates) {
    try {
      await update;
    } catch (e) {
      // No instance of this particular widget on the home screen, or
      // library not linked in this build — safe to ignore and move on.
    }
  }
}

/** Called from the Timer screen whenever the Pomodoro state changes. */
export async function refreshPomodoroWidget() {
  try {
    const [state, opacity] = await Promise.all([loadPomodoroWidgetState(), getWidgetOpacity()]);
    await requestWidgetUpdate({
      widgetName: 'PomodoroTimer',
      renderWidget: () => <PomodoroWidget state={state} opacity={opacity} />,
    });
  } catch (e) {
    // No Pomodoro widget on the home screen — safe to ignore.
  }
}

/**
 * Called from the Quote settings screen whenever a style setting changes
 * (color, font, size, alignment, show-author toggle, emoji toggle) so the
 * home-screen widget reflects it immediately, and also when the user wants
 * to force a brand-new quote right away (`forceNewQuote`).
 */
export async function refreshQuoteWidget(forceNewQuote = false) {
  try {
    let quote = null;
    if (forceNewQuote) {
      quote = await pickRandomQuote();
    } else {
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

    await requestWidgetUpdate({
      widgetName: 'QuoteWidget',
      renderWidget: () => (
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
      ),
    });
  } catch (e) {
    // No Quote widget on the home screen — safe to ignore.
  }
}
