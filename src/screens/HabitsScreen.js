import React, { useState } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import HabitCard from '../components/HabitCard';
import AddOptionsSheet from '../components/AddOptionsSheet';

export default function HabitsScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { habits, categories, setCompletionStatus, addToValue, logTimerSeconds, setChecklistItem, archiveHabit, deleteHabit } = useHabits();

  const handleDelete = (habit) => {
    Alert.alert(t('deleteConfirmTitle'), t('deleteConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteHabit(habit.id) },
    ]);
  };

  const handleIncrement = (habit, step) => {
    if (habit.evaluationType === 'timer') logTimerSeconds(habit.id, step);
    else addToValue(habit.id, step);
  };
  const insets = useSafeAreaInsets();
  const [addMenuVisible, setAddMenuVisible] = useState(false);

  const activeHabits = habits.filter((h) => !h.archived);
  const archivedCount = habits.length - activeHabits.length;

  const sections = categories
    .map((cat) => ({ title: t(cat.labelKey), data: activeHabits.filter((h) => h.categoryId === cat.id) }))
    .filter((s) => s.data.length > 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>{t('habitsTitle')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('Archive')} style={styles.archiveBtn}>
            <Ionicons name="archive-outline" size={20} color={colors.textSecondary} />
            {archivedCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.badgeText, { color: colors.onPrimary }]}>{archivedCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAddMenuVisible(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={24} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {sections.length === 0 ? (
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 60 }}>{t('noHabitsYet')}</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{section.title}</Text>
          )}
          renderItem={({ item, index }) => (
            <HabitCard
              habit={item}
              index={index}
              onDone={() => setCompletionStatus(item.id, 'done')}
              onSkip={() => setCompletionStatus(item.id, 'skipped')}
              onIncrement={(step) => handleIncrement(item, step)}
              onArchive={() => archiveHabit(item.id)}
              onDelete={() => handleDelete(item)}
              onToggleChecklistItem={(itemId, checked) => setChecklistItem(item.id, itemId, checked)}
              onPress={() => navigation.navigate('HabitDetail', { habitId: item.id })}
            />
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  archiveBtn: { position: 'relative' },
  badge: { position: 'absolute', top: -6, right: -8, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
});
