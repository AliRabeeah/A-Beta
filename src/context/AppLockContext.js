import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashPin } from '../utils/simpleHash';

const STORAGE_KEY = 'a_app_lock_v1';

export const AUTO_LOCK_OPTIONS = [
  { id: 0, labelKey: 'autoLockImmediate' },
  { id: 1, labelKey: 'autoLockAfter1Min' },
  { id: 5, labelKey: 'autoLockAfter5Min' },
  { id: -1, labelKey: 'autoLockOnManualClose' }, // -1 = never auto-lock on background
];

const DEFAULT_STATE = {
  enabled: false, // opt-in only, never auto-enabled
  method: 'biometric', // 'biometric' | 'pin'
  pinHash: null,
  autoLockMinutes: 0,
};

const AppLockContext = createContext(null);

export function AppLockProvider({ children }) {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setState({ ...DEFAULT_STATE, ...JSON.parse(raw) });
        } catch (e) {
          // keep defaults
        }
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (next) => {
    setState(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  /**
   * Turning the lock OFF never requires biometrics/PIN — the person is
   * already inside the (unlocked) app when they flip this switch. Turning
   * it ON with the PIN method still open (no pinHash yet) is handled by
   * the Settings screen, which prompts for a PIN before actually enabling.
   */
  const setEnabled = useCallback(
    async (enabled) => {
      await persist({ ...state, enabled });
    },
    [state, persist]
  );

  const setMethod = useCallback(
    async (method) => {
      await persist({ ...state, method });
    },
    [state, persist]
  );

  const setAutoLockMinutes = useCallback(
    async (minutes) => {
      await persist({ ...state, autoLockMinutes: minutes });
    },
    [state, persist]
  );

  const setPin = useCallback(
    async (pin) => {
      await persist({ ...state, pinHash: hashPin(pin) });
    },
    [state, persist]
  );

  const verifyPin = useCallback(
    (pin) => {
      if (!state.pinHash) return false;
      return hashPin(pin) === state.pinHash;
    },
    [state.pinHash]
  );

  // Memoize the context value: without this, every consumer (which, several
  // levels down, includes the whole Today screen and its list of cards) was
  // re-rendered on ANY unrelated re-render of this provider, since a brand
  // new object was handed to the context on every pass.
  const value = useMemo(
    () => ({
      loaded,
      enabled: state.enabled,
      method: state.method,
      autoLockMinutes: state.autoLockMinutes,
      hasPin: !!state.pinHash,
      setEnabled,
      setMethod,
      setAutoLockMinutes,
      setPin,
      verifyPin,
    }),
    [loaded, state, setEnabled, setMethod, setAutoLockMinutes, setPin, verifyPin]
  );

  return (
    <AppLockContext.Provider value={value}>
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
}
