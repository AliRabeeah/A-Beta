import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '../utils/secureStorage'; // encrypted at rest -- see secureStorage.js

const STORAGE_KEY = 'a_tabbar_config_v1';

// Every screen that's allowed to appear in the bottom bar. Icons mirror the
// ones already used in navigation/index.js so a screen looks the same
// whether it's a tab or reached via the drawer/stack.
export const TAB_BAR_POOL = [
  { id: 'Today', icon: 'checkmark-circle' },
  { id: 'Habits', icon: 'list' },
  { id: 'Tasks', icon: 'clipboard-outline' },
  { id: 'Notes', icon: 'document-text-outline' },
  { id: 'Settings', icon: 'settings-sharp' },
  { id: 'Stats', icon: 'bar-chart' },
  { id: 'Challenges', icon: 'trophy-outline' },
  { id: 'Favorites', icon: 'heart-outline' },
  { id: 'Planning', icon: 'calendar-outline' },
  { id: 'Timer', icon: 'timer-outline' },
];

// Default on first run = exactly today's fixed 5 tabs, in the same order,
// so nothing changes for existing installs until the user opts in.
export const DEFAULT_TAB_CONFIG = ['Today', 'Habits', 'Tasks', 'Notes', 'Settings'];

export const MIN_TABS = 3;
export const MAX_TABS = 5;

const TabBarContext = createContext(null);

export function TabBarProvider({ children }) {
  const [tabs, setTabsState] = useState(DEFAULT_TAB_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // Guard against corrupted/old data - fall back to defaults rather
          // than crashing the whole navigator.
          const valid = Array.isArray(parsed) && parsed.every((id) => TAB_BAR_POOL.some((s) => s.id === id));
          if (valid && parsed.length >= MIN_TABS && parsed.length <= MAX_TABS) {
            setTabsState(parsed);
          }
        } catch (e) {
          // keep defaults
        }
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (next) => {
    setTabsState(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const toggleTab = useCallback(
    async (screenId) => {
      const isActive = tabs.includes(screenId);
      if (isActive) {
        if (tabs.length <= MIN_TABS) return { ok: false, reason: 'min' };
        await persist(tabs.filter((id) => id !== screenId));
        return { ok: true };
      }
      if (tabs.length >= MAX_TABS) return { ok: false, reason: 'max' };
      await persist([...tabs, screenId]);
      return { ok: true };
    },
    [tabs, persist]
  );

  const moveTab = useCallback(
    async (screenId, direction) => {
      const index = tabs.indexOf(screenId);
      if (index === -1) return;
      const swapWith = index + direction;
      if (swapWith < 0 || swapWith >= tabs.length) return;
      const next = [...tabs];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      await persist(next);
    },
    [tabs, persist]
  );

  // Used by drag-and-drop reordering in Settings, where the gesture already
  // produces the full final order — no need to compute it as a series of
  // adjacent swaps the way the up/down arrow buttons (`moveTab`) do.
  const reorderTabs = useCallback(
    async (nextOrder) => {
      const valid = Array.isArray(nextOrder) && nextOrder.length === tabs.length && nextOrder.every((id) => tabs.includes(id));
      if (!valid) return;
      await persist(nextOrder);
    },
    [tabs, persist]
  );

  const resetToDefault = useCallback(async () => {
    await persist(DEFAULT_TAB_CONFIG);
  }, [persist]);

  const value = useMemo(
    () => ({ tabs, loaded, toggleTab, moveTab, reorderTabs, resetToDefault, pool: TAB_BAR_POOL }),
    [tabs, loaded, toggleTab, moveTab, reorderTabs, resetToDefault]
  );

  return (
    <TabBarContext.Provider value={value}>
      {children}
    </TabBarContext.Provider>
  );
}

export function useTabBar() {
  const ctx = useContext(TabBarContext);
  if (!ctx) throw new Error('useTabBar must be used within TabBarProvider');
  return ctx;
}
