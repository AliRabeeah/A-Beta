import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { withAlpha } from '../../theme/tokens';
import { useLanguage } from '../../i18n/LanguageContext';

export default function TagPickerSheet({ visible, options = [], value, onClose, onSelect }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.content, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t('pickTagValue')}</Text>

          {options.length === 0 && (
            <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 10 }}>
              {t('noTagOptionsYet')}
            </Text>
          )}

          {options.map((opt) => {
            const active = value === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => { Haptics.selectionAsync(); onSelect(opt.id); }}
                style={[styles.row, isRTL && { flexDirection: 'row-reverse' }, active && { backgroundColor: withAlpha(opt.color, 0.14) }]}
              >
                <View style={[styles.dot, { backgroundColor: opt.color }]} />
                <Text style={[styles.label, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{opt.label}</Text>
                {active && <Ionicons name="checkmark" size={18} color={opt.color} />}
              </TouchableOpacity>
            );
          })}

          {!!value && (
            <TouchableOpacity onPress={() => onSelect(null)} style={[styles.row, isRTL && { flexDirection: 'row-reverse' }]}>
              <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.label, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{t('clearTagValue')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  content: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderRadius: 10, paddingHorizontal: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
});
