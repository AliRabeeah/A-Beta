import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useNotes } from '../context/NoteContext';

import NotesHeader from '../components/notes/NotesHeader';
import NotesSearchBar from '../components/notes/NotesSearchBar';
import NotesFilterBar from '../components/notes/NotesFilterBar';
import NoteMasonryCard from '../components/notes/NoteMasonryCard';
import ActionSheet from '../components/ActionSheet';
import { distributeMasonry } from '../utils/masonryLayout';

export default function NotesScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { notes, deleteNote, toggleNoteFavorite, toggleChecklistItem } = useNotes();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [moreVisible, setMoreVisible] = useState(false);
  const [sortBy, setSortBy] = useState('edited');
  const [cardActionsNote, setCardActionsNote] = useState(null);

  const handleAddNote = useCallback(() => {
    navigation.navigate('AddEditNote');
  }, [navigation]);

  const handleNotePress = useCallback(
    (note) => {
      navigation.navigate('AddEditNote', { noteId: note.id });
    },
    [navigation]
  );

  const handleDeleteNote = useCallback(
    (note) => {
      Alert.alert(
        t('deleteNoteTitle'),
        t('deleteNoteMessage', note.title || t('untitledNote')),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('delete'), style: 'destructive', onPress: () => deleteNote(note.id) },
        ]
      );
    },
    [deleteNote, t]
  );

  // Search (title + content) -> tag/pinned filter -> pinned-first sort.
  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = q
      ? notes.filter((n) => {
          const inTitle = (n.title || '').toLowerCase().includes(q);
          const inContent = (n.content || '').toLowerCase().includes(q);
          const inChecklist = (n.checklistItems || []).some((it) => (it.text || '').toLowerCase().includes(q));
          return inTitle || inContent || inChecklist;
        })
      : notes;

    if (activeFilter === 'pinned') {
      result = result.filter((n) => n.isFavorite);
    } else if (activeFilter !== 'all') {
      result = result.filter((n) => n.tag === activeFilter);
    }

    const orderNotes = (a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'created') return new Date(b.createdAt) - new Date(a.createdAt);
      return new Date(b.lastEdited) - new Date(a.lastEdited);
    };

    return [...result].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return orderNotes(a, b);
    });
  }, [notes, query, activeFilter, sortBy]);

  const columns = useMemo(() => distributeMasonry(filteredNotes, 2), [filteredNotes]);

  const moreActions = [
    {
      icon: sortBy === 'edited' ? 'checkmark-circle' : 'time-outline',
      label: t('sortByEdited') || 'Sort by last edited',
      onPress: () => setSortBy('edited'),
    },
    {
      icon: sortBy === 'created' ? 'checkmark-circle' : 'calendar-outline',
      label: t('sortByCreated') || 'Sort by date created',
      onPress: () => setSortBy('created'),
    },
    {
      icon: sortBy === 'title' ? 'checkmark-circle' : 'text-outline',
      label: t('sortByTitle') || 'Sort by title',
      onPress: () => setSortBy('title'),
    },
  ];

  const cardActions = cardActionsNote
    ? [
        {
          icon: cardActionsNote.isFavorite ? 'pin-outline' : 'pin',
          label: cardActionsNote.isFavorite ? t('unpinNote') : t('pinNote'),
          onPress: () => toggleNoteFavorite(cardActionsNote.id),
        },
        {
          icon: 'trash',
          label: t('delete'),
          destructive: true,
          onPress: () => handleDeleteNote(cardActionsNote),
        },
      ]
    : [];

  const isEmpty = filteredNotes.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <NotesHeader
        showBack={navigation.canGoBack ? navigation.canGoBack() : false}
        onBackPress={() => navigation.goBack()}
        noteCount={notes.length}
        onMorePress={() => setMoreVisible(true)}
      />

      <View style={styles.searchFilterGroup}>
        <NotesSearchBar
          value={query}
          onChangeText={setQuery}
          autoFocus={false}
          placeholder={t('notesSearchPlaceholder')}
        />

        <NotesFilterBar value={activeFilter} onChange={setActiveFilter} />
      </View>

      {isEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>{'\ud83d\uddd2\ufe0f'}</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {query || activeFilter !== 'all' ? t('notesNoResultsTitle') : t('notesEmptyTitle')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {query || activeFilter !== 'all' ? t('notesNoResultsSubtitle') : t('notesEmptySubtitle')}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.masonryRow}>
            <View style={styles.column}>
              {columns[0].map((note, index) => (
                <NoteMasonryCard
                  key={note.id}
                  note={note}
                  index={index}
                  onPress={() => handleNotePress(note)}
                  onLongPress={() => {
                    Haptics.selectionAsync();
                    setCardActionsNote(note);
                  }}
                  onTogglePin={() => toggleNoteFavorite(note.id)}
                  onToggleChecklistItem={(itemId) => toggleChecklistItem(note.id, itemId)}
                />
              ))}
            </View>
            <View style={styles.column}>
              {columns[1].map((note, index) => (
                <NoteMasonryCard
                  key={note.id}
                  note={note}
                  index={index}
                  onPress={() => handleNotePress(note)}
                  onLongPress={() => {
                    Haptics.selectionAsync();
                    setCardActionsNote(note);
                  }}
                  onTogglePin={() => toggleNoteFavorite(note.id)}
                  onToggleChecklistItem={(itemId) => toggleChecklistItem(note.id, itemId)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      <TouchableOpacity
        onPress={handleAddNote}
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 24 }]}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.onPrimary} />
      </TouchableOpacity>

      <ActionSheet
        visible={moreVisible}
        onClose={() => setMoreVisible(false)}
        title={t('notesOptionsTitle') || 'Notes Options'}
        actions={moreActions}
      />

      <ActionSheet
        visible={!!cardActionsNote}
        onClose={() => setCardActionsNote(null)}
        title={cardActionsNote?.title || t('untitledNote')}
        actions={cardActions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchFilterGroup: {
    flexShrink: 0,
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  masonryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: -60,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
});
