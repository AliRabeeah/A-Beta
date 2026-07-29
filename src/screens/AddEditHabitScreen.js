import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits, CATEGORIES } from '../context/HabitContext';

const ICONS = ['💧', '🏃', '📚', '🧘', '🥗', '😴', '✍️', '💪', '🚭', '🎯', '🧹', '🎨'];
const COLORS = ['#FF8A00', '#00E676', '#0A84FF', '#BF5AF2', '#FF453A', '#FFD60A', '#64D2FF', '#FF375F'];
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const EVAL_TYPES = ['yesno', 'numeric', 'timer', 'checklist'];
const COMPARATORS = ['atleast', 'lessthan', 'any'];

let checklistIdCounter = 0;
function newChecklistId() {
  checklistIdCounter += 1;
  return `ci_${Date.now()}_${checklistIdCounter}`;
}

export default function AddEditHabitScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const { habits, addHabit, updateHabit, deleteHabit } = useHabits();
  const habitId = route.params?.habitId;
  const existing = habits.find((h) => h.id === habitId);

  const [name, setName] = useState(existing?.name || '');
  const [icon, setIcon] = useState(existing?.icon || ICONS[0]);
  const [color, setColor] = useState(existing?.color || COLORS[0]);
  const [categoryId, setCategoryId] = useState(existing?.categoryId || CATEGORIES[0].id);
  const [frequency, setFrequency] = useState(existing?.frequency || 'daily');
  const [specificDays, setSpecificDays] = useState(existing?.specificDays || [1, 2, 3, 4, 5]);
  const [reminderEnabled, setReminderEnabled] = useState(!!existing?.reminderTime);
  const [reminderDate, setReminderDate] = useState(() => {
    const d = new Date();
    if (existing?.reminderTime) {
      const [h, m] = existing.reminderTime.split(':');
      d.setHours(Number(h), Number(m));
    } else {
      d.setHours(9, 0);
    }
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);

  // --- Evaluation type + type-specific fields ---
  const [evaluationType, setEvaluationType] = useState(existing?.evaluationType || 'yesno');
  const [numericGoal, setNumericGoal] = useState(String(existing?.numericGoal ?? 8));
  const [numericUnit, setNumericUnit] = useState(existing?.numericUnit || '');
  const [numericComparator, setNumericComparator] = useState(existing?.numericComparator || 'atleast');
  const [timerGoalMinutes, setTimerGoalMinutes] = useState(String(existing?.timerGoalMinutes ?? 30));
  const [timerComparator, setTimerComparator] = useState(existing?.timerComparator || 'atleast');
  const [checklistItems, setChecklistItems] = useState(
    existing?.checklistItems?.length ? existing.checklistItems : [{ id: newChecklistId(), name: '' }, { id: newChecklistId(), name: '' }]
  );
  const [checklistSuccessCondition, setChecklistSuccessCondition] = useState(existing?.checklistSuccessCondition || 'all');
  const [checklistRequiredIds, setChecklistRequiredIds] = useState(existing?.checklistRequiredIds || []);

  const weekdayLabels = t('weekdayShort');
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  const toggleDay = (v) => {
    setSpecificDays((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v].sort()));
  };

  const updateChecklistItemName = (id, newName) => {
    setChecklistItems((items) => items.map((it) => (it.id === id ? { ...it, name: newName } : it)));
  };

  const removeChecklistItem = (id) => {
    setChecklistItems((items) => items.filter((it) => it.id !== id));
    setChecklistRequiredIds((ids) => ids.filter((x) => x !== id));
  };

  const addChecklistItem = () => {
    setChecklistItems((items) => [...items, { id: newChecklistId(), name: '' }]);
  };

  const toggleRequiredItem = (id) => {
    setChecklistRequiredIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert(t('pleaseEnterName'));

    if (evaluationType === 'checklist' && checklistItems.filter((it) => it.name.trim()).length === 0) {
      return Alert.alert(t('pleaseAddChecklistItem'));
    }

    const reminderTime = reminderEnabled
      ? `${String(reminderDate.getHours()).padStart(2, '0')}:${String(reminderDate.getMinutes()).padStart(2, '0')}`
      : null;

    const payload = {
      name: name.trim(),
      icon,
      color,
      categoryId,
      frequency,
      specificDays,
      reminderTime,
      evaluationType,
      numericGoal: Number(numericGoal) || 0,
      numericUnit: numericUnit.trim(),
      numericComparator,
      timerGoalMinutes: Number(timerGoalMinutes) || 0,
      timerComparator,
      checklistItems: checklistItems.filter((it) => it.name.trim()).map((it) => ({ id: it.id, name: it.name.trim() })),
      checklistSuccessCondition,
      checklistRequiredIds,
    };

    if (existing) await updateHabit(existing.id, payload);
    else await addHabit(payload);

    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert(t('deleteConfirmTitle'), t('deleteConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => { await deleteHabit(existing.id); navigation.goBack(); } },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('nameLabel')}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('namePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, textAlign: language === 'ar' ? 'right' : 'left' }]}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('iconLabel')}</Text>
      <View style={styles.rowWrap}>
        {ICONS.map((ic) => (
          <TouchableOpacity key={ic} onPress={() => setIcon(ic)} style={[styles.iconChip, { backgroundColor: colors.surface, borderColor: icon === ic ? color : colors.border }]}>
            <Text style={{ fontSize: 20 }}>{ic}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('colorLabel')}</Text>
      <View style={styles.rowWrap}>
        {COLORS.map((c) => (
          <TouchableOpacity key={c} onPress={() => setColor(c)} style={[styles.colorChip, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: colors.text }]} />
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('categoryLabel')}</Text>
      <View style={styles.rowWrap}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat.id} onPress={() => setCategoryId(cat.id)} style={[styles.pill, { backgroundColor: categoryId === cat.id ? cat.color : colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: categoryId === cat.id ? '#000' : colors.text, fontWeight: '600', fontSize: 13 }}>{t(cat.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* --- Evaluation type --- */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('evaluationTypeLabel')}</Text>
      <View style={styles.rowWrap}>
        {EVAL_TYPES.map((typeVal) => (
          <TouchableOpacity
            key={typeVal}
            onPress={() => setEvaluationType(typeVal)}
            style={[styles.pill, { backgroundColor: evaluationType === typeVal ? colors.primary : colors.surface, borderColor: colors.border }]}
          >
            <Text style={{ color: evaluationType === typeVal ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 13 }}>
              {t(`evalType_${typeVal}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.helperText, { color: colors.textSecondary }]}>{t(`evalTypeDesc_${evaluationType}`)}</Text>

      {evaluationType === 'numeric' && (
        <View style={styles.typeConfigBlock}>
          <View style={styles.rowWrap}>
            {COMPARATORS.map((c) => (
              <TouchableOpacity key={c} onPress={() => setNumericComparator(c)} style={[styles.pill, { backgroundColor: numericComparator === c ? color : colors.surface, borderColor: colors.border }]}>
                <Text style={{ color: numericComparator === c ? '#000' : colors.text, fontWeight: '600', fontSize: 13 }}>{t(`comparator_${c}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.numericRow}>
            <TextInput
              value={numericGoal}
              onChangeText={setNumericGoal}
              keyboardType="numeric"
              placeholder={t('goalLabel')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            />
            <TextInput
              value={numericUnit}
              onChangeText={setNumericUnit}
              placeholder={t('unitOptionalLabel')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            />
          </View>
        </View>
      )}

      {evaluationType === 'timer' && (
        <View style={styles.typeConfigBlock}>
          <View style={styles.rowWrap}>
            {COMPARATORS.map((c) => (
              <TouchableOpacity key={c} onPress={() => setTimerComparator(c)} style={[styles.pill, { backgroundColor: timerComparator === c ? color : colors.surface, borderColor: colors.border }]}>
                <Text style={{ color: timerComparator === c ? '#000' : colors.text, fontWeight: '600', fontSize: 13 }}>{t(`comparator_${c}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={timerGoalMinutes}
            onChangeText={setTimerGoalMinutes}
            keyboardType="numeric"
            placeholder={t('goalMinutesLabel')}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          />
        </View>
      )}

      {evaluationType === 'checklist' && (
        <View style={styles.typeConfigBlock}>
          <Text style={[styles.sublabel, { color: colors.textSecondary }]}>{t('checklistItemsLabel')}</Text>
          {checklistItems.map((item) => (
            <View key={item.id} style={styles.checklistRow}>
              <TextInput
                value={item.name}
                onChangeText={(val) => updateChecklistItemName(item.id, val)}
                placeholder={t('itemNamePlaceholder')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              />
              <TouchableOpacity onPress={() => removeChecklistItem(item.id)} style={styles.trashBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={addChecklistItem} style={{ marginTop: 4, marginBottom: 12 }}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('addItem')}</Text>
          </TouchableOpacity>

          <Text style={[styles.sublabel, { color: colors.textSecondary }]}>{t('successConditionLabel')}</Text>
          <View style={styles.rowWrap}>
            {['all', 'custom'].map((cond) => (
              <TouchableOpacity key={cond} onPress={() => setChecklistSuccessCondition(cond)} style={[styles.pill, { backgroundColor: checklistSuccessCondition === cond ? color : colors.surface, borderColor: colors.border }]}>
                <Text style={{ color: checklistSuccessCondition === cond ? '#000' : colors.text, fontWeight: '600', fontSize: 13 }}>{t(`successCondition_${cond}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {checklistSuccessCondition === 'custom' && (
            <View style={{ marginTop: 10 }}>
              {checklistItems.filter((it) => it.name.trim()).map((item) => (
                <TouchableOpacity key={item.id} onPress={() => toggleRequiredItem(item.id)} style={styles.requiredRow}>
                  <Ionicons
                    name={checklistRequiredIds.includes(item.id) ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={checklistRequiredIds.includes(item.id) ? color : colors.textSecondary}
                  />
                  <Text style={{ color: colors.text, marginLeft: 10 }}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('frequencyLabel')}</Text>
      <View style={styles.rowWrap}>
        {[{ v: 'daily', l: t('freqDaily') }, { v: 'specific_days', l: t('freqSpecific') }, { v: 'weekly', l: t('freqWeekly') }].map((f) => (
          <TouchableOpacity key={f.v} onPress={() => setFrequency(f.v)} style={[styles.pill, { backgroundColor: frequency === f.v ? colors.primary : colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: frequency === f.v ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 13 }}>{f.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {frequency === 'specific_days' && (
        <View style={[styles.rowWrap, { marginTop: 4 }]}>
          {WEEKDAYS.map((v) => (
            <TouchableOpacity key={v} onPress={() => toggleDay(v)} style={[styles.dayChip, { backgroundColor: specificDays.includes(v) ? color : colors.surface, borderColor: colors.border }]}>
              <Text style={{ color: specificDays.includes(v) ? '#000' : colors.text, fontWeight: '700' }}>{weekdayLabels[v]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('reminderLabel')}</Text>
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

      <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
        <Text style={[styles.saveText, { color: colors.onPrimary }]}>{existing ? t('saveChanges') : t('createHabit')}</Text>
      </TouchableOpacity>

      {existing && (
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>{t('deleteHabit')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 12, fontWeight: '700', marginTop: 18, marginBottom: 8, letterSpacing: 0.5 },
  sublabel: { fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 8 },
  helperText: { fontSize: 12, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, justifyContent: 'center' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconChip: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  colorChip: { width: 36, height: 36, borderRadius: 18 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  dayChip: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  saveBtn: { marginTop: 32, padding: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { fontWeight: '700', fontSize: 16 },
  deleteBtn: { marginTop: 16, padding: 14, alignItems: 'center' },
  typeConfigBlock: { marginTop: 14 },
  numericRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  numericInput: { flex: 1 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  trashBtn: { padding: 8 },
  requiredRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
});
