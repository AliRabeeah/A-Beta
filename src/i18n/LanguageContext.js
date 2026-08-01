import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { translations } from './translations';

const STORAGE_KEY = 'a_language';
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLanguageState(stored);
      } else {
        const deviceLang = Localization.getLocales?.()[0]?.languageCode;
        setLanguageState(deviceLang === 'ar' ? 'ar' : 'en');
      }
      setReady(true);
    })();
  }, []);

  // Deliberately does NOT touch React Native's native I18nManager RTL
  // flag. The whole app already mirrors its own layouts manually via the
  // `isRTL` flag below (every screen/component checks `isRTL` and flips
  // flexDirection/text-align/icons itself). Native I18nManager.forceRTL
  // mirrors flexDirection a second time on top of that, which cancels out
  // those manual flips and is exactly what caused rows (icon + text lists)
  // to render in the wrong order in Arabic. Keeping RTL fully app-driven
  // avoids that double-mirroring, and as a bonus no longer needs an app
  // restart when switching languages.
  const setLanguage = useCallback(async (lang) => {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    setLanguageState(lang);
  }, []);

  // Like colors/`t` in ThemeContext, this is read by virtually every screen
  // via useLanguage() — memoizing it keeps an unrelated re-render of this
  // provider from cascading into a full-app re-render.
  const t = useCallback(
    (key, ...args) => {
      const dict = translations[language] || translations.en;
      const value = dict[key] ?? translations.en[key] ?? key;
      return typeof value === 'function' ? value(...args) : value;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t, isRTL: language === 'ar' }),
    [language, setLanguage, t]
  );

  if (!ready) return null;

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
