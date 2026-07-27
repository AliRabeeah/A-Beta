import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleNoteReminder, cancelNoteReminder } from '../utils/notifications';

const STORAGE_KEY = 'a_notes_v1';

const NoteContext = createContext(null);

export function NoteProvider({ children }) {
  const [notes, setNotes] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const notesData = await AsyncStorage.getItem(STORAGE_KEY);
        if (notesData) setNotes(JSON.parse(notesData));
      } catch (error) {
        console.error('Error loading notes:', error);
      }
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback(async (nextNotes) => {
    setNotes(nextNotes);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextNotes));
  }, []);

  /** Creates a new note. */
  const addNote = useCallback(
    async (noteData) => {
      let reminderId = null;
      if (noteData.reminderAt) {
        reminderId = await scheduleNoteReminder(noteData);
      }

      const newNote = {
        id: Date.now().toString(),
        isFavorite: false,
        checklistItems: [],
        emoji: null,
        color: null,
        tag: null,
        reminderAt: null,
        reminderId,
        createdAt: new Date().toISOString(),
        lastEdited: new Date().toISOString(),
        ...noteData,
      };

      await persist([...notes, newNote]);
      return newNote;
    },
    [notes, persist]
  );

  /** Updates an existing note. */
  const updateNote = useCallback(
    async (id, updates) => {
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;

      let reminderId = existing.reminderId;
      if (updates.reminderAt !== undefined && updates.reminderAt !== existing.reminderAt) {
        if (existing.reminderId) await cancelNoteReminder(existing.reminderId);
        reminderId = updates.reminderAt ? await scheduleNoteReminder({ ...existing, ...updates }) : null;
      }

      const next = notes.map((n) => (n.id === id ? { ...n, ...updates, reminderId, lastEdited: new Date().toISOString() } : n));
      await persist(next);
    },
    [notes, persist]
  );

  /** Deletes a note. */
  const deleteNote = useCallback(
    async (id) => {
      const existing = notes.find((n) => n.id === id);
      if (existing?.reminderId) await cancelNoteReminder(existing.reminderId);
      await persist(notes.filter((n) => n.id !== id));
    },
    [notes, persist]
  );

  /**
   * Replaces all local notes with an imported/restored set, mirroring
   * replaceAllHabits/replaceAllTasks: cancels reminders tied to the current
   * set first, then reschedules any reminders included in the imported data.
   */
  const replaceAllNotes = useCallback(async (importedNotes) => {
    for (const n of notes) {
      if (n.reminderId) await cancelNoteReminder(n.reminderId);
    }
    const rehydrated = [];
    for (const n of importedNotes) {
      let reminderId = null;
      if (n.reminderAt) reminderId = await scheduleNoteReminder(n);
      rehydrated.push({ ...n, reminderId });
    }
    await persist(rehydrated);
  }, [notes, persist]);

  /** Toggles the pinned/favorite status of a note. */
  const toggleNoteFavorite = useCallback(
    async (id) => {
      const next = notes.map((n) => (n.id === id ? { ...n, isFavorite: !n.isFavorite } : n));
      await persist(next);
    },
    [notes, persist]
  );

  /** Toggles a checklist item within a note. */
  const toggleChecklistItem = useCallback(
    async (noteId, itemId) => {
      const next = notes.map((n) => {
        if (n.id !== noteId) return n;
        const updatedItems = (n.checklistItems || []).map((item) =>
          item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
        );
        return { ...n, checklistItems: updatedItems, lastEdited: new Date().toISOString() };
      });
      await persist(next);
    },
    [notes, persist]
  );

  /** Adds a checklist item to a note, within a given list (groupId). */
  const addChecklistItem = useCallback(
    async (noteId, itemText, groupId = 'main') => {
      const next = notes.map((n) => {
        if (n.id !== noteId) return n;
        const newItem = { id: Date.now().toString(), text: itemText, isChecked: false, groupId };
        return { ...n, checklistItems: [...(n.checklistItems || []), newItem], lastEdited: new Date().toISOString() };
      });
      await persist(next);
    },
    [notes, persist]
  );

  /** Edits the text of an existing checklist item. */
  const updateChecklistItemText = useCallback(
    async (noteId, itemId, text) => {
      const next = notes.map((n) => {
        if (n.id !== noteId) return n;
        const updatedItems = (n.checklistItems || []).map((item) => (item.id === itemId ? { ...item, text } : item));
        return { ...n, checklistItems: updatedItems, lastEdited: new Date().toISOString() };
      });
      await persist(next);
    },
    [notes, persist]
  );

  /** Removes a checklist item from a note. */
  const removeChecklistItem = useCallback(
    async (noteId, itemId) => {
      const next = notes.map((n) => {
        if (n.id !== noteId) return n;
        return { ...n, checklistItems: (n.checklistItems || []).filter((item) => item.id !== itemId), lastEdited: new Date().toISOString() };
      });
      await persist(next);
    },
    [notes, persist]
  );

  return (
    <NoteContext.Provider
      value={{
        notes,
        loaded,
        addNote,
        updateNote,
        deleteNote,
        replaceAllNotes,
        toggleNoteFavorite,
        toggleChecklistItem,
        addChecklistItem,
        updateChecklistItemText,
        removeChecklistItem,
      }}
    >
      {children}
    </NoteContext.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(NoteContext);
  if (!ctx) throw new Error('useNotes must be used within NoteProvider');
  return ctx;
}
