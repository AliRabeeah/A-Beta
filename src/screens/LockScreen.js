import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppLock } from '../context/AppLockContext';
import { authenticateWithBiometrics, isBiometricAvailable } from '../utils/biometricAuth';

const PIN_PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/**
 * Full-screen, back-button-proof lock. Rendered directly by App.js in place
 * of the whole navigator whenever the app is locked, so there's no way to
 * navigate around it and no back gesture that dismisses it.
 */
export default function LockScreen({ onUnlock }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { method, verifyPin, lockoutRemainingMs, resetAppLock } = useAppLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [tryingBiometric, setTryingBiometric] = useState(false);
  const [checkingPin, setCheckingPin] = useState(false);
  const [lockoutMs, setLockoutMs] = useState(0);
  const [recoveryBiometricAvailable, setRecoveryBiometricAvailable] = useState(false);
  const tickRef = useRef(null);

  useEffect(() => {
    // Checked independently of `method` — someone using the PIN method may
    // still have biometrics enrolled on the device, and that's a strong
    // enough proof of identity to use as a "forgot PIN" fallback.
    isBiometricAvailable().then(setRecoveryBiometricAvailable);
  }, []);

  // Blocks screenshots and screen recording while sensitive PIN/biometric
  // entry is on screen, and (on Android) also blanks this screen's
  // thumbnail in the OS "Recent Apps" switcher.
  usePreventScreenCapture('app-lock-screen');

  const tryBiometric = async () => {
    setTryingBiometric(true);
    const ok = await authenticateWithBiometrics();
    setTryingBiometric(false);
    if (ok) onUnlock();
  };

  useEffect(() => {
    // Block the Android hardware back button entirely while locked.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    if (method === 'biometric') tryBiometric();
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll the lockout countdown once a second while it's active, so the
  // "try again in N min" message and the disabled pad clear on their own.
  useEffect(() => {
    const check = () => {
      const remaining = lockoutRemainingMs();
      setLockoutMs(remaining);
    };
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
    if (next.length >= 4) {
      submitPin(next);
    }
  };

  const handleSubmitPin = () => submitPin(pin);

  const lockoutMinutes = Math.ceil(lockoutMs / 60000);

  const doResetAppLock = async () => {
    await resetAppLock();
    onUnlock();
  };

  const handleForgotPin = () => {
    if (recoveryBiometricAvailable) {
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
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40 }]}>
      <View style={styles.center}>
        <Ionicons name="lock-closed" size={40} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>{t('appLockedTitle')}</Text>

        {method === 'biometric' ? (
          <TouchableOpacity onPress={tryBiometric} disabled={tryingBiometric} style={[styles.bioBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="finger-print" size={22} color={colors.onPrimary} />
            <Text style={{ color: colors.onPrimary, fontWeight: '700', marginLeft: 8 }}>{t('unlockWithBiometric')}</Text>
          </TouchableOpacity>
        ) : (
          <>
            {isLockedOut ? (
              <Text style={{ color: colors.danger, marginBottom: 20, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 }}>
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
                {error && <Text style={{ color: colors.danger, marginTop: 8, fontSize: 13 }}>{t('wrongPinTryAgain')}</Text>}
              </>
            )}

            <View style={[styles.pad, isLockedOut && { opacity: 0.35 }]} pointerEvents={isLockedOut ? 'none' : 'auto'}>
              {PIN_PAD.map((key, i) => (
                <TouchableOpacity
                  key={i}
                  disabled={key === ''}
                  onPress={() => handleKeyPress(key)}
                  style={styles.padKey}
                >
                  {key === 'del' ? (
                    <Ionicons name="backspace-outline" size={22} color={colors.text} />
                  ) : (
                    <Text style={{ color: colors.text, fontSize: 24, fontWeight: '600' }}>{key}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSubmitPin}
              disabled={isLockedOut || checkingPin}
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isLockedOut ? 0.4 : 1 }]}
            >
              <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{t('unlockWithPin')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPin} style={{ marginTop: 18 }} hitSlop={8}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>{t('forgotPinLink')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', width: '100%', paddingHorizontal: 30 },
  title: { fontSize: 22, fontWeight: '800', marginTop: 14, marginBottom: 30 },
  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16 },
  dotsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'center' },
  padKey: { width: 260 / 3, height: 64, alignItems: 'center', justifyContent: 'center' },
  submitBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 14 },
});
