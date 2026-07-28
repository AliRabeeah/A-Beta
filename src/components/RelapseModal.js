import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

export default function RelapseModal({ visible, onClose, onConfirm }) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) setNote('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t('relapseReasonTitle')}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('relapseReasonPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, textAlign: language === 'ar' ? 'right' : 'left' },
            ]}
          />
          <View style={styles.row}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onConfirm(note.trim())}
              style={[styles.btn, { backgroundColor: colors.danger, borderColor: colors.danger }]}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{t('logRelapseButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 18, borderWidth: 1, padding: 20 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 70, textAlignVertical: 'top', fontSize: 14 },
  row: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
});
