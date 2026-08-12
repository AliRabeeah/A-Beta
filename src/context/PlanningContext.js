import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '../utils/secureStorage'; // encrypted at rest -- see secureStorage.js
import { toKey } from '../utils/dateUtils';
import { schedulePlanningReminder, cancelPlanningReminder } from '../utils/notifications';
import { refreshTodayWidget } from '../utils/widgetSync';
import { addToTrash, removeFromTrash } from './TrashContext';
import { emitUndo } from '../utils/undoBus';
import { migratePlanningItem, emptyPoint } from '../utils/planningUtils';

const STORAGE_KEY = 'a_planning_v1';

const PlanningContext = createContext(null);

export function PlanningProvider({ children }) {
  const [planningItems, setPlanningItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(async (raw) => {
        if (!raw) return;
        const stored = JSON.parse(raw);
        // One-time migration: old items ("daily goal" / "extended plan" with
        // `subjects`) get converted to the new free-form points model the
        // first time they're loaded. Already-migrated items pass through
        // untouched, so this is safe to run on every app start.
        const migrated = stored.map(migratePlanningItem);
        setPlanningItems(migrated);
        const changed = JSON.stringify(migrated) !== JSON.stringify(stored);
        if (changed) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      })
      .catch((e) => console.error('Error loading planning items:', e))
      .finally(() => setLoaded(true));
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
      title: '',
      description: '',
      startDate: null,
      dueDate: null,
      reminderAt: null,
      archived: false,
      hiddenDays: {},
      createdAt: new Date().toISOString(),
      points: [],
      ...payload,
    };
    if (newItem.reminderAt) {
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
    if (updates.reminderAt !== undefined && updates.reminderAt !== existing.reminderAt) {
      await cancelPlanningReminder(existing.reminderId);
      reminderId = updates.reminderAt ? await schedulePlanningReminder({ ...existing, ...updates }) : null;
    }

    const next = planningItems.map((p) => (p.id === id ? { ...p, ...updates, reminderId } : p));
    await persist(next);
  }, [planningItems, persist]);

  /** Hides a plan from just today's (or `date`'s) Today/Agenda view without touching the plan itself. */
  const deleteTodayOnly = useCallback(async (id, date = new Date()) => {
    const existing = planningItems.find((p) => p.id === id);
    if (!existing) return;
    const key = toKey(date);
    const next = planningItems.map((p) =>
      p.id === id ? { ...p, hiddenDays: { ...p.hiddenDays, [key]: true } } : p
    );
    await persist(next);
  }, [planningItems, persist]);

  /** Re-adds a previously trashed planning item (used by Undo and by the Trash screen). */
  const restorePlanningItem = useCallback(async (itemData) => {
    setPlanningItems((prev) => {
      if (prev.some((p) => p.id === itemData.id)) return prev;
      const next = [...prev, itemData];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      refreshTodayWidget();
      return next;
    });
  }, []);

  /** Soft-delete: moves the whole planning item to Trash (recoverable for 30 days). */
  const deletePlanningItem = useCallback(async (id) => {
    const existing = planningItems.find((p) => p.id === id);
    if (!existing) return;
    if (existing.reminderId) await cancelPlanningReminder(existing.reminderId);
    await persist(planningItems.filter((p) => p.id !== id));
    const trashId = await addToTrash('planning', existing);
    emitUndo({
      onUndo: async () => {
        await removeFromTrash(trashId);
        await restorePlanningItem(existing);
      },
    });
  }, [planningItems, persist, restorePlanningItem]);

  /**
   * Replaces all local planning items with an imported/restored set,
   * mirroring replaceAllHabits/replaceAllTasks: cancels reminders tied to
   * the current set first, then reschedules any reminders in the imported
   * data. Imported items pass through the same migration as items loaded
   * from disk, so older backups still work.
   */
  const replaceAllPlanningItems = useCallback(async (importedItems) => {
    for (const p of planningItems) {
      if (p.reminderId) await cancelPlanningReminder(p.reminderId);
    }
    const migrated = importedItems.map(migratePlanningItem);
    const rehydrated = [];
    for (const p of migrated) {
      let reminderId = null;
      if (p.reminderAt) reminderId = await schedulePlanningReminder(p);
      rehydrated.push({ ...p, reminderId });
    }
    await persist(rehydrated);
  }, [planningItems, persist]);

  /** Bulk-marks every point in a plan as completed/uncompleted at once
   *  (the card's quick checkbox — "I finished everything in this plan"). */
  const setDayCompleted = useCallback(async (id, completed /* , date -- unused, see planningUtils.isDayCompleted */) => {
    const now = new Date().toISOString();
    const next = planningItems.map((p) => {
      if (p.id !== id) return p;
      const points = (p.points || []).map((pt) => ({
        ...pt,
        completed,
        completedAt: completed ? now : null,
      }));
      return { ...p, points };
    });
    await persist(next);
  }, [planningItems, persist]);

  /** Appends a new empty point to a plan and returns its id. */
  const addPoint = useCallback(async (planId, text = '') => {
    const point = { ...emptyPoint(), text };
    const next = planningItems.map((p) => (p.id === planId ? { ...p, points: [...(p.points || []), point] } : p));
    await persist(next);
    return point.id;
  }, [planningItems, persist]);

  const updatePoint = useCallback(async (planId, pointId, updates) => {
    const now = new Date().toISOString();
    const next = planningItems.map((p) => {
      if (p.id !== planId) return p;
      const points = (p.points || []).map((pt) => {
        if (pt.id !== pointId) return pt;
        const merged = { ...pt, ...updates };
        if (updates.completed !== undefined) merged.completedAt = updates.completed ? now : null;
        return merged;
      });
      return { ...p, points };
    });
    await persist(next);
  }, [planningItems, persist]);

  const togglePoint = useCallback((planId, pointId) => {
    const plan = planningItems.find((p) => p.id === planId);
    const point = plan?.points?.find((pt) => pt.id === pointId);
    if (!point) return;
    return updatePoint(planId, pointId, { completed: !point.completed });
  }, [planningItems, updatePoint]);

  const removePoint = useCallback(async (planId, pointId) => {
    const next = planningItems.map((p) =>
      p.id === planId ? { ...p, points: (p.points || []).filter((pt) => pt.id !== pointId) } : p
    );
    await persist(next);
  }, [planningItems, persist]);

  /** Reorders a plan's points to a caller-supplied array of the same points (drag-to-reorder). */
  const reorderPoints = useCallback(async (planId, orderedPoints) => {
    const next = planningItems.map((p) => (p.id === planId ? { ...p, points: orderedPoints } : p));
    await persist(next);
  }, [planningItems, persist]);

  const value = useMemo(
    () => ({
      planningItems,
      loaded,
      addPlanningItem,
      updatePlanningItem,
      deletePlanningItem,
      restorePlanningItem,
      replaceAllPlanningItems,
      deleteTodayOnly,
      setDayCompleted,
      addPoint,
      updatePoint,
      togglePoint,
      removePoint,
      reorderPoints,
    }),
    [
      planningItems,
      loaded,
      addPlanningItem,
      updatePlanningItem,
      deletePlanningItem,
      restorePlanningItem,
      replaceAllPlanningItems,
      deleteTodayOnly,
      setDayCompleted,
      addPoint,
      updatePoint,
      togglePoint,
      removePoint,
      reorderPoints,
    ]
  );

  return (
    <PlanningContext.Provider value={value}>
      {children}
    </PlanningContext.Provider>
  );
}

export function usePlanning() {
  const ctx = useContext(PlanningContext);
  if (!ctx) throw new Error('usePlanning must be used within PlanningProvider');
  return ctx;
}
