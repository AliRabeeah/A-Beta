import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useTokens } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { usePlanning } from '../context/PlanningContext';
import { toKey } from '../utils/dateUtils';

let subjectIdCounter = 0;
function newSubjectId() {
  subjectIdCounter += 1;
  return `sub_${Date.now()}_${subjectIdCounter}`;
}

function emptyDailySubject() {
  return { id: newSubjectId(), name: '', quantityLabel: '' };
}
function emptyExtendedSubject() {
  return { id: newSubjectId(), name: '', perDay: '', days: '' };
}

export default function AddEditPlanningScreen({ navigation, route }) {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t, language } = useLanguage();
  const { planningItems, addPlanningItem, updatePlanningItem, deletePlanningItem } = usePlanning();
  const planningId = route.params?.planningId;
  const existing = planningItems.find((p) => p.id === planningId);

  const [type, setType] = useState(existing?.type || 'daily');
  const [title, setTitle] = useState(existing?.title || '');

  // Daily goal fields
  const [dailySubjects, setDailySubjects] = useState(
    existing?.type === 'daily' && existing.subjects?.length ? existing.subjects : [emptyDailySubject()]
  );
  const [reminderEnabled, setReminderEnabled] = useState(!!existing?.reminderTime);
  const [reminderDate, setReminderDate] = useState(() => {
    const d = new Date();
    if (existing?.reminderTime) {
      const [h, m] = existing.reminderTime.split(':');
      d.setHours(Number(h), Number(m));
    } else {
      d.setHours(18, 0);
    }
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);

  // Extended plan fields
  const [extendedSubjects, setExtendedSubjects] = useState(
    existing?.type === 'extended' && existing.subjects?.length ? existing.subjects : [emptyExtendedSubject()]
  );

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const isEditing = !!existing;

  const updateDailySubject = (id, field, value) => {
    setDailySubjects((items) => items.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };
  const removeDailySubject = (id) => {
    setDailySubjects((items) => (items.length > 1 ? items.filter((it) => it.id !== id) : items));
  };
  const addDailySubject = () => setDailySubjects((items) => [...items, emptyDailySubject()]);

  const updateExtendedSubject = (id, field, value) => {
    setExtendedSubjects((items) => items.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };
  const removeExtendedSubject = (id) => {
    setExtendedSubjects((items) => (items.length > 1 ? items.filter((it) => it.id !== id) : items));
  };
  const addExtendedSubject = () => setExtendedSubjects((items) => [...items, emptyExtendedSubject()]);

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert(t('pleaseEnterPlanName'));

    if (type === 'daily') {
      const subjects = dailySubjects
        .filter((s) => s.name.trim() || s.quantityLabel.trim())
        .map((s) => ({ id: s.id, name: s.name.trim(), quantityLabel: s.quantityLabel.trim() }));
      if (subjects.length === 0) return Alert.alert(t('pleaseAddSubject'));

      const reminderTime = reminderEnabled
        ? `${String(reminderDate.getHours()).padStart(2, '0')}:${String(reminderDate.getMinutes()).padStart(2, '0')}`
        : null;

      const payload = { type: 'daily', title: title.trim(), subjects, reminderTime };
      if (isEditing) await updatePlanningItem(existing.id, payload);
      else await addPlanningItem({ ...payload, createdDate: toKey(new Date()) });
    } else {
      const subjects = extendedSubjects
        .filter((s) => s.name.trim() && Number(s.days) > 0)
        .map((s) => ({ id: s.id, name: s.name.trim(), perDay: s.perDay.trim(), days: Number(s.days) || 0 }));
      if (subjects.length === 0) return Alert.alert(t('pleaseAddSubject'));

      const payload = {
        type: 'extended',
        title: title.trim(),
        subjects,
        startDate: existing?.startDate || toKey(new Date()),
      };
      if (isEditing) await updatePlanningItem(existing.id, payload);
      else await addPlanningItem(payload);
    }

    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert(t('deletePlanConfirmTitle'), t('deletePlanConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => { await deletePlanningItem(existing.id); navigation.goBack(); } },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      {!isEditing && (
        <View style={[styles.segment, tokens.glass.card, { borderRadius: tokens.radius.interactive }]}>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setType('daily'); }}
            style={[styles.segmentBtn, { borderRadius: tokens.radius.interactive }, type === 'daily' && { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: type === 'daily' ? colors.onPrimary : colors.textSecondary, fontWeight: '700' }}>
              {t('planningTypeDaily')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setType('extended'); }}
            style={[styles.segmentBtn, { borderRadius: tokens.radius.interactive }, type === 'extended' && { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: type === 'extended' ? colors.onPrimary : colors.textSecondary, fontWeight: '700' }}>
              {t('planningTypeExtended')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('planNameLabel')}</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t('planNamePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, textAlign: language === 'ar' ? 'right' : 'left' }]}
      />

      {type === 'daily' ? (
        <>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>{t('dailyPlanHint')}</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('subjectsLabel')}</Text>
          {dailySubjects.map((s) => (
            <View key={s.id} style={[styles.subjectBlock, { borderColor: colors.border }]}>
              <View style={styles.subjectRow}>
                <TextInput
                  value={s.name}
                  onChangeText={(v) => updateDailySubject(s.id, 'name', v)}
                  placeholder={t('subjectNamePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                />
                {dailySubjects.length > 1 && (
                  <TouchableOpacity onPress={() => removeDailySubject(s.id)} style={styles.trashBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                value={s.quantityLabel}
                onChangeText={(v) => updateDailySubject(s.id, 'quantityLabel', v)}
                placeholder={t('quantityPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { marginTop: 8, color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, textAlign: language === 'ar' ? 'right' : 'left' }]}
              />
            </View>
          ))}
          <TouchableOpacity onPress={addDailySubject} style={{ marginTop: 4, marginBottom: 12 }}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('addAnotherSubject')}</Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('planReminderLabel')}</Text>
          <TouchableOpacity onPress={() => setReminderEnabled((v) => !v)} style={[styles.pill, { backgroundColor: reminderEnabled ? colors.primary : colors.surface, borderColor: colors.border, alignSelf: 'flex-start' }]}>
            <Text style={{ color: reminderEnabled ? colors.onPrimary : colors.text, fontWeight: '600' }}>{reminderEnabled ? t('on') : t('off')}</Text>
          </TouchableOpacity>
          {reminderEnabled && (
            <>
              <TouchableOpacity onPress={() => setShowPicker(true)} style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, marginTop: 10 }]}>
                <Text style={{ color: colors.text }}>{reminderDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</Text>
              </TouchableOpacity>
              {showPicker && (
                <DateTimePicker
                  value={reminderDate}
                  mode="time"
                  is24Hour={false}
                  onChange={(event, selected) => { setShowPicker(false); if (selected) setReminderDate(selected); }}
                />
              )}
            </>
          )}
        </>
      ) : (
        <>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>{t('extendedPlanHint')}</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('subjectsLabel')}</Text>
          <Text style={[styles.sublabel, { color: colors.textSecondary }]}>{t('subjectDurationHint')}</Text>
          {extendedSubjects.map((s) => (
            <View key={s.id} style={[styles.subjectBlock, { borderColor: colors.border }]}>
              <View style={styles.subjectRow}>
                <TextInput
                  value={s.name}
                  onChangeText={(v) => updateExtendedSubject(s.id, 'name', v)}
                  placeholder={t('subjectNamePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                />
                {extendedSubjects.length > 1 && (
                  <TouchableOpacity onPress={() => removeExtendedSubject(s.id)} style={styles.trashBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.numericRow}>
                <TextInput
                  value={s.perDay}
                  onChangeText={(v) => updateExtendedSubject(s.id, 'perDay', v)}
                  placeholder={t('perDayPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                />
                <TextInput
                  value={String(s.days)}
                  onChangeText={(v) => updateExtendedSubject(s.id, 'days', v.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder={t('subjectDaysPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                />
              </View>
            </View>
          ))}
          <TouchableOpacity onPress={addExtendedSubject} style={{ marginTop: 4, marginBottom: 12 }}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('addAnotherSubject')}</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
        <Text style={[styles.saveText, { color: colors.onPrimary }]}>{isEditing ? t('savePlan') : t('createPlan')}</Text>
      </TouchableOpacity>

      {isEditing && (
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>{t('deletePlan')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60 },
  segment: { flexDirection: 'row', overflow: 'hidden', marginBottom: 20 },
  segmentBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '700', marginTop: 18, marginBottom: 8, letterSpacing: 0.5 },
  sublabel: { fontSize: 12, fontWeight: '600', marginTop: -2, marginBottom: 10 },
  helperText: { fontSize: 12, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, justifyContent: 'center' },
  subjectBlock: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trashBtn: { padding: 8 },
  numericRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  numericInput: { flex: 1 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  saveBtn: { marginTop: 32, padding: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { fontWeight: '700', fontSize: 16 },
  deleteBtn: { marginTop: 16, padding: 14, alignItems: 'center' },
});
