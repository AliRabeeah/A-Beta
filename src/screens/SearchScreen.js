import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import { useTasks } from '../context/TaskContext';
import { useNotes } from '../context/NoteContext';
import { usePlanning } from '../context/PlanningContext';
import { useChallenges } from '../context/ChallengeContext';
import { useFavorites } from '../context/FavoriteContext';
import { useWishlist } from '../context/WishlistContext';

const contains = (text, q) => (text || '').toLowerCase().includes(q);

export default function SearchScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const { habits } = useHabits();
  const { tasks } = useTasks();
  const { notes } = useNotes();
  const { planningItems } = usePlanning();
  const { challenges } = useChallenges();
  const { favorites } = useFavorites();
  const { items: wishlistItems } = useWishlist();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out = [];

    habits
      .filter((h) => !h.archived && contains(h.name, q))
      .forEach((h) =>
        out.push({
          id: `habit_${h.id}`,
          icon: 'list-outline',
          title: h.name,
          subtitle: t('habitsTitle'),
          onPress: () => navigation.navigate('HabitDetail', { habitId: h.id }),
        })
      );

    tasks
      .filter((tk) => !tk.archived && (contains(tk.title, q) || contains(tk.note, q)))
      .forEach((tk) =>
        out.push({
          id: `task_${tk.id}`,
          icon: 'clipboard-outline',
          title: tk.title,
          subtitle: t('tasksTitle'),
          onPress: () => navigation.navigate('TaskDetail', { taskId: tk.id }),
        })
      );

    notes
      .filter(
        (n) =>
          contains(n.title, q) ||
          contains(n.content, q) ||
          (n.checklistItems || []).some((it) => contains(it.text, q))
      )
      .forEach((n) =>
        out.push({
          id: `note_${n.id}`,
          icon: 'document-text-outline',
          title: n.title || t('untitledNote'),
          subtitle: t('notesTitle'),
          onPress: () => navigation.navigate('AddEditNote', { noteId: n.id }),
        })
      );

    planningItems
      .filter((p) => !p.archived && contains(p.title, q))
      .forEach((p) =>
        out.push({
          id: `plan_${p.id}`,
          icon: 'school-outline',
          title: p.title,
          subtitle: t('planningTitle'),
          onPress: () => navigation.navigate('AddEditPlanning', { planningId: p.id }),
        })
      );

    challenges
      .filter((c) => contains(c.name, q))
      .forEach((c) =>
        out.push({
          id: `challenge_${c.id}`,
          icon: 'trophy-outline',
          title: c.name,
          subtitle: t('challenges'),
          onPress: () => navigation.navigate('ChallengeDetail', { challengeId: c.id }),
        })
      );

    favorites
      .filter((f) => contains(f.title, q))
      .forEach((f) =>
        out.push({
          id: `favorite_${f.id}`,
          icon: 'star-outline',
          title: f.title,
          subtitle: t('favoritesTitle'),
          onPress: () => navigation.navigate('AddEditFavorite', { favoriteId: f.id }),
        })
      );

    wishlistItems
      .filter((w) => contains(w.title, q) || contains(w.description, q))
      .forEach((w) =>
        out.push({
          id: `wishlist_${w.id}`,
          icon: 'sparkles-outline',
          title: w.title,
          subtitle: t('wishlistTitle'),
          onPress: () => navigation.navigate('AddEditWishlist', { wishlistId: w.id }),
        })
      );

    return out;
  }, [query, habits, tasks, notes, planningItems, challenges, favorites, wishlistItems, t, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={[styles.headerRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {query.trim().length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('searchHint')}</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="file-tray-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('searchNoResults')}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={item.onPress}
              style={[styles.resultRow, isRTL && { flexDirection: 'row-reverse' }, { borderBottomColor: colors.border }]}
            >
              <View style={[styles.resultIcon, { backgroundColor: colors.surface }]}>
                <Ionicons name={item.icon} size={18} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={{ color: colors.text, fontSize: 15 }} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{item.subtitle}</Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  backBtn: { padding: 4 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  input: { flex: 1, fontSize: 15, height: '100%' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
