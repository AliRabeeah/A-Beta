import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useTasks } from '../context/TaskContext';
import CalendarHeatmap from '../components/CalendarHeatmap';
import { getCurrentStreak, getBestStreak } from '../utils/streakUtils';

const PRIORITY_COLORS = { default: null, low: '#8E8E93', medium: '#FFD60A', high: '#FF453A' };

export default function TaskDetailScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { tasks, categories, toggleChecklistItem, toggleSingleTaskComplete, setRecurringTaskStatus } = useTasks();
  const task = tasks.find((tk) => tk.id === route.params.taskId);

  if (!task) return null;

  const category = categories.find((c) => c.id === task.categoryId);
  const isRecurring = task.taskType === 'recurring';
  const priorityColor = PRIORITY_COLORS[task.priority];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>{category?.icon} {task.title}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NewTask', { taskId: task.id })}>
          <Ionicons name="pencil" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.categoryPill, { backgroundColor: category?.color }]}>
          <Text style={{ color: '#000', fontWeight: '700', fontSize: 12 }}>{t(category?.labelKey)}</Text>
        </View>
        {priorityColor && (
          <View style={[styles.categoryPill, { backgroundColor: priorityColor }]}>
            <Text style={{ color: '#000', fontWeight: '700', fontSize: 12 }}>{t(`priority_${task.priority}`)}</Text>
          </View>
        )}
      </View>

      {isRecurring && (
        <View style={styles.statsRow}>
          <Stat label={t('current')} value={`${getCurrentStreak(task)}🔥`} colors={colors} />
          <Stat label={t('best')} value={getBestStreak(task)} colors={colors} />
        </View>
      )}

      {!isRecurring && (
        <TouchableOpacity
          onPress={() => toggleSingleTaskComplete(task.id)}
          style={[styles.completeBtn, { backgroundColor: task.completed ? colors.surfaceElevated : colors.primary }]}
        >
          <Ionicons name={task.completed ? 'refresh' : 'checkmark'} size={18} color={task.completed ? colors.text : colors.onPrimary} />
          <Text style={{ color: task.completed ? colors.text : colors.onPrimary, fontWeight: '700', marginLeft: 8 }}>
            {task.completed ? t('markNotDone') : t('markDone')}
          </Text>
        </TouchableOpacity>
      )}

      {task.checklist?.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('checklistItemsLabel')}</Text>
          {task.checklist.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => toggleChecklistItem(task.id, item.id)} style={styles.checklistRow}>
              <Ionicons name={item.done ? 'checkbox' : 'square-outline'} size={22} color={item.done ? (category?.color || colors.primary) : colors.textSecondary} />
              <Text style={{ color: colors.text, marginLeft: 10, fontSize: 15, textDecorationLine: item.done ? 'line-through' : 'none' }}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!!task.note && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('noteLabel')}</Text>
          <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{task.note}</Text>
        </View>
      )}

      {isRecurring && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
          <CalendarHeatmap
            habit={task}
            onDayPress={(date) => setRecurringTaskStatus(task.id, 'done', date)}
            onDayLongPress={(date) => setRecurringTaskStatus(task.id, 'skipped', date)}
          />
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, colors }) {
  return (
    <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', flexShrink: 1 },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  categoryPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 14, marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
});
