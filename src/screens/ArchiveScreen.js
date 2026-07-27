import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import { useTasks } from '../context/TaskContext';

export default function ArchiveScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { habits, unarchiveHabit, deleteHabitPermanently } = useHabits();
  const { tasks, categories, unarchiveTask, deleteTask } = useTasks();

  useEffect(() => {
    navigation.setOptions({ title: t('archivedHabitsTitle') });
  }, [navigation, t]);

  const archivedHabits = habits.filter((h) => h.archived);
  const archivedTasks = tasks.filter((tk) => tk.archived);
  const categoryFor = (tk) => categories.find((c) => c.id === tk.categoryId);

  const handleDeleteHabit = (habit) => {
    Alert.alert(t('deletePermanentTitle'), t('deletePermanentBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteHabitPermanently(habit.id) },
    ]);
  };

  const handleDeleteTask = (task) => {
    Alert.alert(t('deletePermanentTitle'), t('deletePermanentBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteTask(task.id) },
    ]);
  };

  const isEmpty = archivedHabits.length === 0 && archivedTasks.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isEmpty ? (
        <View style={styles.empty}>
          <Ionicons name="archive-outline" size={36} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 10 }}>{t('noArchivedHabits')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {archivedHabits.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('habitsTitle')}</Text>
              {archivedHabits.map((item) => (
                <View key={item.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {item.icon} {item.name}
                  </Text>
                  <TouchableOpacity onPress={() => unarchiveHabit(item.id)} style={styles.iconBtn}>
                    <Ionicons name="arrow-undo-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteHabit(item)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {archivedTasks.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginTop: archivedHabits.length > 0 ? 20 : 0 }]}>
                {t('tasksTitle')}
              </Text>
              {archivedTasks.map((item) => {
                const cat = categoryFor(item);
                return (
                  <View key={item.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.colorDot, { backgroundColor: cat?.color || colors.textSecondary }]} />
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                      {cat?.icon} {item.title}
                    </Text>
                    <TouchableOpacity onPress={() => unarchiveTask(item.id)} style={styles.iconBtn}>
                      <Ionicons name="arrow-undo-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteTask(item)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  colorDot: { width: 8, height: 28, borderRadius: 4, marginRight: 12 },
  name: { flex: 1, fontSize: 15, fontWeight: '600' },
  iconBtn: { padding: 8, marginLeft: 4 },
});
