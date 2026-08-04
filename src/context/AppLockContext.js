import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '../utils/secureStorage'; // encrypted at rest -- see secureStorage.js
import * as SecureStore from 'expo-secure-store';

// Non-sensitive bookkeeping (enabled/method/autoLockMinutes) -> AsyncStorage
// (itself encrypted at rest by secureStorage.js, see the import above).
const STORAGE_KEY = 'a_app_lock_v1';
// The PIN itself is a secret -> SecureStore directly (Android Keystore / iOS
// Keychain), the same pattern used for the GitHub token and TMDb key. We
// store the PIN as-is rather than a locally-computed hash: this project has
// no crypto library to do a proper salted+iterated hash (e.g. PBKDF2), and a
// fast, unsalted, un-iterated hand-rolled hash is brute-forceable in a
// fraction of a second for a 4-8 digit PIN if it's ever read directly.
// SecureStore's OS-level encryption gives real protection instead.
const PIN_KEY = 'a_app_lock_pin_v1';
// Failed-attempt bookkeeping for lockout -> AsyncStorage (not secret, but
// encrypted at rest along with everything else via secureStorage.js).
const ATTEMPTS_KEY = 'a_app_lock_attempts_v1';

export const AUTO_LOCK_OPTIONS = [
  { id: 0, labelKey: 'autoLockImmediate' },
  { id: 1, labelKey: 'autoLockAfter1Min' },
  { id: 5, labelKey: 'autoLockAfter5Min' },
  { id: -1, labelKey: 'autoLockOnManualClose' }, // -1 = never auto-lock on background
];

// Escalating lockout after repeated wrong PINs, to make brute-forcing the
// PIN pad impractical. Index = (failedAttempts - LOCKOUT_START), clamped.
const LOCKOUT_START = 5; // no lockout for the first 5 tries
const LOCKOUT_STEPS_MS = [30_000, 60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];

const DEFAULT_STATE = {
  enabled: false, // opt-in only, never auto-enabled
  method: 'biometric', // 'biometric' | 'pin'
  autoLockMinutes: 0,
};

const DEFAULT_ATTEMPTS = { failedAttempts: 0, lockedUntil: 0 };

const AppLockContext = createContext(null);

export function AppLockProvider({ children }) {
  const [state, setState] = useState(DEFAULT_STATE);
  const [hasPin, setHasPin] = useState(false);
  const [attempts, setAttempts] = useState(DEFAULT_ATTEMPTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState({ ...DEFAULT_STATE, ...JSON.parse(raw) });
      } catch (e) {
        // keep defaults
      }
      try {
        const pin = await SecureStore.getItemAsync(PIN_KEY);
        setHasPin(!!pin);
      } catch (e) {
        setHasPin(false);
      }
      try {
        const rawAttempts = await AsyncStorage.getItem(ATTEMPTS_KEY);
        if (rawAttempts) setAttempts({ ...DEFAULT_ATTEMPTS, ...JSON.parse(rawAttempts) });
      } catch (e) {
        // keep defaults
      }
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setState(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const persistAttempts = useCallback(async (next) => {
    setAttempts(next);
    await AsyncStorage.setItem(ATTEMPTS_KEY, JSON.stringify(next));
  }, []);

  /**
   * Turning the lock OFF never requires biometrics/PIN — the person is
   * already inside the (unlocked) app when they flip this switch. Turning
   * it ON with the PIN method still open (no PIN yet) is handled by
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

  const setPin = useCallback(async (pin) => {
    await SecureStore.setItemAsync(PIN_KEY, pin);
    setHasPin(true);
    // A freshly (re)set PIN clears any prior lockout.
    await persistAttempts(DEFAULT_ATTEMPTS);
  }, [persistAttempts]);

  const clearPin = useCallback(async () => {
    await SecureStore.deleteItemAsync(PIN_KEY).catch(() => {});
    setHasPin(false);
  }, []);

  /** How many ms remain before another PIN attempt is allowed (0 = not locked out). */
  const lockoutRemainingMs = useCallback(() => {
    return Math.max(0, attempts.lockedUntil - Date.now());
  }, [attempts.lockedUntil]);

  /**
   * Verifies a PIN against the value in SecureStore. Async because
   * SecureStore is async — callers must await it. Tracks failed attempts
   * and applies an escalating lockout so the PIN pad can't be brute-forced
   * by rapid/automated input.
   */
  const verifyPin = useCallback(
    async (pin) => {
      const remaining = lockoutRemainingMs();
      if (remaining > 0) return false;

      const stored = await SecureStore.getItemAsync(PIN_KEY).catch(() => null);
      if (!stored) return false;

      if (pin === stored) {
        if (attempts.failedAttempts > 0) await persistAttempts(DEFAULT_ATTEMPTS);
        return true;
      }

      const nextFailed = attempts.failedAttempts + 1;
      let lockedUntil = 0;
      if (nextFailed >= LOCKOUT_START) {
        const stepIndex = Math.min(nextFailed - LOCKOUT_START, LOCKOUT_STEPS_MS.length - 1);
        lockedUntil = Date.now() + LOCKOUT_STEPS_MS[stepIndex];
      }
      await persistAttempts({ failedAttempts: nextFailed, lockedUntil });
      return false;
    },
    [attempts.failedAttempts, lockoutRemainingMs, persistAttempts]
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
      hasPin,
      setEnabled,
      setMethod,
      setAutoLockMinutes,
      setPin,
      clearPin,
      verifyPin,
      lockoutRemainingMs,
    }),
    [loaded, state, hasPin, setEnabled, setMethod, setAutoLockMinutes, setPin, clearPin, verifyPin, lockoutRemainingMs]
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
