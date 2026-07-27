import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';

/**
 * Bottom-sheet modal to pick a date + time for a note reminder.
 * UI-only concerns live here; actual scheduling happens in NoteContext
 * via the Notifications API (this component just returns a JS Date).
 */
export default function NoteReminderModal({ visible, initialDate, hasReminder, onClose, onSave, onRemove }) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  const [draftDate, setDraftDate] = useState(initialDate || new Date(Date.now() + 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraftDate(initialDate || new Date(Date.now() + 60 * 60 * 1000));
    }
  }, [visible, initialDate]);

  if (!visible) return null;

  const handleDateChange = (event, selected) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) {
      const next = new Date(draftDate);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setDraftDate(next);
    }
  };

  const handleTimeChange = (event, selected) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selected) {
      const next = new Date(draftDate);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setDraftDate(next);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.content, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>{`\ud83d\udd14 ${t('reminderButtonLabel')}`}</Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('reminderDateLabel')}</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={[styles.fieldBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
          >
            <Text style={{ color: colors.text }}>
              {draftDate.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('reminderTimeLabel')}</Text>
          <TouchableOpacity
            onPress={() => setShowTimePicker(true)}
            style={[styles.fieldBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
          >
            <Text style={{ color: colors.text }}>
              {draftDate.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker value={draftDate} mode="date" onChange={handleDateChange} minimumDate={new Date()} />
          )}
          {showTimePicker && (
            <DateTimePicker value={draftDate} mode="time" is24Hour={false} onChange={handleTimeChange} />
          )}

          <TouchableOpacity
            onPress={() => onSave(draftDate)}
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.saveText, { color: colors.onPrimary }]}>{t('saveReminder')}</Text>
          </TouchableOpacity>

          {hasReminder && (
            <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
              <Text style={{ color: colors.danger, fontWeight: '600' }}>{t('removeReminder')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  closeBtn: { alignSelf: 'flex-end', padding: 4, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 8, letterSpacing: 0.5 },
  fieldBtn: { borderRadius: 12, borderWidth: 1, padding: 12 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 22 },
  saveText: { fontWeight: '700', fontSize: 15 },
  removeBtn: { alignItems: 'center', paddingVertical: 14 },
});
