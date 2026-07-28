import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toKey } from '../utils/dateUtils';
import { scheduleReminder, cancelReminder } from '../utils/notifications';
import { refreshTodayWidget } from '../utils/widgetSync';
import { evaluateNumeric, evaluateTimer, evaluateChecklist, defaultHabitFieldsForType } from '../utils/evaluation';

const STORAGE_KEY = 'a_habits_v1';

export const CATEGORIES = [
  { id: 'health', labelKey: 'category_health', color: '#00E676' },
  { id: 'fitness', labelKey: 'category_fitness', color: '#FF9F0A' },
  { id: 'mind', labelKey: 'category_mind', color: '#64D2FF' },
  { id: 'productivity', labelKey: 'category_productivity', color: '#BF5AF2' },
  { id: 'learning', labelKey: 'category_learning', color: '#FFD60A' },
  { id: 'other', labelKey: 'category_other', color: '#8E8E93' },
];

const HabitContext = createContext(null);

export function HabitProvider({ children }) {
  const [habits, setHabits] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setHabits(JSON.parse(raw));
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (next) => {
    setHabits(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    refreshTodayWidget(next); // best-effort; no-op if widget not installed
  }, []);

  const addHabit = useCallback(async (habit) => {
    let reminderId = null;
    if (habit.reminderTime) reminderId = await scheduleReminder(habit);
    const newHabit = {
      id: Date.now().toString(),
      completions: {},
      values: {},
      checklist: {},
      evaluationType: 'yesno',
      kind: 'build', // 'build' | 'avoid' — old habits with no `kind` behave exactly as before
      relapses: [],
      createdAt: new Date().toISOString(),
      reminderId,
      ...defaultHabitFieldsForType(habit.evaluationType),
      ...habit,
    };
    await persist([...habits, newHabit]);
    return newHabit;
  }, [habits, persist]);

  const updateHabit = useCallback(async (id, updates) => {
    const existing = habits.find((h) => h.id === id);
    if (!existing) return;

    let reminderId = existing.reminderId;
    if (updates.reminderTime !== undefined && updates.reminderTime !== existing.reminderTime) {
      await cancelReminder(existing.reminderId);
      reminderId = updates.reminderTime ? await scheduleReminder({ ...existing, ...updates }) : null;
    }

    const next = habits.map((h) => (h.id === id ? { ...h, ...updates, reminderId } : h));
    await persist(next);
  }, [habits, persist]);

  const deleteHabit = useCallback(async (id) => {
    const existing = habits.find((h) => h.id === id);
    if (existing?.reminderId) await cancelReminder(existing.reminderId);
    await persist(habits.filter((h) => h.id !== id));
  }, [habits, persist]);

  /**
   * Sets a habit's status for a given date to 'done' or 'skipped'.
   * Tapping the same status again clears it back to "not done".
   *
   * For checklist-type habits, forcing the whole habit to 'done' via
   * this quick toggle (card tap, widget circle, etc.) also checks off
   * every sub-item for that date — and clearing 'done' unchecks them
   * all again — so the checklist and the overall status never end up
   * out of sync with each other.
   */
  const setCompletionStatus = useCallback(async (id, status, date = new Date()) => {
    const key = toKey(date);
    const next = habits.map((h) => {
      if (h.id !== id) return h;
      const completions = { ...h.completions };
      const current = completions[key] === true ? 'done' : completions[key];
      const clearing = current === status;

      if (clearing) {
        delete completions[key];
      } else {
        completions[key] = status;
      }

      if (h.evaluationType === 'checklist' && status === 'done') {
        const allChecked = {};
        for (const item of h.checklistItems || []) {
          allChecked[item.id] = !clearing;
        }
        const checklist = { ...h.checklist, [key]: allChecked };
        return { ...h, completions, checklist };
      }

      return { ...h, completions };
    });
    await persist(next);
  }, [habits, persist]);

  /**
   * Sets the absolute logged value for a numeric-type habit on a given
   * date (e.g. "6 glasses"), and automatically derives whether that
   * counts as a successful day based on the habit's goal/comparator.
   */
  const setNumericValue = useCallback(async (id, value, date = new Date()) => {
    const key = toKey(date);
    const next = habits.map((h) => {
      if (h.id !== id) return h;
      const values = { ...h.values, [key]: value };
      const completions = { ...h.completions };
      if (evaluateNumeric(h, value)) {
        completions[key] = 'done';
      } else if (completions[key] !== 'skipped') {
        delete completions[key];
      }
      return { ...h, values, completions };
    });
    await persist(next);
  }, [habits, persist]);

  /** Adds `delta` to a numeric or timer habit's logged value for a date. */
  const addToValue = useCallback(async (id, delta, date = new Date()) => {
    const key = toKey(date);
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    const current = habit.values?.[key] || 0;
    const nextValue = Math.max(0, current + delta);
    await setNumericValue(id, nextValue, date);
  }, [habits, setNumericValue]);

  /**
   * Logs elapsed seconds toward a timer-type habit's daily total and
   * derives success the same way as numeric habits (using seconds).
   */
  const logTimerSeconds = useCallback(async (id, seconds, date = new Date()) => {
    const key = toKey(date);
    const next = habits.map((h) => {
      if (h.id !== id) return h;
      const values = { ...h.values, [key]: (h.values?.[key] || 0) + seconds };
      const completions = { ...h.completions };
      if (evaluateTimer(h, values[key])) {
        completions[key] = 'done';
      } else if (completions[key] !== 'skipped') {
        delete completions[key];
      }
      return { ...h, values, completions };
    });
    await persist(next);
  }, [habits, persist]);

  /**
   * Toggles a single checklist sub-item for a given date, then
   * re-evaluates the whole checklist's success condition to decide
   * whether the day counts as Done.
   */
  const setChecklistItem = useCallback(async (id, itemId, checked, date = new Date()) => {
    const key = toKey(date);
    const next = habits.map((h) => {
      if (h.id !== id) return h;
      const dayState = { ...(h.checklist?.[key] || {}), [itemId]: checked };
      const checklist = { ...h.checklist, [key]: dayState };
      const completions = { ...h.completions };
      if (evaluateChecklist(h, dayState)) {
        completions[key] = 'done';
      } else if (completions[key] !== 'skipped') {
        delete completions[key];
      }
      return { ...h, checklist, completions };
    });
    await persist(next);
  }, [habits, persist]);

  /**
   * Logs a relapse for an 'avoid' habit: resets the current avoidance
   * streak (getAvoidStreak in streakUtils reads from this list, not from
   * `completions`) and appends {date, note} to the habit's own history so
   * it's never mixed with build-habit stats.
   */
  const logRelapse = useCallback(async (id, note = '', date = new Date()) => {
    const next = habits.map((h) => {
      if (h.id !== id) return h;
      const relapse = { date: date.toISOString(), note: (note || '').trim() };
      return { ...h, relapses: [...(h.relapses || []), relapse] };
    });
    await persist(next);
  }, [habits, persist]);

  /**
   * Replaces all local habits with an imported/restored set. Cancels
   * existing reminders first (their notification ids won't be valid
   * for the imported set), and re-schedules any reminders included
   * in the imported data.
   */
  const replaceAllHabits = useCallback(async (importedHabits) => {
    for (const h of habits) {
      if (h.reminderId) await cancelReminder(h.reminderId);
    }
    const rehydrated = [];
    for (const h of importedHabits) {
      let reminderId = null;
      if (h.reminderTime) reminderId = await scheduleReminder(h);
      rehydrated.push({ ...h, reminderId });
    }
    await persist(rehydrated);
  }, [habits, persist]);

  const archiveHabit = useCallback(async (id) => {
    const existing = habits.find((h) => h.id === id);
    if (existing?.reminderId) await cancelReminder(existing.reminderId);
    const next = habits.map((h) => (h.id === id ? { ...h, archived: true } : h));
    await persist(next);
  }, [habits, persist]);

  const unarchiveHabit = useCallback(async (id) => {
    const next = habits.map((h) => (h.id === id ? { ...h, archived: false } : h));
    await persist(next);
  }, [habits, persist]);

  const deleteHabitPermanently = useCallback(async (id) => {
    const existing = habits.find((h) => h.id === id);
    if (existing?.reminderId) await cancelReminder(existing.reminderId);
    await persist(habits.filter((h) => h.id !== id));
  }, [habits, persist]);

  /**
   * Bulk-archives every habit whose status for today is 'done'.
   * Useful for clearing today's list of things you no longer want
   * cluttering your active habit list (e.g. a one-off task).
   */
  const archiveAllCompletedToday = useCallback(async () => {
    const todayKey = toKey(new Date());
    const toArchive = habits.filter((h) => {
      const raw = h.completions?.[todayKey];
      const status = raw === true ? 'done' : raw;
      return status === 'done';
    });
    await Promise.all(toArchive.map((h) => h.reminderId && cancelReminder(h.reminderId)));
    const next = habits.map((h) =>
      toArchive.includes(h) ? { ...h, archived: true } : h
    );
    await persist(next);
  }, [habits, persist]);

  return (
    <HabitContext.Provider
      value={{
        habits,
        loaded,
        addHabit,
        updateHabit,
        deleteHabit,
        deleteHabitPermanently,
        setCompletionStatus,
        setNumericValue,
        addToValue,
        logTimerSeconds,
        setChecklistItem,
        logRelapse,
        replaceAllHabits,
        archiveHabit,
        unarchiveHabit,
        archiveAllCompletedToday,
        categories: CATEGORIES,
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}

export function useHabits() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error('useHabits must be used within HabitProvider');
  return ctx;
}
