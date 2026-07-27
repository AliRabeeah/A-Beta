import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useTasks, PRIORITIES } from '../context/TaskContext';
import { toKey } from '../utils/dateUtils';

let itemIdCounter = 0;
function newItemId() {
  itemIdCounter += 1;
  return `ti_${Date.now()}_${itemIdCounter}`;
}

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const PRIORITY_COLORS = { default: null, low: '#8E8E93', medium: '#FFD60A', high: '#FF453A' };

function Row({ icon, label, value, valueColor, onPress, colors, children }) {
  return (
    <View>
      <TouchableOpacity onPress={onPress} style={styles.row} disabled={!onPress}>
        <View style={styles.rowLeft}>
          <Ionicons name={icon} size={20} color={colors.textSecondary} />
          <Text style={{ color: colors.text, marginLeft: 14, fontSize: 15 }}>{label}</Text>
        </View>
        {value !== undefined && (
          <Text style={{ color: valueColor || colors.primary, fontWeight: '700' }}>{value}</Text>
        )}
      </TouchableOpacity>
      {children}
    </View>
  );
}

export default function NewTaskScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const { tasks, categories, addTask, updateTask, deleteTask } = useTasks();
  const taskId = route.params?.taskId;
  const existing = tasks.find((tk) => tk.id === taskId);
  const initialType = existing?.taskType || route.params?.taskType || 'single';

  const [title, setTitle] = useState(existing?.title || '');
  const [taskType] = useState(initialType); // fixed once entering the form
  const [categoryId, setCategoryId] = useState(existing?.categoryId || categories[0].id);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [dueDate, setDueDate] = useState(() => (existing?.dueDate ? new Date(existing.dueDate + 'T00:00:00') : new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [frequency, setFrequency] = useState(existing?.frequency || 'daily');
  const [specificDays, setSpecificDays] = useState(existing?.specificDays || [1, 2, 3, 4, 5]);

  const [reminders, setReminders] = useState(existing?.reminders || []);
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  const [checklist, setChecklist] = useState(existing?.checklist || []);
  const [showChecklist, setShowChecklist] = useState(false);

  const [priority, setPriority] = useState(existing?.priority || 'default');
  const [note, setNote] = useState(existing?.note || '');
  const [isPending, setIsPending] = useState(existing?.isPending ?? true);

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const weekdayLabels = t('weekdayShort');
  const category = categories.find((c) => c.id === categoryId);

  const addReminder = (time) => {
    const str = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
    setReminders((prev) => [...prev, str]);
  };
  const removeReminder = (idx) => setReminders((prev) => prev.filter((_, i) => i !== idx));

  const addChecklistItem = () => setChecklist((prev) => [...prev, { id: newItemId(), name: '', done: false }]);
  const updateChecklistItem = (id, name) => setChecklist((prev) => prev.map((it) => (it.id === id ? { ...it, name } : it)));
  const removeChecklistItem = (id) => setChecklist((prev) => prev.filter((it) => it.id !== id));

  const cyclePriority = () => {
    const idx = PRIORITIES.indexOf(priority);
    setPriority(PRIORITIES[(idx + 1) % PRIORITIES.length]);
  };

  const toggleDay = (v) => {
    setSpecificDays((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v].sort()));
  };

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert(t('pleaseEnterTaskTitle'));

    const payload = {
      title: title.trim(),
      taskType,
      categoryId,
      reminders,
      checklist: checklist.filter((it) => it.name.trim()),
      priority,
      note: note.trim(),
      ...(taskType === 'single'
        ? { dueDate: toKey(dueDate), isPending }
        : { frequency, specificDays }),
    };

    if (existing) await updateTask(existing.id, payload);
    else await addTask(payload);

    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert(t('deleteTaskTitle'), t('deleteTaskBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => { await deleteTask(existing.id); navigation.goBack(); } },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.formTitle, { color: colors.text }]}>{existing ? t('editTask') : t('newTask')}</Text>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t('taskLabel')}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text, borderColor: colors.primary, backgroundColor: colors.surface, textAlign: language === 'ar' ? 'right' : 'left' }]}
      />

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Row
          icon="apps-outline"
          label={t('categoryLabel')}
          value={`${category?.icon || ''} ${t(category?.labelKey)}`}
          valueColor={category?.color}
          onPress={() => setShowCategoryPicker((v) => !v)}
          colors={colors}
        >
          {showCategoryPicker && (
            <View style={styles.pickerWrap}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => { setCategoryId(cat.id); setShowCategoryPicker(false); }}
                  style={[styles.pill, { backgroundColor: categoryId === cat.id ? cat.color : colors.surfaceElevated, borderColor: colors.border }]}
                >
                  <Text style={{ color: categoryId === cat.id ? '#000' : colors.text, fontWeight: '600', fontSize: 13 }}>
                    {cat.icon} {t(cat.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Row>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {taskType === 'single' ? (
          <Row
            icon="calendar-outline"
            label={t('dateLabel')}
            value={toKey(dueDate) === toKey(new Date()) ? t('today') : dueDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
            onPress={() => setShowDatePicker(true)}
            colors={colors}
          >
            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                onChange={(e, selected) => { setShowDatePicker(false); if (selected) setDueDate(selected); }}
              />
            )}
          </Row>
        ) : (
          <Row icon="repeat-outline" label={t('frequencyLabel')} colors={colors}>
            <View style={styles.pickerWrap}>
              {[{ v: 'daily', l: t('freqDaily') }, { v: 'specific_days', l: t('freqSpecific') }].map((f) => (
                <TouchableOpacity key={f.v} onPress={() => setFrequency(f.v)} style={[styles.pill, { backgroundColor: frequency === f.v ? colors.primary : colors.surfaceElevated, borderColor: colors.border }]}>
                  <Text style={{ color: frequency === f.v ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 13 }}>{f.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {frequency === 'specific_days' && (
              <View style={[styles.pickerWrap, { marginTop: 8 }]}>
                {WEEKDAYS.map((v) => (
                  <TouchableOpacity key={v} onPress={() => toggleDay(v)} style={[styles.dayChip, { backgroundColor: specificDays.includes(v) ? colors.primary : colors.surfaceElevated, borderColor: colors.border }]}>
                    <Text style={{ color: specificDays.includes(v) ? colors.onPrimary : colors.text, fontWeight: '700' }}>{weekdayLabels[v]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Row>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Row
          icon="notifications-outline"
          label={t('timeAndReminders')}
          value={String(reminders.length)}
          onPress={() => setShowReminderPicker(true)}
          colors={colors}
        >
          {reminders.length > 0 && (
            <View style={{ paddingBottom: 10 }}>
              {reminders.map((r, idx) => (
                <View key={idx} style={styles.reminderRow}>
                  <Text style={{ color: colors.text }}>{r}</Text>
                  <TouchableOpacity onPress={() => removeReminder(idx)}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          {showReminderPicker && (
            <DateTimePicker
              value={new Date()}
              mode="time"
              onChange={(e, selected) => { setShowReminderPicker(false); if (selected) addReminder(selected); }}
            />
          )}
        </Row>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Row
          icon="checkbox-outline"
          label={t('checklistItemsLabel')}
          value={String(checklist.length)}
          onPress={() => setShowChecklist((v) => !v)}
          colors={colors}
        >
          {showChecklist && (
            <View style={{ paddingBottom: 12 }}>
              {checklist.map((item) => (
                <View key={item.id} style={styles.checklistRow}>
                  <TextInput
                    value={item.name}
                    onChangeText={(val) => updateChecklistItem(item.id, val)}
                    placeholder={t('itemNamePlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.smallInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                  />
                  <TouchableOpacity onPress={() => removeChecklistItem(item.id)} style={{ padding: 8 }}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={addChecklistItem}>
                <Text style={{ color: colors.primary, fontWeight: '600', marginTop: 4 }}>{t('addItem')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Row>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Row
          icon="flag-outline"
          label={t('priorityLabel')}
          value={t(`priority_${priority}`)}
          valueColor={PRIORITY_COLORS[priority]}
          onPress={cyclePriority}
          colors={colors}
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.noteBlock}>
          <View style={styles.rowLeft}>
            <Ionicons name="chatbox-ellipses-outline" size={20} color={colors.textSecondary} />
            <Text style={{ color: colors.text, marginLeft: 14, fontSize: 15 }}>{t('noteLabel')}</Text>
          </View>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('noteOptionalPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
            style={[styles.noteInput, { color: colors.text, textAlign: language === 'ar' ? 'right' : 'left' }]}
          />
        </View>

        {taskType === 'single' && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity onPress={() => setIsPending((v) => !v)} style={styles.pendingRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('pendingTaskLabel')}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>{t('pendingTaskHint')}</Text>
              </View>
              <Ionicons
                name={isPending ? 'checkmark-circle' : 'ellipse-outline'}
                size={26}
                color={isPending ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.footerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.footerBtn}>
          <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 15 }}>{t('cancel').toUpperCase()}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} style={styles.footerBtn}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>{t('confirm').toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {existing && (
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>{t('deleteTask')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60 },
  formTitle: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 20 },
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: 1, marginHorizontal: 16 },
  pickerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  dayChip: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  reminderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  smallInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 14 },
  noteBlock: { padding: 16 },
  noteInput: { marginTop: 10, minHeight: 60, fontSize: 14 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, paddingHorizontal: 10 },
  footerBtn: { padding: 10 },
  deleteBtn: { marginTop: 20, alignItems: 'center' },
});
