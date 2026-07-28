import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'a_trash_v1';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function readTrash() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

async function writeTrash(items) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Moves an item into the trash. type is one of
 * 'task' | 'habit' | 'note' | 'planning' | 'favorite'.
 * Returns the new trash entry's id (needed to remove/restore it later).
 * Exported as a plain async function (not a hook) so any context —
 * TaskContext, NoteContext, PlanningContext, FavoriteContext — can call it
 * directly without needing to be nested under TrashProvider.
 */
export async function addToTrash(type, data) {
  const items = await readTrash();
  const entry = {
    id: `trash_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    data,
    deletedAt: new Date().toISOString(),
  };
  items.push(entry);
  await writeTrash(items);
  return entry.id;
}

export async function removeFromTrash(trashId) {
  const items = await readTrash();
  await writeTrash(items.filter((it) => it.id !== trashId));
}

export async function getTrashItems() {
  return readTrash();
}

export async function emptyTrashStorage() {
  await writeTrash([]);
}

/** Permanently deletes anything older than 30 days. Call on every cold start. */
export async function purgeExpiredTrash() {
  const items = await readTrash();
  const cutoff = Date.now() - MAX_AGE_MS;
  const kept = items.filter((it) => {
    const t = new Date(it.deletedAt).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
  if (kept.length !== items.length) await writeTrash(kept);
  return kept;
}

const TrashContext = createContext(null);

export function TrashProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const kept = await purgeExpiredTrash();
    setItems(kept);
    setLoaded(true);
  }, []);

  const removeItem = useCallback(
    async (trashId) => {
      await removeFromTrash(trashId);
      await refresh();
    },
    [refresh]
  );

  const clearAll = useCallback(async () => {
    await emptyTrashStorage();
    setItems([]);
  }, []);

  return (
    <TrashContext.Provider value={{ items, loaded, refresh, removeItem, clearAll }}>
      {children}
    </TrashContext.Provider>
  );
}

export function useTrash() {
  const ctx = useContext(TrashContext);
  if (!ctx) throw new Error('useTrash must be used within TrashProvider');
  return ctx;
}
