import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { withAlpha } from '../../theme/tokens';
import { useLanguage } from '../../i18n/LanguageContext';
import { COLUMN_TYPES } from '../../constants/tableTemplates';
import { makeTagOptionId, nextTagColor } from '../../utils/tableUtils';

/**
 * Add-column flow: pick a name + type (+ tag options, if type is 'tag').
 * Edit-column flow (existing column passed in): rename only, plus tag
 * option management for tag columns — the type itself is locked once a
 * column has been created, since changing it could strand existing cell
 * data in a shape that no longer matches (a number in a date column, etc).
 */
export default function ColumnEditorSheet({ visible, column, onClose, onSave, onDelete }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const isEditing = !!column;

  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [tagOptions, setTagOptions] = useState([]);

  useEffect(() => {
    if (visible) {
      setName(column?.name || '');
      setType(column?.type || 'text');
      setTagOptions(column?.tagOptions || []);
    }
  }, [visible, column]);

  if (!visible) return null;

  const addTagOption = () => {
    setTagOptions((prev) => [...prev, { id: makeTagOptionId(), label: '', color: nextTagColor(prev) }]);
  };
  const updateTagOption = (id, label) => {
    setTagOptions((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)));
  };
  const removeTagOption = (id) => {
    setTagOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const cleanedTags = type === 'tag' ? tagOptions.filter((o) => o.label.trim()).map((o) => ({ ...o, label: o.label.trim() })) : undefined;
    onSave({ name: name.trim(), type, tagOptions: cleanedTags });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>
            {isEditing ? t('editColumnTitle') : t('addColumnTitle')}
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('columnNameLabel')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('columnNamePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('columnTypeLabel')}</Text>
          <View style={[styles.typeGrid, isRTL && { flexDirection: 'row-reverse' }]}>
            {COLUMN_TYPES.map((ct) => {
              const active = type === ct.id;
              return (
                <TouchableOpacity
                  key={ct.id}
                  disabled={isEditing}
                  onPress={() => { Haptics.selectionAsync(); setType(ct.id); }}
                  style={[
                    styles.typeChip,
                    { borderColor: colors.border, backgroundColor: active ? withAlpha(colors.primary, 0.16) : 'transparent' },
                    isEditing && !active && { opacity: 0.35 },
                  ]}
                >
                  <Ionicons name={ct.icon} size={14} color={active ? colors.primary : colors.textSecondary} />
                  <Text style={{ color: active ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
                    {t(ct.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {isEditing && <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('columnTypeLockedHint')}</Text>}

          {type === 'tag' && (
            <>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('tagOptionsLabel')}</Text>
              <ScrollView style={{ maxHeight: 220 }}>
                {tagOptions.map((opt) => (
                  <View key={opt.id} style={[styles.tagRow, isRTL && { flexDirection: 'row-reverse' }]}>
                    <View style={[styles.tagDot, { backgroundColor: opt.color }]} />
                    <TextInput
                      value={opt.label}
                      onChangeText={(v) => updateTagOption(opt.id, v)}
                      placeholder={t('tagOptionPlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                      style={[styles.tagInput, { color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                    />
                    <TouchableOpacity onPress={() => removeTagOption(opt.id)} hitSlop={6}>
                      <Ionicons name="close-circle" size={18} color={colors.textSecondary} style={{ opacity: 0.6 }} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={addTagOption} style={{ paddingVertical: 8 }}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('addTagOption')}</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.saveText, { color: colors.onPrimary }]}>{t('save')}</Text>
          </TouchableOpacity>

          {isEditing && !!onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.removeBtn}>
              <Text style={{ color: colors.danger, fontWeight: '600' }}>{t('deleteColumn')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  content: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  closeBtn: { alignSelf: 'flex-end', padding: 4, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 8, letterSpacing: 0.5 },
  hint: { fontSize: 11, marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tagDot: { width: 12, height: 12, borderRadius: 6 },
  tagInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 14 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 22 },
  saveText: { fontWeight: '700', fontSize: 15 },
  removeBtn: { alignItems: 'center', paddingVertical: 14 },
});
