import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '../utils/secureStorage'; // encrypted at rest -- see secureStorage.js
import { TAB_BAR_POOL } from './TabBarContext';

const STORAGE_KEY = 'a_speeddial_config_v1';

// Every screen the FAB's quick-nav popover (FabSpeedDial) is allowed to
// shortcut to. Starts from the same pool the bottom tab bar uses, so the
// ten screens they share look identical (same icon) whether reached from
// the tab bar, the speed dial, or the Settings customizer — then adds the
// two drawer-only destinations that aren't full tab-bar screens but are
// still valid navigation targets.
export const SPEED_DIAL_POOL = [
  ...TAB_BAR_POOL,
  { id: 'Wishlist', icon: 'sparkles-outline' },
  { id: 'Archive', icon: 'archive-outline' },
  { id: 'About', icon: 'information-circle-outline' },
];

// Default on first run = today's fixed shortcut list, in the same order,
// so nothing changes for existing installs until the user opts in.
export const DEFAULT_SPEED_DIAL = ['Tasks', 'Habits', 'Today', 'Notes', 'Settings'];

export const MIN_SHORTCUTS = 2;
export const MAX_SHORTCUTS = 8;

const SpeedDialContext = createContext(null);

export function SpeedDialProvider({ children }) {
  const [items, setItemsState] = useState(DEFAULT_SPEED_DIAL);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // Guard against corrupted/old data, and against ids for screens
          // that no longer exist in the pool — fall back to defaults
          // rather than crashing the whole popover.
          const valid = Array.isArray(parsed) && parsed.every((id) => SPEED_DIAL_POOL.some((s) => s.id === id));
          if (valid && parsed.length >= MIN_SHORTCUTS && parsed.length <= MAX_SHORTCUTS) {
            setItemsState(parsed);
          }
        } catch (e) {
          // keep defaults
        }
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (next) => {
    setItemsState(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const toggleItem = useCallback(
    async (screenId) => {
      const isActive = items.includes(screenId);
      if (isActive) {
        if (items.length <= MIN_SHORTCUTS) return { ok: false, reason: 'min' };
        await persist(items.filter((id) => id !== screenId));
        return { ok: true };
      }
      if (items.length >= MAX_SHORTCUTS) return { ok: false, reason: 'max' };
      await persist([...items, screenId]);
      return { ok: true };
    },
    [items, persist]
  );

  // Adjacent-swap reorder for the up/down arrow buttons in Settings.
  const moveItem = useCallback(
    async (screenId, direction) => {
      const index = items.indexOf(screenId);
      if (index === -1) return;
      const swapWith = index + direction;
      if (swapWith < 0 || swapWith >= items.length) return;
      const next = [...items];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      await persist(next);
    },
    [items, persist]
  );

  // Used by drag-and-drop reordering in Settings, where the gesture already
  // produces the full final order.
  const reorderItems = useCallback(
    async (nextOrder) => {
      const valid = Array.isArray(nextOrder) && nextOrder.length === items.length && nextOrder.every((id) => items.includes(id));
      if (!valid) return;
      await persist(nextOrder);
    },
    [items, persist]
  );

  const resetToDefault = useCallback(async () => {
    await persist(DEFAULT_SPEED_DIAL);
  }, [persist]);

  const value = useMemo(
    () => ({ items, loaded, toggleItem, moveItem, reorderItems, resetToDefault, pool: SPEED_DIAL_POOL }),
    [items, loaded, toggleItem, moveItem, reorderItems, resetToDefault]
  );

  return (
    <SpeedDialContext.Provider value={value}>
      {children}
    </SpeedDialContext.Provider>
  );
}

export function useSpeedDial() {
  const ctx = useContext(SpeedDialContext);
  if (!ctx) throw new Error('useSpeedDial must be used within SpeedDialProvider');
  return ctx;
}
