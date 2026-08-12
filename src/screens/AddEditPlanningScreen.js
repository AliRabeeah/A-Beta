import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useTokens, withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { usePlanning } from '../context/PlanningContext';
import { toKey } from '../utils/dateUtils';
import { pointsProgress, emptyPoint, daysUntilPointDue, isPointOverdue } from '../utils/planningUtils';

// Accent swatches for a plan's color dot / progress bar. Plain hex values
// (not palette ids) since PlanningCard just uses `item.color` directly.
const PLAN_ACCENT_COLORS = ['#6C8EF5', '#F5A26C', '#6CC7F5', '#8CE0A0', '#F58CC7', '#C9A6F5'];

export default function AddEditPlanningScreen({ navigation, route }) {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t, language, isRTL } = useLanguage();
  const { planningItems, addPlanningItem, updatePlanningItem, deletePlanningItem, addPoint, updatePoint, removePoint, reorderPoints } = usePlanning();
  const planningId = route.params?.planningId;
  const existing = planningItems.find((p) => p.id === planningId);
  const isEditing = !!existing;

  const [title, setTitle] = useState(existing?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [color, setColor] = useState(existing?.color || null);
  const [points, setPoints] = useState(existing?.points?.length ? existing.points : [emptyPoint()]);

  const [periodEnabled, setPeriodEnabled] = useState(!!(existing?.startDate || existing?.dueDate));
  const [startDate, setStartDate] = useState(existing?.startDate ? new Date(existing.startDate + 'T00:00:00') : new Date());
  const [dueDate, setDueDate] = useState(existing?.dueDate ? new Date(existing.dueDate + 'T00:00:00') : new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);

  const [reminderEnabled, setReminderEnabled] = useState(!!existing?.reminderAt);
  const [reminderDate, setReminderDate] = useState(existing?.reminderAt ? new Date(existing.reminderAt) : (() => { const d = new Date(); d.setHours(18, 0, 0, 0); return d; })());
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);

  const [pointDueEditorId, setPointDueEditorId] = useState(null);
  const pointInputRefs = useRef({});

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const textAlign = isRTL ? 'right' : 'left';
  const { done, total } = useMemo(() => pointsProgress({ points }), [points]);

  const updatePointField = useCallback((id, field, value) => {
    setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }, []);

  const addNewPoint = useCallback(() => {
    const point = emptyPoint();
    setPoints((prev) => [...prev, point]);
    requestAnimationFrame(() => pointInputRefs.current[point.id]?.focus());
  }, []);

  const removePointAt = useCallback((id) => {
    setPoints((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev.map((p) => (p.id === id ? { ...p, text: '' } : p))));
  }, []);

  const movePoint = useCallback((id, direction) => {
    setPoints((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const swapWith = idx + direction;
      if (idx === -1 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }, []);

  const togglePointDone = useCallback((id) => {
    Haptics.selectionAsync();
    setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, completed: !p.completed, completedAt: !p.completed ? new Date().toISOString() : null } : p)));
  }, []);

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert(t('pleaseEnterPlanName'));

    const cleanedPoints = points
      .filter((p) => p.text.trim())
      .map((p) => ({ ...p, text: p.text.trim() }));
    if (cleanedPoints.length === 0) return Alert.alert(t('pleaseAddPlanPoint'));

    const payload = {
      title: title.trim(),
      description: description.trim(),
      color,
      points: cleanedPoints,
      startDate: periodEnabled ? toKey(startDate) : null,
      dueDate: periodEnabled ? toKey(dueDate) : null,
      reminderAt: reminderEnabled ? reminderDate.toISOString() : null,
    };

    if (isEditing) await updatePlanningItem(existing.id, payload);
    else await addPlanningItem(payload);

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
      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('planNameLabel')}</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t('planNamePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, textAlign }]}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('planDescriptionLabel')}</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={t('planDescriptionPlaceholder')}
        placeholderTextColor={colors.textSecondary}
        multiline
        style={[styles.input, styles.descriptionInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, textAlign }]}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('planColorLabel')}</Text>
      <View style={[styles.colorRow, isRTL && { flexDirection: 'row-reverse' }]}>
        {PLAN_ACCENT_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => { Haptics.selectionAsync(); setColor(c); }}
            style={[styles.colorSwatch, { backgroundColor: c }, color === c && { borderWidth: 3, borderColor: colors.text }]}
          />
        ))}
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setColor(null); }}
          style={[styles.colorSwatch, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, !color && { borderWidth: 3, borderColor: colors.text }]}
        >
          <Ionicons name="close" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Optional overall period for the whole plan */}
      <View style={[styles.rowBetween, isRTL && { flexDirection: 'row-reverse' }]}>
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 0 }]}>{t('planPeriodLabel')}</Text>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setPeriodEnabled((v) => !v); }}
          style={[styles.pill, { backgroundColor: periodEnabled ? colors.primary : colors.surface, borderColor: colors.border }]}
        >
          <Text style={{ color: periodEnabled ? colors.onPrimary : colors.text, fontWeight: '600' }}>{periodEnabled ? t('on') : t('off')}</Text>
        </TouchableOpacity>
      </View>

      {periodEnabled && (
        <View style={[styles.dateRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <View style={styles.dateCol}>
            <Text style={[styles.sublabel, { color: colors.textSecondary }]}>{t('planStartDateLabel')}</Text>
            <TouchableOpacity onPress={() => setShowStartPicker(true)} style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text }}>{startDate.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                onChange={(event, selected) => { setShowStartPicker(false); if (selected) setStartDate(selected); }}
              />
            )}
          </View>
          <View style={styles.dateCol}>
            <Text style={[styles.sublabel, { color: colors.textSecondary }]}>{t('planDueDateLabel')}</Text>
            <TouchableOpacity onPress={() => setShowDuePicker(true)} style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text }}>{dueDate.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            </TouchableOpacity>
            {showDuePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                minimumDate={startDate}
                onChange={(event, selected) => { setShowDuePicker(false); if (selected) setDueDate(selected); }}
              />
            )}
          </View>
        </View>
      )}

      {/* Points: the actual outline -- freely write each thing you want to do */}
      <View style={[styles.rowBetween, isRTL && { flexDirection: 'row-reverse' }]}>
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 0 }]}>{t('planPointsLabel')}</Text>
        {total > 0 && (
          <Text style={[styles.sublabel, { color: colors.textSecondary, marginTop: 0, marginBottom: 0 }]}>
            {t('planPointsProgress', done, total)}
          </Text>
        )}
      </View>
      <Text style={[styles.helperText, { color: colors.textSecondary }]}>{t('planPointsHint')}</Text>

      {points.map((point, idx) => {
        const overdue = isPointOverdue(point);
        const remaining = daysUntilPointDue(point);
        return (
          <View key={point.id} style={[styles.pointBlock, { borderColor: colors.border }]}>
            <View style={[styles.pointRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity onPress={() => togglePointDone(point.id)} hitSlop={8}>
                <Ionicons
                  name={point.completed ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={point.completed ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
              <TextInput
                ref={(ref) => { pointInputRefs.current[point.id] = ref; }}
                value={point.text}
                onChangeText={(v) => updatePointField(point.id, 'text', v)}
                placeholder={t('planPointPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                multiline
                style={[
                  styles.pointInput,
                  {
                    color: colors.text,
                    textAlign,
                    textDecorationLine: point.completed ? 'line-through' : 'none',
                    opacity: point.completed ? 0.6 : 1,
                  },
                ]}
              />
              <View style={[styles.pointActions, isRTL && { flexDirection: 'row-reverse' }]}>
                <TouchableOpacity onPress={() => movePoint(point.id, -1)} disabled={idx === 0} hitSlop={6}>
                  <Ionicons name="chevron-up" size={16} color={idx === 0 ? withAlpha(colors.textSecondary, 0.35) : colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => movePoint(point.id, 1)} disabled={idx === points.length - 1} hitSlop={6}>
                  <Ionicons name="chevron-down" size={16} color={idx === points.length - 1 ? withAlpha(colors.textSecondary, 0.35) : colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removePointAt(point.id)} hitSlop={6}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.pointDueRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity
                onPress={() => setPointDueEditorId(pointDueEditorId === point.id ? null : point.id)}
                style={[styles.pointDueChip, { backgroundColor: withAlpha(colors.primary, point.dueDate ? 0.14 : 0.06) }]}
              >
                <Ionicons name="calendar-outline" size={11} color={point.dueDate ? colors.primary : colors.textSecondary} />
                <Text style={{ color: point.dueDate ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: '600' }}>
                  {point.dueDate
                    ? new Date(point.dueDate + 'T00:00:00').toLocaleDateString(locale, { month: 'short', day: 'numeric' })
                    : t('planPointNoDueDate')}
                </Text>
              </TouchableOpacity>
              {!!point.dueDate && overdue && !point.completed && (
                <Text style={[styles.overdueText, { color: colors.danger }]}>{t('planOverdueLabel', Math.abs(remaining))}</Text>
              )}
              {!!point.dueDate && (
                <TouchableOpacity onPress={() => updatePointField(point.id, 'dueDate', null)} hitSlop={6}>
                  <Ionicons name="close-circle" size={14} color={colors.textSecondary} style={{ opacity: 0.6 }} />
                </TouchableOpacity>
              )}
            </View>

            {pointDueEditorId === point.id && (
              <DateTimePicker
                value={point.dueDate ? new Date(point.dueDate + 'T00:00:00') : new Date()}
                mode="date"
                onChange={(event, selected) => {
                  setPointDueEditorId(null);
                  if (selected) updatePointField(point.id, 'dueDate', toKey(selected));
                }}
              />
            )}
          </View>
        );
      })}
      <TouchableOpacity onPress={addNewPoint} style={{ marginTop: 4, marginBottom: 12 }}>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('addPlanPoint')}</Text>
      </TouchableOpacity>

      {/* Reminder */}
      <View style={[styles.rowBetween, isRTL && { flexDirection: 'row-reverse' }]}>
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 0 }]}>{t('reminderButtonLabel')}</Text>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setReminderEnabled((v) => !v); }}
          style={[styles.pill, { backgroundColor: reminderEnabled ? colors.primary : colors.surface, borderColor: colors.border }]}
        >
          <Text style={{ color: reminderEnabled ? colors.onPrimary : colors.text, fontWeight: '600' }}>{reminderEnabled ? t('on') : t('off')}</Text>
        </TouchableOpacity>
      </View>
      {reminderEnabled && (
        <View style={[styles.dateRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <View style={styles.dateCol}>
            <TouchableOpacity onPress={() => setShowReminderDatePicker(true)} style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text }}>{reminderDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</Text>
            </TouchableOpacity>
            {showReminderDatePicker && (
              <DateTimePicker
                value={reminderDate}
                mode="date"
                minimumDate={new Date()}
                onChange={(event, selected) => { setShowReminderDatePicker(false); if (selected) { const d = new Date(reminderDate); d.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate()); setReminderDate(d); } }}
              />
            )}
          </View>
          <View style={styles.dateCol}>
            <TouchableOpacity onPress={() => setShowReminderTimePicker(true)} style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text }}>{reminderDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</Text>
            </TouchableOpacity>
            {showReminderTimePicker && (
              <DateTimePicker
                value={reminderDate}
                mode="time"
                is24Hour={false}
                onChange={(event, selected) => { setShowReminderTimePicker(false); if (selected) { const d = new Date(reminderDate); d.setHours(selected.getHours(), selected.getMinutes()); setReminderDate(d); } }}
              />
            )}
          </View>
        </View>
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
  label: { fontSize: 12, fontWeight: '700', marginTop: 18, marginBottom: 8, letterSpacing: 0.5 },
  sublabel: { fontSize: 11, fontWeight: '600', marginTop: -2, marginBottom: 6 },
  helperText: { fontSize: 12, marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, justifyContent: 'center' },
  descriptionInput: { minHeight: 70, textAlignVertical: 'top' },
  colorRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  colorSwatch: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  dateRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  dateCol: { flex: 1 },
  pointBlock: { borderWidth: 1, borderRadius: 14, padding: 10, marginBottom: 10 },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  pointInput: { flex: 1, fontSize: 15, lineHeight: 21, padding: 0, paddingTop: 2 },
  pointActions: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 },
  pointDueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginLeft: 28 },
  pointDueChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  overdueText: { fontSize: 11, fontWeight: '700' },
  saveBtn: { marginTop: 32, padding: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { fontWeight: '700', fontSize: 16 },
  deleteBtn: { marginTop: 16, padding: 14, alignItems: 'center' },
});
