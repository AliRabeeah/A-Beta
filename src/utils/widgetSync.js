import React from 'react';
import AsyncStorage from './secureStorage'; // encrypted at rest -- see secureStorage.js
import { requestWidgetUpdate } from 'react-native-android-widget';
import FocusListWidget from '../widgets/FocusListWidget';
import StatsWidget from '../widgets/StatsWidget';
import QuickAddWidget from '../widgets/QuickAddWidget';
import QuoteWidget from '../widgets/QuoteWidget';
import { getWidgetCustomization } from './widgetCustomization';
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
  getWidgetFitRatio,
  getWidgetOffsets,
} from './quoteSettings';

const LANGUAGE_KEY = 'a_language';
const HABITS_KEY = 'a_habits_v1';
const TASKS_KEY = 'a_tasks_v1';

async function loadJson(key) {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

/**
 * Called after every habit/task add/update/delete/status-change so the
 * FocusList and Stats widgets update immediately instead of waiting for
 * Android's periodic refresh interval. Safe to call even if the widget
 * library isn't fully linked yet or the user hasn't added either widget —
 * each update is wrapped so one missing widget instance doesn't stop the
 * other from refreshing.
 *
 * `habitsOverride` lets a caller that already has the freshest in-memory
 * habits array (HabitContext) skip an extra storage read; tasks are
 * always read fresh from storage since this is also called from
 * TaskContext, which doesn't carry habits, and from PlanningContext,
 * which carries neither (planning items no longer feed either widget).
 */
export async function refreshTodayWidget(habitsOverride) {
  const [habits, tasks, storedLang, listCustom, statsCustom] = await Promise.all([
    habitsOverride || loadJson(HABITS_KEY),
    loadJson(TASKS_KEY),
    AsyncStorage.getItem(LANGUAGE_KEY),
    getWidgetCustomization('list'),
    getWidgetCustomization('stats'),
  ]);
  const language = storedLang === 'ar' ? 'ar' : 'en';

  const updates = [
    requestWidgetUpdate({
      widgetName: 'FocusList',
      renderWidget: () => (
        <FocusListWidget
          habits={habits}
          tasks={tasks}
          language={language}
          accentColor={listCustom.accentColor}
          style={listCustom.style}
          size={listCustom.size}
          offset={listCustom.offset}
        />
      ),
    }),
    requestWidgetUpdate({
      widgetName: 'Stats',
      renderWidget: () => (
        <StatsWidget
          habits={habits}
          language={language}
          accentColor={statsCustom.accentColor}
          style={statsCustom.style}
          size={statsCustom.size}
          offset={statsCustom.offset}
        />
      ),
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

/**
 * Called from the Widgets settings screen whenever a customization
 * setting changes (color, size, style, position) for the List, Stats, or
 * Quick Add widget, so the home-screen instance reflects it immediately.
 */
export async function refreshCustomWidget(widgetKey) {
  try {
    if (widgetKey === 'list' || widgetKey === 'stats') {
      await refreshTodayWidget();
    } else if (widgetKey === 'quickAdd') {
      const [storedLang, custom] = await Promise.all([AsyncStorage.getItem(LANGUAGE_KEY), getWidgetCustomization('quickAdd')]);
      const language = storedLang === 'ar' ? 'ar' : 'en';
      await requestWidgetUpdate({
        widgetName: 'QuickAdd',
        renderWidget: () => (
          <QuickAddWidget language={language} accentColor={custom.accentColor} style={custom.style} size={custom.size} offset={custom.offset} />
        ),
      });
    }
  } catch (e) {
    // No instance of this widget on the home screen — safe to ignore.
  }
}

/**
 * Called from the Quote settings screen whenever a style setting changes
 * (color, font, size, alignment, show-author toggle, emoji toggle, fit,
 * position) so the home-screen widget reflects it immediately, and also
 * when the user wants to force a brand-new quote right away
 * (`forceNewQuote`).
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

    const [textColor, fontFamily, size, align, showAuthor, emojiEnabled, fitRatio, offsets] = await Promise.all([
      getWidgetTextColor(),
      getWidgetFontFamily(),
      getWidgetSize(),
      getWidgetAlign(),
      getShowAuthor(),
      getQuoteEmojiEnabled(),
      getWidgetFitRatio(),
      getWidgetOffsets(),
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
          fitRatio={fitRatio}
          offsets={offsets}
        />
      ),
    });
  } catch (e) {
    // No Quote widget on the home screen — safe to ignore.
  }
}
