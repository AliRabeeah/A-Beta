import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Cosmetic-only "Rate Us" flow, opened from the About screen's
 * "Rate the App" row.
 *
 * The app is a standalone APK — not published on any app store — so this
 * intentionally does NOT link out anywhere (no Play Store, no
 * expo-store-review, no mailto). It's a self-contained UI: pick 1-5
 * stars, tap Submit, see a thank-you screen, done. Nothing is sent
 * anywhere and nothing is stored.
 */
export default function RateAppModal({ visible, onClose }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState('rate'); // 'rate' | 'thanks'

  const reset = () => {
    setStars(0);
    setStage('rate');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (stars === 0) return;
    setStage('thanks');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, isRTL ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' }]}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          {stage === 'rate' ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>{t('rateModalTitle')}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('rateModalSubtitle')}</Text>

              <View style={[styles.starsRow, isRTL && { flexDirection: 'row-reverse' }]}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setStars(n)} hitSlop={8} style={styles.starBtn}>
                    <Ionicons
                      name={n <= stars ? 'star' : 'star-outline'}
                      size={36}
                      color={n <= stars ? '#F2B33D' : colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={stars === 0}
                style={[styles.btn, { backgroundColor: colors.primary, opacity: stars === 0 ? 0.5 : 1 }]}
              >
                <Text style={[styles.btnText, { color: colors.onPrimary }]}>{t('rateModalSubmit')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClose} style={[styles.btn, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}>
                <Text style={[styles.btnText, { color: colors.text }]}>{t('rateModalMaybeLater')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons
                name="heart"
                size={40}
                color="#F2B33D"
                style={{ alignSelf: 'center', marginBottom: 12 }}
              />
              <Text style={[styles.title, { color: colors.text }]}>{t('rateModalThanksTitle')}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('rateModalThanksBody')}</Text>

              <TouchableOpacity onPress={handleClose} style={[styles.btn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.btnText, { color: colors.onPrimary }]}>{t('rateModalDone')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  content: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32 },
  closeBtn: { padding: 4, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 28 },
  starBtn: { padding: 4 },
  btn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  btnText: { fontSize: 14, fontWeight: '700' },
});
