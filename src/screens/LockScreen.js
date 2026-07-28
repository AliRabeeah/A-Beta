import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppLock } from '../context/AppLockContext';
import { authenticateWithBiometrics } from '../utils/biometricAuth';

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
  const { method, verifyPin } = useAppLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [tryingBiometric, setTryingBiometric] = useState(false);

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

  const handleKeyPress = (key) => {
    if (key === '') return;
    Haptics.selectionAsync();
    if (key === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    const next = (pin + key).slice(0, 8);
    setPin(next);
    if (next.length >= 4) {
      if (verifyPin(next)) {
        onUnlock();
      } else if (next.length === 8 || key === 'submit') {
        setError(true);
        setPin('');
      }
    }
  };

  const handleSubmitPin = () => {
    if (verifyPin(pin)) {
      onUnlock();
    } else {
      setError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPin('');
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

            <View style={styles.pad}>
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

            <TouchableOpacity onPress={handleSubmitPin} style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{t('unlockWithPin')}</Text>
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
