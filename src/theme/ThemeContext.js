import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '../utils/secureStorage'; // encrypted at rest -- see secureStorage.js

const MODE_KEY = 'a_theme_mode';
const ACCENT_KEY = 'a_accent_color';

export const ACCENT_PRESETS = [
  { id: 'orange', label: 'Orange', value: '#FF8A00' },
  { id: 'green', label: 'Green', value: '#00E676' },
  { id: 'blue', label: 'Blue', value: '#0A84FF' },
  { id: 'purple', label: 'Purple', value: '#BF5AF2' },
  { id: 'red', label: 'Red', value: '#FF453A' },
  { id: 'yellow', label: 'Yellow', value: '#FFD60A' },
  { id: 'teal', label: 'Teal', value: '#64D2FF' },
  { id: 'pink', label: 'Pink', value: '#FF375F' },
];

const DEFAULT_ACCENT = ACCENT_PRESETS[0].value; // orange

function buildColors(mode, accent) {
  if (mode === 'dark') {
    return {
      background: '#000000',
      surface: '#0A0A0A',
      surfaceElevated: '#161616',
      border: '#232323',
      text: '#FFFFFF',
      textSecondary: '#8E8E93',
      primary: accent,
      danger: '#FF453A',
      onPrimary: '#000000',
    };
  }
  return {
    background: '#FFFFFF',
    surface: '#F5F5F7',
    surfaceElevated: '#FFFFFF',
    border: '#E5E5EA',
    text: '#0A0A0A',
    textSecondary: '#6E6E73',
    primary: accent,
    danger: '#D70015',
    onPrimary: '#000000',
  };
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState('dark'); // 'dark' | 'light' | 'system'
  const [accent, setAccentState] = useState(DEFAULT_ACCENT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedMode, storedAccent] = await Promise.all([
          AsyncStorage.getItem(MODE_KEY),
          AsyncStorage.getItem(ACCENT_KEY),
        ]);
        if (storedMode) setModeState(storedMode);
        if (storedAccent) setAccentState(storedAccent);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setMode = useCallback(async (newMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem(MODE_KEY, newMode);
  }, []);

  const setAccent = useCallback(async (newAccent) => {
    setAccentState(newAccent);
    await AsyncStorage.setItem(ACCENT_KEY, newAccent);
  }, []);

  const resolvedMode = mode === 'system' ? (systemScheme || 'dark') : mode;
  // buildColors returns a brand new object every call; memoizing it (and the
  // context value below) matters a lot here because useTheme() is consumed
  // by almost every screen and card in the app — without memoization, any
  // unrelated re-render of ThemeProvider (e.g. the async load resolving on
  // cold start) forces the entire app to re-render at once.
  const colors = useMemo(() => buildColors(resolvedMode, accent), [resolvedMode, accent]);

  const value = useMemo(
    () => ({ mode: resolvedMode, preference: mode, setMode, colors, accent, setAccent, presets: ACCENT_PRESETS, loaded }),
    [resolvedMode, mode, setMode, colors, accent, setAccent, loaded]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
