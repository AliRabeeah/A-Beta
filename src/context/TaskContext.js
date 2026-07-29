import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toKey } from '../utils/dateUtils';
import { scheduleTaskReminders, cancelTaskReminders } from '../utils/notifications';
import { refreshTodayWidget } from '../utils/widgetSync';
import { addToTrash, removeFromTrash } from './TrashContext';
import { emitUndo } from '../utils/undoBus';

const STORAGE_KEY = 'a_tasks_v1';

export const TASK_CATEGORIES = [
  { id: 'task', labelKey: 'taskCategory_task', color: '#FF375F', icon: '⏰' },
  { id: 'personal', labelKey: 'taskCategory_personal', color: '#0A84FF', icon: '👤' },
  { id: 'work', labelKey: 'taskCategory_work', color: '#FFD60A', icon: '💼' },
  { id: 'shopping', labelKey: 'taskCategory_shopping', color: '#00E676', icon: '🛒' },
  { id: 'other', labelKey: 'taskCategory_other', color: '#8E8E93', icon: '📌' },
];

export const PRIORITIES = ['default', 'low', 'medium', 'high'];

const TaskContext = createContext(null);

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setTasks(JSON.parse(raw));
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (next) => {
    setTasks(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    refreshTodayWidget(); // best-effort; no-op if widget not installed
  }, []);

  const addTask = useCallback(async (task) => {
    const reminderIds = await scheduleTaskReminders(task);
    const newTask = {
      id: Date.now().toString(),
      completed: false,
      completedAt: null,
      completions: {},
      checklist: task.checklist || [],
      reminders: task.reminders || [],
      reminderIds,
      note: task.note || '',
      priority: task.priority || 'default',
      dueDate: task.dueDate || toKey(new Date()),
      createdAt: new Date().toISOString(),
      ...task,
      reminderIds,
    };
    await persist([...tasks, newTask]);
    return newTask;
  }, [tasks, persist]);

  const updateTask = useCallback(async (id, updates) => {
    const existing = tasks.find((t) => t.id === id);
    if (!existing) return;

    let reminderIds = existing.reminderIds;
    const remindersChanged = updates.reminders !== undefined &&
      JSON.stringify(updates.reminders) !== JSON.stringify(existing.reminders);
    const dueDateChanged = updates.dueDate !== undefined && updates.dueDate !== existing.dueDate;

    if (remindersChanged || dueDateChanged) {
      await cancelTaskReminders(existing.reminderIds);
      reminderIds = await scheduleTaskReminders({ ...existing, ...updates });
    }

    const next = tasks.map((t) => (t.id === id ? { ...t, ...updates, reminderIds } : t));
    await persist(next);
  }, [tasks, persist]);

  /** Re-adds a previously trashed task exactly as it was (used by Undo and by the Trash screen). */
  const restoreTask = useCallback(async (taskData) => {
    setTasks((prev) => {
      if (prev.some((t) => t.id === taskData.id)) return prev;
      const next = [...prev, taskData];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      refreshTodayWidget();
      return next;
    });
  }, []);

  /** Soft-delete: moves the task to Trash (recoverable for 30 days) instead of erasing it. */
  const deleteTask = useCallback(async (id) => {
    const existing = tasks.find((t) => t.id === id);
    if (!existing) return;
    if (existing.reminderIds) await cancelTaskReminders(existing.reminderIds);
    await persist(tasks.filter((t) => t.id !== id));
    const trashId = await addToTrash('task', existing);
    emitUndo({
      onUndo: async () => {
        await removeFromTrash(trashId);
        await restoreTask(existing);
      },
    });
  }, [tasks, persist, restoreTask]);

  /** Toggles completion for a single (one-off) task. */
  const toggleSingleTaskComplete = useCallback(async (id) => {
    const next = tasks.map((t) => {
      if (t.id !== id) return t;
      const completed = !t.completed;
      return { ...t, completed, completedAt: completed ? new Date().toISOString() : null };
    });
    await persist(next);
  }, [tasks, persist]);

  /** Sets Done/Skipped for a recurring task on a given date (mirrors habit completion). */
  const setRecurringTaskStatus = useCallback(async (id, status, date = new Date()) => {
    const key = toKey(date);
    const next = tasks.map((t) => {
      if (t.id !== id) return t;
      const completions = { ...t.completions };
      const current = completions[key];
      if (current === status) delete completions[key];
      else completions[key] = status;
      return { ...t, completions };
    });
    await persist(next);
  }, [tasks, persist]);

  /**
   * Toggles a single checklist sub-item. For single (one-off) tasks,
   * this also keeps the overall completed state in sync: once every
   * item is checked, the task itself is marked done automatically
   * (matching how checklist-type habits work); unchecking any item
   * reverts it back to not-done.
   */
  const toggleChecklistItem = useCallback(async (id, itemId) => {
    const next = tasks.map((t) => {
      if (t.id !== id) return t;
      const checklist = (t.checklist || []).map((it) => (it.id === itemId ? { ...it, done: !it.done } : it));

      if (t.taskType === 'single' && checklist.length > 0) {
        const allDone = checklist.every((it) => it.done);
        return {
          ...t,
          checklist,
          completed: allDone,
          completedAt: allDone ? (t.completedAt || new Date().toISOString()) : null,
        };
      }

      return { ...t, checklist };
    });
    await persist(next);
  }, [tasks, persist]);

  const replaceAllTasks = useCallback(async (importedTasks) => {
    for (const t of tasks) {
      if (t.reminderIds) await cancelTaskReminders(t.reminderIds);
    }
    const rehydrated = [];
    for (const t of importedTasks) {
      const reminderIds = await scheduleTaskReminders(t);
      rehydrated.push({ ...t, reminderIds });
    }
    await persist(rehydrated);
  }, [tasks, persist]);

  const archiveTask = useCallback(async (id) => {
    const existing = tasks.find((t) => t.id === id);
    if (existing?.reminderIds) await cancelTaskReminders(existing.reminderIds);
    const next = tasks.map((t) => (t.id === id ? { ...t, archived: true } : t));
    await persist(next);
  }, [tasks, persist]);

  const unarchiveTask = useCallback(async (id) => {
    const next = tasks.map((t) => (t.id === id ? { ...t, archived: false } : t));
    await persist(next);
  }, [tasks, persist]);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loaded,
        addTask,
        updateTask,
        deleteTask,
        restoreTask,
        toggleSingleTaskComplete,
        setRecurringTaskStatus,
        toggleChecklistItem,
        replaceAllTasks,
        archiveTask,
        unarchiveTask,
        categories: TASK_CATEGORIES,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTasks must be used within TaskProvider');
  return ctx;
}
