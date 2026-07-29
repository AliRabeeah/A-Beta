import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toKey } from '../utils/dateUtils';
import { schedulePlanningReminder, cancelPlanningReminder } from '../utils/notifications';
import { refreshTodayWidget } from '../utils/widgetSync';

const STORAGE_KEY = 'a_planning_v1';

const PlanningContext = createContext(null);

export function PlanningProvider({ children }) {
  const [planningItems, setPlanningItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setPlanningItems(JSON.parse(raw));
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (next) => {
    setPlanningItems(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    refreshTodayWidget(); // best-effort; no-op if widget not installed
  }, []);

  const addPlanningItem = useCallback(async (payload) => {
    let reminderId = null;
    const newItem = {
      id: Date.now().toString(),
      createdDate: toKey(new Date()),
      completedDays: {},
      hiddenDays: {},
      archived: false,
      ...payload,
    };
    if (newItem.type === 'daily' && newItem.reminderTime) {
      reminderId = await schedulePlanningReminder(newItem);
    }
    newItem.reminderId = reminderId;
    await persist([...planningItems, newItem]);
    return newItem;
  }, [planningItems, persist]);

  const updatePlanningItem = useCallback(async (id, updates) => {
    const existing = planningItems.find((p) => p.id === id);
    if (!existing) return;

    let reminderId = existing.reminderId;
    if (existing.type === 'daily' && updates.reminderTime !== undefined && updates.reminderTime !== existing.reminderTime) {
      await cancelPlanningReminder(existing.reminderId);
      reminderId = updates.reminderTime ? await schedulePlanningReminder({ ...existing, ...updates }) : null;
    }

    const next = planningItems.map((p) => (p.id === id ? { ...p, ...updates, reminderId } : p));
    await persist(next);
  }, [planningItems, persist]);

  /** Deletes only today's occurrence: for an extended plan this hides just
   *  that one day without touching the rest; for a daily goal (which only
   *  ever has one occurrence) it deletes the whole item. */
  const deleteTodayOnly = useCallback(async (id, date = new Date()) => {
    const existing = planningItems.find((p) => p.id === id);
    if (!existing) return;

    if (existing.type === 'daily') {
      if (existing.reminderId) await cancelPlanningReminder(existing.reminderId);
      await persist(planningItems.filter((p) => p.id !== id));
      return;
    }

    const key = toKey(date);
    const next = planningItems.map((p) =>
      p.id === id ? { ...p, hiddenDays: { ...p.hiddenDays, [key]: true } } : p
    );
    await persist(next);
  }, [planningItems, persist]);

  const deletePlanningItem = useCallback(async (id) => {
    const existing = planningItems.find((p) => p.id === id);
    if (existing?.reminderId) await cancelPlanningReminder(existing.reminderId);
    await persist(planningItems.filter((p) => p.id !== id));
  }, [planningItems, persist]);

  /**
   * Replaces all local planning items with an imported/restored set,
   * mirroring replaceAllHabits/replaceAllTasks: cancels reminders tied to
   * the current set first, then reschedules any reminders in the imported data.
   */
  const replaceAllPlanningItems = useCallback(async (importedItems) => {
    for (const p of planningItems) {
      if (p.reminderId) await cancelPlanningReminder(p.reminderId);
    }
    const rehydrated = [];
    for (const p of importedItems) {
      let reminderId = null;
      if (p.type === 'daily' && p.reminderTime) reminderId = await schedulePlanningReminder(p);
      rehydrated.push({ ...p, reminderId });
    }
    await persist(rehydrated);
  }, [planningItems, persist]);

  /** Marks (or unmarks) a given date as completed for an item's progress tracker. */
  const setDayCompleted = useCallback(async (id, completed, date = new Date()) => {
    const key = toKey(date);
    const next = planningItems.map((p) => {
      if (p.id !== id) return p;
      const completedDays = { ...(p.completedDays || {}) };
      if (completed) completedDays[key] = true;
      else delete completedDays[key];
      return { ...p, completedDays };
    });
    await persist(next);
  }, [planningItems, persist]);

  return (
    <PlanningContext.Provider
      value={{
        planningItems,
        loaded,
        addPlanningItem,
        updatePlanningItem,
        deletePlanningItem,
        replaceAllPlanningItems,
        deleteTodayOnly,
        setDayCompleted,
      }}
    >
      {children}
    </PlanningContext.Provider>
  );
}

export function usePlanning() {
  const ctx = useContext(PlanningContext);
  if (!ctx) throw new Error('usePlanning must be used within PlanningProvider');
  return ctx;
}
