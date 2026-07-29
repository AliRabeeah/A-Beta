import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toKey } from '../utils/dateUtils';

const STORAGE_KEY = 'a_mood_v1';

const MoodContext = createContext(null);

export function MoodProvider({ children }) {
  const [moods, setMoods] = useState({}); // { '2026-07-28': { mood: 1-5, note: '' } }
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setMoods(JSON.parse(raw));
        } catch (e) {
          // keep empty
        }
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (next) => {
    setMoods(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  /** Sets (or edits) the mood for a given date. Only one entry per day is kept — a second call for the same day edits it in place. */
  const setMoodForDate = useCallback(
    async (mood, note = '', date = new Date()) => {
      const key = toKey(date);
      const next = { ...moods, [key]: { mood, note: (note || '').trim() } };
      await persist(next);
    },
    [moods, persist]
  );

  const getMoodForDate = useCallback((date = new Date()) => moods[toKey(date)] || null, [moods]);

  const value = useMemo(
    () => ({ moods, loaded, setMoodForDate, getMoodForDate }),
    [moods, loaded, setMoodForDate, getMoodForDate]
  );

  return (
    <MoodContext.Provider value={value}>
      {children}
    </MoodContext.Provider>
  );
}

export function useMood() {
  const ctx = useContext(MoodContext);
  if (!ctx) throw new Error('useMood must be used within MoodProvider');
  return ctx;
}
