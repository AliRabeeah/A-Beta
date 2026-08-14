import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useFonts } from 'expo-font';
import AsyncStorage from '../utils/secureStorage'; // encrypted at rest -- see secureStorage.js

const FONT_KEY = 'a_app_font';

// `family: null` means "don't override" -> every screen falls back to
// its normal default (system font on iOS/Android). The other options
// either point at one of the two custom typefaces bundled in
// assets/fonts, or at a generic family name React Native resolves to a
// built-in font on both platforms without needing any file at all.
export const FONT_OPTIONS = [
  { id: 'system', labelKey: 'fontSystemDefault', family: null },
  { id: 'manrope', labelKey: 'fontManrope', family: 'Manrope-Regular' },
  { id: 'fraunces', labelKey: 'fontFraunces', family: 'Fraunces-Regular' },
  { id: 'serif', labelKey: 'fontSerif', family: 'serif' },
  { id: 'monospace', labelKey: 'fontMonospace', family: 'monospace' },
];

const DEFAULT_FONT_ID = 'system';

const FontContext = createContext(null);

export function FontProvider({ children }) {
  const [fontId, setFontIdState] = useState(DEFAULT_FONT_ID);
  const [storageLoaded, setStorageLoaded] = useState(false);

  // AboutScreen also loads these two typefaces locally for its own
  // headings/quote; expo-font caches by family name, so loading them again
  // here (to make them available to every screen via AppText, not just
  // that one) is cheap and resolves instantly there once this finishes.
  const [fontFilesLoaded, fontFilesError] = useFonts({
    'Fraunces-Regular': require('../../assets/fonts/Fraunces-Regular.ttf'),
    'Fraunces-Italic': require('../../assets/fonts/Fraunces-Italic.ttf'),
    'Manrope-Regular': require('../../assets/fonts/Manrope-Regular.ttf'),
    'Manrope-SemiBold': require('../../assets/fonts/Manrope-SemiBold.ttf'),
  });

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(FONT_KEY);
        if (stored && FONT_OPTIONS.some((f) => f.id === stored)) {
          setFontIdState(stored);
        }
      } finally {
        setStorageLoaded(true);
      }
    })();
  }, []);

  const setFont = useCallback(async (newId) => {
    if (!FONT_OPTIONS.some((f) => f.id === newId)) return;
    setFontIdState(newId);
    await AsyncStorage.setItem(FONT_KEY, newId);
  }, []);

  const option = useMemo(
    () => FONT_OPTIONS.find((f) => f.id === fontId) || FONT_OPTIONS[0],
    [fontId]
  );

  // A font file failing to load shouldn't block the app forever — fall
  // back to treating it as "ready" so the splash screen still hides;
  // AppText/AppTextInput just won't have that custom family available.
  const loaded = storageLoaded && (fontFilesLoaded || !!fontFilesError);

  const value = useMemo(
    () => ({ fontId, fontFamily: option.family, setFont, options: FONT_OPTIONS, loaded }),
    [fontId, option, setFont, loaded]
  );

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}

export function useFont() {
  const ctx = useContext(FontContext);
  if (!ctx) throw new Error('useFont must be used within FontProvider');
  return ctx;
}
