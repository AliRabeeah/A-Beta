import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '../utils/secureStorage'; // encrypted at rest -- see secureStorage.js
import { toKey } from '../utils/dateUtils';
import { addToTrash, removeFromTrash } from './TrashContext';
import { emitUndo } from '../utils/undoBus';

const STORAGE_KEY = 'a_journal_v1';

const JournalContext = createContext(null);

export function JournalProvider({ children }) {
  // One entry per day: { '2026-08-12': { content, promptUsed, createdAt, lastEdited } }
  const [entries, setEntries] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => { if (raw) setEntries(JSON.parse(raw)); })
      .catch((e) => console.error('Error loading journal entries:', e))
      .finally(() => setLoaded(true));
  }, []);

  const persist = useCallback(async (next) => {
    setEntries(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const getEntryForDate = useCallback((date = new Date()) => entries[toKey(date)] || null, [entries]);

  const setEntryForDate = useCallback(
    async (content, promptUsed = null, date = new Date()) => {
      const key = toKey(date);
      const existing = entries[key];
      const now = new Date().toISOString();
      const next = {
        ...entries,
        [key]: {
          content,
          promptUsed: promptUsed ?? existing?.promptUsed ?? null,
          createdAt: existing?.createdAt || now,
          lastEdited: now,
        },
      };
      await persist(next);
    },
    [entries, persist]
  );

  /** Soft-delete: moves the day's entry to Trash (recoverable for 30 days). */
  const deleteEntryForDate = useCallback(
    async (date) => {
      const key = toKey(date);
      const existing = entries[key];
      if (!existing) return;
      const next = { ...entries };
      delete next[key];
      await persist(next);
      const trashId = await addToTrash('journal', { date: key, ...existing });
      emitUndo({
        onUndo: async () => {
          await removeFromTrash(trashId);
          setEntries((prev) => {
            const restored = { ...prev, [key]: existing };
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(restored)).catch(() => {});
            return restored;
          });
        },
      });
    },
    [entries, persist]
  );

  /** Re-adds a trashed entry (used directly by the Trash screen's restore action). */
  const restoreEntry = useCallback(async (data) => {
    const { date, ...entry } = data;
    if (!date) return;
    setEntries((prev) => {
      if (prev[date]) return prev; // don't clobber a newer entry written for that day since
      const next = { ...prev, [date]: entry };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const replaceAllEntries = useCallback(async (imported) => {
    await persist(imported || {});
  }, [persist]);

  const value = useMemo(
    () => ({ entries, loaded, getEntryForDate, setEntryForDate, deleteEntryForDate, restoreEntry, replaceAllEntries }),
    [entries, loaded, getEntryForDate, setEntryForDate, deleteEntryForDate, restoreEntry, replaceAllEntries]
  );

  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
}

export function useJournal() {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error('useJournal must be used within JournalProvider');
  return ctx;
}
