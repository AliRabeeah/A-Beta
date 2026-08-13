import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppLock } from '../../context/AppLockContext';
import { authenticateWithBiometrics, isBiometricAvailable } from '../../utils/biometricAuth';

const PIN_PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/**
 * Full-screen gate rendered in place of the Journal screen until the
 * person authenticates. Every journal entry is locked by design (unlike
 * notes, which lock per-note) — so this gates the section as a whole, once
 * per visit, rather than per-entry: JournalScreen renders this until
 * onUnlock() fires, and the unlocked state resets whenever the screen
 * loses focus, so re-opening Journal always asks again.
 */
export default function JournalUnlockGate({ onUnlock, onCancel }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { hasPin, verifyPin, lockoutRemainingMs, resetAppLock } = useAppLock();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [checkingPin, setCheckingPin] = useState(false);
  const [tryingBiometric, setTryingBiometric] = useState(false);
  const [lockoutMs, setLockoutMs] = useState(0);
  const triedAutoBiometric = useRef(false);
  const tickRef = useRef(null);

  usePreventScreenCapture('journal-unlock-gate');

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  const tryBiometric = async () => {
    setTryingBiometric(true);
    const ok = await authenticateWithBiometrics();
    setTryingBiometric(false);
    if (ok) onUnlock();
  };

  useEffect(() => {
    if (biometricAvailable && !triedAutoBiometric.current) {
      triedAutoBiometric.current = true;
      tryBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricAvailable]);

  useEffect(() => {
    const check = () => setLockoutMs(lockoutRemainingMs());
    check();
    tickRef.current = setInterval(check, 1000);
    return () => clearInterval(tickRef.current);
  }, [lockoutRemainingMs]);

  const isLockedOut = lockoutMs > 0;

  const submitPin = async (candidate) => {
    if (checkingPin || isLockedOut) return;
    setCheckingPin(true);
    const ok = await verifyPin(candidate);
    setCheckingPin(false);
    if (ok) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLockoutMs(lockoutRemainingMs());
    }
  };

  const handleKeyPress = (key) => {
    if (key === '' || isLockedOut || checkingPin) return;
    Haptics.selectionAsync();
    if (key === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    const next = (pin + key).slice(0, 8);
    setPin(next);
    if (next.length >= 4) submitPin(next);
  };

  const lockoutMinutes = Math.ceil(lockoutMs / 60000);
  const noMethod = !biometricAvailable && !hasPin;

  const doResetAppLock = async () => {
    await resetAppLock();
    onUnlock();
  };

  const handleForgotPin = () => {
    if (biometricAvailable) {
      Alert.alert(t('forgotPinTitle'), t('forgotPinBodyWithBiometric'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('unlockWithBiometric'), onPress: tryBiometric },
        { text: t('forgotPinResetAction'), style: 'destructive', onPress: doResetAppLock },
      ]);
    } else {
      Alert.alert(t('forgotPinTitle'), t('forgotPinBodyNoBiometric'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('forgotPinResetAction'), style: 'destructive', onPress: doResetAppLock },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 30 }]}>
      <TouchableOpacity onPress={onCancel} style={styles.backBtn} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.center}>
        <Ionicons name="book" size={36} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>{t('journalLockedTitle')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('journalLockedSubtitle')}</Text>

        {noMethod ? (
          <Text style={[styles.noMethod, { color: colors.textSecondary }]}>{t('noteUnlockNoMethod')}</Text>
        ) : (
          <>
            {biometricAvailable && (
              <TouchableOpacity onPress={tryBiometric} disabled={tryingBiometric} style={[styles.bioBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="finger-print" size={20} color={colors.onPrimary} />
                <Text style={{ color: colors.onPrimary, fontWeight: '700', marginLeft: 8 }}>{t('unlockWithBiometric')}</Text>
              </TouchableOpacity>
            )}

            {hasPin && (
              <>
                {isLockedOut ? (
                  <Text style={{ color: colors.danger, marginTop: 20, fontSize: 14, textAlign: 'center' }}>
                    {t('tooManyAttempts', lockoutMinutes)}
                  </Text>
                ) : (
                  <>
                    <View style={styles.dotsRow}>
                      {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.dot,
                            {
                              borderColor: error ? colors.danger : colors.border,
                              backgroundColor: i < pin.length ? (error ? colors.danger : colors.primary) : 'transparent',
                            },
                          ]}
                        />
                      ))}
                    </View>
                    {error && <Text style={{ color: colors.danger, marginTop: 6, fontSize: 13 }}>{t('wrongPinTryAgain')}</Text>}
                    <View style={[styles.pad, isLockedOut && { opacity: 0.35 }]} pointerEvents={isLockedOut ? 'none' : 'auto'}>
                      {PIN_PAD.map((key, i) => (
                        <TouchableOpacity key={i} disabled={key === ''} onPress={() => handleKeyPress(key)} style={styles.padKey}>
                          {key === 'del' ? (
                            <Ionicons name="backspace-outline" size={20} color={colors.text} />
                          ) : (
                            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>{key}</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity onPress={handleForgotPin} style={{ marginTop: 14 }} hitSlop={8}>
                      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>{t('forgotPinLink')}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </>
        )}

        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('noteUnlockCancel')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  backBtn: { position: 'absolute', left: 16, top: 46, zIndex: 1, padding: 6 },
  center: { flex: 1, alignItems: 'center', width: '100%', paddingHorizontal: 30, marginTop: 20 },
  title: { fontSize: 19, fontWeight: '800', marginTop: 12, marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 24, textAlign: 'center' },
  noMethod: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 22, borderRadius: 14, marginBottom: 22 },
  dotsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dot: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 240, justifyContent: 'center' },
  padKey: { width: 240 / 3, height: 58, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { marginTop: 30, padding: 10 },
});
