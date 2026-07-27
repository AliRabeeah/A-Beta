import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useTasks } from '../context/TaskContext';
import TaskCard from '../components/TaskCard';
import AddOptionsSheet from '../components/AddOptionsSheet';
import { isDueOnDate } from '../utils/streakUtils';

export default function TasksScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { tasks, categories, toggleSingleTaskComplete, setRecurringTaskStatus, toggleChecklistItem, archiveTask, deleteTask } = useTasks();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('single'); // 'single' | 'recurring'
  const [addMenuVisible, setAddMenuVisible] = useState(false);

  const handleDelete = (task) => {
    Alert.alert(t('deleteTaskTitle'), t('deleteTaskBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteTask(task.id) },
    ]);
  };

  const singleTasks = useMemo(() => {
    return tasks
      .filter((t) => t.taskType === 'single' && !t.archived)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      });
  }, [tasks]);

  const recurringTasks = useMemo(() => tasks.filter((t) => t.taskType === 'recurring' && !t.archived), [tasks]);

  const list = tab === 'single' ? singleTasks : recurringTasks;
  const categoryFor = (t) => categories.find((c) => c.id === t.categoryId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>{t('tasksTitle')}</Text>
      </View>

      <View style={[styles.segment, { borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => setTab('single')} style={[styles.segmentBtn, tab === 'single' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}>
          <Text style={{ color: tab === 'single' ? colors.text : colors.textSecondary, fontWeight: '700' }}>{t('singleTasks')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('recurring')} style={[styles.segmentBtn, tab === 'recurring' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}>
          <Text style={{ color: tab === 'recurring' ? colors.text : colors.textSecondary, fontWeight: '700' }}>{t('recurringTasks')}</Text>
        </TouchableOpacity>
      </View>

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="clipboard-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noTasks')}</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
            {tab === 'single' ? t('noUpcomingTasks') : t('noRecurringTasks')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item, index }) => (
            <TaskCard
              task={item}
              category={categoryFor(item)}
              index={index}
              onToggleComplete={() =>
                item.taskType === 'single' ? toggleSingleTaskComplete(item.id) : setRecurringTaskStatus(item.id, 'done')
              }
              onSkip={() => setRecurringTaskStatus(item.id, 'skipped')}
              onArchive={() => archiveTask(item.id)}
              onDelete={() => handleDelete(item)}
              onToggleChecklistItem={(itemId) => toggleChecklistItem(item.id, itemId)}
              onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
            />
          )}
        />
      )}

      <TouchableOpacity
        onPress={() => setAddMenuVisible(true)}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="add" size={30} color={colors.onPrimary} />
      </TouchableOpacity>
      <AddOptionsSheet
        visible={addMenuVisible}
        onClose={() => setAddMenuVisible(false)}
        onSelectHabit={() => navigation.navigate('AddEditHabit')}
        onSelectRecurringTask={() => navigation.navigate('NewTask', { taskType: 'recurring' })}
        onSelectTask={() => navigation.navigate('NewTask', { taskType: 'single' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 30, fontWeight: '800' },
  segment: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 16 },
  segmentBtn: { marginRight: 24, paddingBottom: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});
