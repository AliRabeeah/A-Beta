import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'a_favorites_v1';

// Reuses the app's existing accent palette (ThemeContext.ACCENT_PRESETS) —
// no new brand colors are introduced. Each type just claims one of them.
export const FAVORITE_TYPES = [
  { id: 'movie', labelKey: 'favType_movie', icon: '🎬', color: '#FF453A' },
  { id: 'series', labelKey: 'favType_series', icon: '📺', color: '#0A84FF' },
  { id: 'book', labelKey: 'favType_book', icon: '📚', color: '#FFD60A' },
  { id: 'music', labelKey: 'favType_music', icon: '🎵', color: '#BF5AF2' },
  { id: 'game', labelKey: 'favType_game', icon: '🎮', color: '#00E676' },
  { id: 'place', labelKey: 'favType_place', icon: '📍', color: '#64D2FF' },
  { id: 'other', labelKey: 'favType_other', icon: '✨', color: '#FF375F' },
];

export function favoriteTypeInfo(typeId) {
  return FAVORITE_TYPES.find((t) => t.id === typeId) || FAVORITE_TYPES[FAVORITE_TYPES.length - 1];
}

const FavoriteContext = createContext(null);

export function FavoriteProvider({ children }) {
  const [favorites, setFavorites] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setFavorites(JSON.parse(raw));
      } catch (e) {
        console.error('Error loading favorites:', e);
      }
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setFavorites(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return true;
    } catch (e) {
      console.error('Error saving favorites:', e);
      return false;
    }
  }, []);

  const addFavorite = useCallback(
    async ({ title, type, note, rating }) => {
      const newItem = {
        id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: title.trim(),
        type: type || 'other',
        note: note?.trim() || '',
        rating: rating || 0,
        addedAt: new Date().toISOString(),
      };
      const ok = await persist([newItem, ...favorites]);
      return ok ? newItem : null;
    },
    [favorites, persist]
  );

  const updateFavorite = useCallback(
    async (id, patch) => {
      const next = favorites.map((f) => (f.id === id ? { ...f, ...patch } : f));
      return persist(next);
    },
    [favorites, persist]
  );

  const deleteFavorite = useCallback(
    async (id) => {
      const next = favorites.filter((f) => f.id !== id);
      return persist(next);
    },
    [favorites, persist]
  );

  /** Replaces all local favorites with an imported/restored set. */
  const replaceAllFavorites = useCallback(
    async (importedFavorites) => persist(importedFavorites || []),
    [persist]
  );

  return (
    <FavoriteContext.Provider
      value={{ favorites, loaded, addFavorite, updateFavorite, deleteFavorite, replaceAllFavorites }}
    >
      {children}
    </FavoriteContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoriteContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoriteProvider');
  return ctx;
}
